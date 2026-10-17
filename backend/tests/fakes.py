"""A fake gateway shared by the service and API tests. No real legacy call happens."""
import time
from typing import Any

from app.payment_gateway import GatewayError, GatewayResult

APPROVED = GatewayResult(success=True, legacy_transaction_id="TX-1-1000", error_message=None)
DECLINED = GatewayResult(
    success=False,
    legacy_transaction_id=None,
    error_message="Payment declined by processor. Please try again.",
)


class FakeGateway:
    """Returns the results it is given, in order, and records every call."""

    def __init__(self, *results: GatewayResult, crash: bool = False, delay: float = 0) -> None:
        self.results = list(results) or [APPROVED]
        self.crash = crash
        self.delay = delay
        self.calls: list[dict[str, Any]] = []

    def charge(self, **kwargs: Any) -> GatewayResult:
        self.calls.append(kwargs)
        time.sleep(self.delay)
        if self.crash:
            raise GatewayError("The legacy payment processor failed.")
        return self.results.pop(0)
