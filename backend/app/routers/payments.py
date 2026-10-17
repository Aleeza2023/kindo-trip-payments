"""Payment endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.db import get_session
from app.payment_gateway import GatewayError, PaymentGateway, get_gateway
from app.schemas import PaymentOut, PaymentRequest
from app.services.payment_service import AlreadyPaid, RegistrationNotFound, pay

router = APIRouter(prefix="/api", tags=["payments"])

PAID_MESSAGE = "Payment successful."
DECLINED_MESSAGE = (
    "Your payment was declined. You have not been charged. "
    "Please check your card details or try again."
)
UNAVAILABLE_MESSAGE = "The payment service is unavailable. You have not been charged."


# Plain def, not async def: the legacy code sleeps for 1.5 seconds, and FastAPI runs
# def endpoints in a thread pool so other requests aren't blocked meanwhile.
@router.post("/registrations/{registration_id}/payments", response_model=PaymentOut)
def create_payment(
    registration_id: str,
    payment: PaymentRequest,
    session: Session = Depends(get_session),
    gateway: PaymentGateway = Depends(get_gateway),
) -> PaymentOut:
    try:
        transaction = pay(session, gateway, registration_id, payment)
    except RegistrationNotFound:
        raise HTTPException(status_code=404, detail="Registration not found.")
    except AlreadyPaid:
        raise HTTPException(status_code=409, detail="This child is already paid for this trip.")
    except GatewayError:
        raise HTTPException(status_code=502, detail=UNAVAILABLE_MESSAGE)

    success = transaction.status == "success"
    return PaymentOut(
        transaction_id=transaction.id,
        payment_reference=transaction.legacy_transaction_id,
        status=transaction.status,
        registration_status="paid" if success else "pending",
        amount_cents=transaction.amount_cents,
        card_last4=transaction.card_last4,
        message=PAID_MESSAGE if success else DECLINED_MESSAGE,
    )
