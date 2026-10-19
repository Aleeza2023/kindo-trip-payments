"""Adapter for Kindo's legacy payment API. This is the only file that imports legacy_payment."""
import logging
from dataclasses import dataclass
from typing import Protocol

from app.legacy_payment import LegacyPaymentProcessor

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GatewayResult:
    """Our own result type, so nothing outside this file depends on the legacy PaymentResponse."""

    success: bool
    legacy_transaction_id: str | None
    error_message: str | None


class GatewayError(Exception):
    """The legacy code crashed. It can only crash in its input checks, before any charge,
    so the endpoint can safely tell the parent 'You have not been charged.'"""


class PaymentGateway(Protocol):
    """What the service needs. Tests pass a fake that matches this shape."""

    def charge(
        self,
        *,
        amount_cents: int,
        card_number: str,
        expiry_date: str,
        cvv: str,
        student_name: str,
        parent_name: str,
        school_id: str,
        trip_id: str,
    ) -> GatewayResult: ...


class LegacyPaymentGateway:
    def __init__(self, processor: LegacyPaymentProcessor | None = None) -> None:
        self._processor = processor or LegacyPaymentProcessor()

    # Keyword-only (*) so card_number and cvv can't be swapped by position.
    def charge(
        self,
        *,
        amount_cents: int,
        card_number: str,
        expiry_date: str,
        cvv: str,
        student_name: str,
        parent_name: str,
        school_id: str,
        trip_id: str,
    ) -> GatewayResult:
        payment_data = {
            "student_name": student_name,
            "parent_name": parent_name,
            # The only float in the app: the legacy API wants dollars.
            "amount": amount_cents / 100,
            "card_number": card_number,
            "expiry_date": expiry_date,
            "cvv": cvv,
            "school_id": school_id,
            "activity_id": trip_id,
        }
        try:
            response = self._processor.process_payment(payment_data)
        except Exception as exc:
            # Log and report only the error type: the legacy code's text could contain card data.
            logger.error("Legacy payment processor crashed: %s", type(exc).__name__)
            raise GatewayError("The legacy payment processor failed.") from exc
        return GatewayResult(
            success=response.success,
            legacy_transaction_id=response.transaction_id,
            error_message=response.error_message,
        )


def get_gateway() -> PaymentGateway:
    """FastAPI dependency. Tests override this with a fake gateway."""
    return LegacyPaymentGateway()
