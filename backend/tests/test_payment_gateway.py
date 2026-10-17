"""The gateway, run against the real legacy code with its sleep and randomness patched."""
from typing import Any

import pytest

from app import legacy_payment
from app.legacy_payment import PaymentResponse
from app.payment_gateway import GatewayError, LegacyPaymentGateway

CARD = "4111111111111111"


def charge_args(**overrides: Any) -> dict[str, Any]:
    return {
        "amount_cents": 2500,
        "card_number": CARD,
        "expiry_date": "12/30",
        "cvv": "123",
        "student_name": "Mia Smith",
        "parent_name": "Jane Smith",
        "school_id": "SCH-001",
        "trip_id": "TRIP-ZOO-2026",
    } | overrides


@pytest.fixture
def sleeps(monkeypatch: pytest.MonkeyPatch) -> list[float]:
    """Skip the legacy 1.5 second sleep, but record that it was asked for."""
    calls: list[float] = []
    monkeypatch.setattr(legacy_payment.time, "sleep", calls.append)
    return calls


def force_random(monkeypatch: pytest.MonkeyPatch, value: float) -> None:
    """The legacy code declines when random.random() < 0.1."""
    monkeypatch.setattr(legacy_payment.random, "random", lambda: value)
    monkeypatch.setattr(legacy_payment.random, "randint", lambda a, b: 4821)


class RecordingProcessor:
    """Stands in for the legacy processor and remembers what it was sent."""

    def __init__(self) -> None:
        self.sent: dict[str, Any] = {}

    def process_payment(self, payment_data: dict[str, Any]) -> PaymentResponse:
        self.sent = payment_data
        return PaymentResponse(success=True, transaction_id="TX-1-1000")


class CrashingProcessor:
    def process_payment(self, payment_data: dict[str, Any]) -> PaymentResponse:
        raise RuntimeError(f"boom with {payment_data['card_number']}")


def test_success(monkeypatch: pytest.MonkeyPatch, sleeps: list[float]) -> None:
    force_random(monkeypatch, 0.5)
    result = LegacyPaymentGateway().charge(**charge_args())
    assert result.success is True
    assert result.legacy_transaction_id is not None
    assert result.legacy_transaction_id.startswith("TX-")
    assert result.legacy_transaction_id.endswith("-4821")
    assert result.error_message is None
    assert sleeps == [1.5]


def test_decline(monkeypatch: pytest.MonkeyPatch, sleeps: list[float]) -> None:
    force_random(monkeypatch, 0.05)
    result = LegacyPaymentGateway().charge(**charge_args())
    assert result.success is False
    assert result.legacy_transaction_id is None
    assert result.error_message == "Payment declined by processor. Please try again."


def test_crash_becomes_gateway_error() -> None:
    gateway = LegacyPaymentGateway(processor=CrashingProcessor())  # type: ignore[arg-type]
    with pytest.raises(GatewayError) as caught:
        gateway.charge(**charge_args())
    # Our error message must not repeat the legacy text, which here contains the card number.
    assert CARD not in str(caught.value)


def test_cents_sent_as_float_dollars() -> None:
    # 1999 rather than a round number, to show the cents survive (2500 is checked below).
    processor = RecordingProcessor()
    gateway = LegacyPaymentGateway(processor=processor)  # type: ignore[arg-type]
    gateway.charge(**charge_args(amount_cents=1999))
    assert isinstance(processor.sent["amount"], float)
    assert processor.sent["amount"] == 19.99


def test_fields_mapped_to_legacy_names() -> None:
    processor = RecordingProcessor()
    gateway = LegacyPaymentGateway(processor=processor)  # type: ignore[arg-type]
    gateway.charge(**charge_args())
    assert processor.sent == {
        "student_name": "Mia Smith",
        "parent_name": "Jane Smith",
        "amount": 25.0,
        "card_number": CARD,
        "expiry_date": "12/30",
        "cvv": "123",
        "school_id": "SCH-001",
        "activity_id": "TRIP-ZOO-2026",
    }
