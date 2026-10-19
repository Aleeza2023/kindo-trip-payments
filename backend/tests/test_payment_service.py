"""Business rules, tested with a fake gateway so no real legacy call happens."""
import re
import threading

import pytest
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel, select

from app.models import Registration, Transaction
from app.payment_gateway import GatewayError
from app.schemas import PaymentRequest, RegistrationCreate
from app.services import payment_service
from app.services.payment_service import (
    AlreadyPaid,
    RegistrationNotFound,
    StudentNotFound,
    pay,
    register_child,
)
from tests.fakes import APPROVED, DECLINED, FakeGateway

TRIP = "TRIP-ZOO-2026"
CARD = "4242424242424242"
CVV = "987"


def child(student_id: str = "STU-1001", student_name: str = "Mia Smith") -> RegistrationCreate:
    return RegistrationCreate(
        student_id=student_id, student_name=student_name, parent_name="Jane Smith"
    )


def card() -> PaymentRequest:
    return PaymentRequest(card_number=CARD, expiry_date="12/99", cvv=CVV)


def registered(session: Session) -> Registration:
    """Mia Smith, registered and not paid yet."""
    return register_child(session, TRIP, child()).registration


def status_of(session: Session, registration_id: str) -> str:
    registration = session.get(Registration, registration_id, populate_existing=True)
    assert registration is not None
    return registration.status


# --- register_child ---


def test_register_creates_pending_registration(session: Session) -> None:
    result = register_child(session, TRIP, child())
    assert result.created is True
    assert result.registration.status == "pending"
    assert result.registration.student_id == "STU-1001"
    assert result.student_name == "Mia Smith"


@pytest.mark.parametrize(
    "student_id, student_name, reason",
    [
        ("STU-9999", "Mia Smith", "unknown_id"),
        ("STU-2001", "Ava Brown", "other_school"),  # real student, but at another school
        ("STU-1001", "Sam Lee", "name_mismatch"),  # real student, but not this name
    ],
)
def test_register_rejects_wrong_student(
    session: Session, student_id: str, student_name: str, reason: str
) -> None:
    with pytest.raises(StudentNotFound) as caught:
        register_child(session, TRIP, child(student_id, student_name))
    assert caught.value.reason == reason


def test_two_children_with_the_same_name_are_separate(session: Session) -> None:
    first = register_child(session, TRIP, child("STU-1002", "Sam Lee"))
    second = register_child(session, TRIP, child("STU-1003", "Sam Lee"))
    assert first.created and second.created
    assert first.registration.id != second.registration.id


# --- pay ---


def test_pay_success(session: Session) -> None:
    registration = registered(session)
    gateway = FakeGateway()
    transaction = pay(session, gateway, registration.id, card())

    assert transaction.status == "success"
    assert transaction.legacy_transaction_id == "TX-1-1000"
    assert transaction.card_last4 == "4242"
    assert transaction.amount_cents == 2500
    assert status_of(session, registration.id) == "paid"


def test_price_and_name_come_from_the_database(session: Session) -> None:
    registration = register_child(session, TRIP, child(student_name="mia smith")).registration
    gateway = FakeGateway()
    pay(session, gateway, registration.id, card())
    assert gateway.calls[0]["amount_cents"] == 2500
    assert gateway.calls[0]["student_name"] == "Mia Smith"  # the school's record, not "mia smith"


def test_decline_is_recorded_and_retry_works(session: Session) -> None:
    registration = registered(session)
    gateway = FakeGateway(DECLINED, APPROVED)

    declined = pay(session, gateway, registration.id, card())
    assert declined.status == "failed"
    assert declined.error_message == DECLINED.error_message
    assert status_of(session, registration.id) == "pending"  # so the parent can try again

    pay(session, gateway, registration.id, card())
    statuses = [t.status for t in session.exec(select(Transaction)).all()]
    assert sorted(statuses) == ["failed", "success"]  # both attempts are kept
    assert status_of(session, registration.id) == "paid"


def test_payments_are_logged_without_card_data(
    session: Session, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level("INFO")
    registration = registered(session)
    gateway = FakeGateway(DECLINED, APPROVED)
    pay(session, gateway, registration.id, card())  # declined
    pay(session, gateway, registration.id, card())  # retry succeeds

    assert "Payment failed" in caplog.text
    assert "Payment succeeded" in caplog.text
    # The card number and CVV must never reach the logs. The CVV is matched as a separate
    # number, because the random registration ID in each line could contain "987" by chance.
    assert CARD not in caplog.text
    assert not re.search(rf"\b{CVV}\b", caplog.text)


def test_crash_is_recorded_then_raised(session: Session) -> None:
    registration = registered(session)
    with pytest.raises(GatewayError):
        pay(session, FakeGateway(crash=True), registration.id, card())
    transaction = session.exec(select(Transaction)).one()
    assert transaction.status == "failed"
    assert status_of(session, registration.id) == "pending"


def test_unknown_registration_is_never_charged_and_adds_no_lock(session: Session) -> None:
    gateway = FakeGateway()
    with pytest.raises(RegistrationNotFound):
        pay(session, gateway, "made-up-id", card())
    assert gateway.calls == []
    assert "made-up-id" not in payment_service._registration_locks


def test_full_card_number_and_cvv_never_stored(session: Session) -> None:
    registration = registered(session)
    pay(session, FakeGateway(DECLINED), registration.id, card())
    pay(session, FakeGateway(APPROVED), registration.id, card())

    for table in SQLModel.metadata.sorted_tables:
        for row in session.connection().execute(table.select()):
            values = [str(value) for value in row]
            assert not any(CARD in value for value in values), table.name
            assert CVV not in values, table.name


def test_double_click_charges_only_once(file_engine: Engine) -> None:
    with Session(file_engine) as session:
        registration_id = registered(session).id

    # The delay keeps the first charge "in progress" while the second click arrives.
    gateway = FakeGateway(APPROVED, APPROVED, delay=0.2)
    start = threading.Barrier(2)
    outcomes: list[str] = []

    def click() -> None:
        start.wait()
        with Session(file_engine) as session:
            try:
                pay(session, gateway, registration_id, card())
                outcomes.append("charged")
            except AlreadyPaid:
                outcomes.append("already paid")

    threads = [threading.Thread(target=click) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert len(gateway.calls) == 1
    assert sorted(outcomes) == ["already paid", "charged"]
