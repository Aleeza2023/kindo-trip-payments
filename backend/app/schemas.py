"""API request and response shapes."""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, computed_field


class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    date: date
    location: str
    cost_cents: int

    @computed_field
    @property
    def cost(self) -> str:
        """Dollars for parents, e.g. 2500 -> "25.00". Decimal is exact, no float rounding."""
        return f"{Decimal(self.cost_cents) / 100:.2f}"
