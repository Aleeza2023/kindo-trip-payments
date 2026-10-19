"""Business rules: who can register, and when a payment is allowed."""
import logging
import threading
from dataclasses import dataclass
from typing import Literal

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models import Registration, Student, Transaction, Trip
from app.payment_gateway import GatewayError, GatewayResult, PaymentGateway
from app.schemas import PaymentRequest, RegistrationCreate

# Log lines use only IDs, amounts and messages: never the card number or CVV.
logger = logging.getLogger(__name__)


class TripNotFound(Exception):
    """No trip with this ID."""


StudentProblem = Literal["unknown_id", "other_school", "name_mismatch"]


class StudentNotFound(Exception):
    """The student can't be registered for this trip. `reason` says why, so the parent
    gets a specific message: unknown ID, another school, or a name that doesn't match."""

    def __init__(self, reason: StudentProblem) -> None:
        super().__init__(reason)
        self.reason = reason


class RegistrationNotFound(Exception):
    """No registration with this ID."""


class AlreadyPaid(Exception):
    """This child is already paid for on this trip."""


@dataclass(frozen=True)
class RegistrationResult:
    registration: Registration
    student_name: str  # from the school's record
    created: bool  # False: the child was already registered and hasn't paid yet


# One lock per registration, so a double-clicked Pay is handled one request at a time.
# This only works inside one server process. Production would lock in the database.
_locks_guard = threading.Lock()
_registration_locks: dict[str, threading.Lock] = {}


def _lock_for(registration_id: str) -> threading.Lock:
    with _locks_guard:
        return _registration_locks.setdefault(registration_id, threading.Lock())


def _find_registration(session: Session, trip_id: str, student_id: str) -> Registration | None:
    statement = select(Registration).where(
        Registration.trip_id == trip_id, Registration.student_id == student_id
    )
    return session.exec(statement).first()


def _already_registered(registration: Registration, student: Student) -> RegistrationResult:
    """Pending: hand back the registration so the parent can pay. Paid: refuse."""
    if registration.status == "paid":
        raise AlreadyPaid()
    return RegistrationResult(
        registration=registration, student_name=student.full_name, created=False
    )


def register_child(session: Session, trip_id: str, data: RegistrationCreate) -> RegistrationResult:
    trip = session.get(Trip, trip_id)
    if trip is None:
        raise TripNotFound()

    student = session.get(Student, data.student_id)
    if student is None:
        raise StudentNotFound("unknown_id")
    if student.school_id != trip.school_id:
        raise StudentNotFound("other_school")
    if student.full_name.casefold() != data.student_name.casefold():
        raise StudentNotFound("name_mismatch")

    existing = _find_registration(session, trip.id, student.id)
    if existing is not None:
        return _already_registered(existing, student)

    registration = Registration(
        trip_id=trip.id, student_id=student.id, parent_name=data.parent_name
    )
    session.add(registration)
    try:
        session.commit()
    except IntegrityError:
        # Another request registered the same child a moment ago.
        # The unique constraint stopped ours, so return theirs.
        session.rollback()
        existing = _find_registration(session, trip.id, student.id)
        if existing is None:
            raise
        return _already_registered(existing, student)
    session.refresh(registration)
    return RegistrationResult(
        registration=registration, student_name=student.full_name, created=True
    )


def pay(
    session: Session, gateway: PaymentGateway, registration_id: str, payment: PaymentRequest
) -> Transaction:
    """Charge for a registration once. Every attempt is saved, whatever the outcome."""
    # Check it exists before locking, so made-up IDs in the URL don't add locks to memory.
    if session.get(Registration, registration_id) is None:
        raise RegistrationNotFound()

    with _lock_for(registration_id):
        # Read again inside the lock: another click may have paid while we waited.
        # populate_existing: read the status from the database, not from this session's cache.
        registration = session.get(Registration, registration_id, populate_existing=True)
        if registration is None:
            raise RegistrationNotFound()
        if registration.status == "paid":
            logger.warning("Refused payment for registration %s: already paid", registration.id)
            raise AlreadyPaid()  # before the gateway, so a paid child is never charged again

        trip = session.get(Trip, registration.trip_id)
        student = session.get(Student, registration.student_id)
        if trip is None or student is None:  # can't happen: foreign keys guarantee both exist
            raise RegistrationNotFound()

        crashed = False
        try:
            result = gateway.charge(
                amount_cents=trip.cost_cents,  # the price comes from the trip, never the browser
                card_number=payment.card_number,
                expiry_date=payment.expiry_date,
                cvv=payment.cvv,
                student_name=student.full_name,  # the school's record, not what the parent typed
                parent_name=registration.parent_name,
                school_id=trip.school_id,
                trip_id=trip.id,
            )
        except GatewayError:
            # Treat a crash as a failed attempt, so it is saved like any other.
            crashed = True
            result = GatewayResult(
                success=False,
                legacy_transaction_id=None,
                error_message="The payment processor failed.",
            )

        transaction = Transaction(
            registration_id=registration.id,
            amount_cents=trip.cost_cents,
            status="success" if result.success else "failed",
            legacy_transaction_id=result.legacy_transaction_id,
            error_message=result.error_message,
            card_last4=payment.card_number[-4:],
        )
        session.add(transaction)
        if result.success:
            registration.status = "paid"  # same commit as the transaction, so they can't disagree
        session.commit()

        if result.success:
            logger.info(
                "Payment succeeded for registration %s: %s (%d cents)",
                registration.id,
                result.legacy_transaction_id,
                trip.cost_cents,
            )
        else:
            logger.warning(
                "Payment failed for registration %s: %s", registration.id, result.error_message
            )

        if crashed:
            raise GatewayError("The legacy payment processor failed.")
        session.refresh(transaction)
        return transaction
