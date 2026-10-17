"""API request and response shapes."""
import re
from datetime import date
from decimal import Decimal
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StrictStr, computed_field

from app.models import RegistrationStatus, TransactionStatus

MAX_NAME_LENGTH = 100

# [0-9] rather than \d or isdigit(), which also accept characters like "²" or "٣".
CARD_NUMBER_PATTERN = re.compile(r"[0-9]{16}")
EXPIRY_PATTERN = re.compile(r"([0-9]{2})/([0-9]{2})")
CVV_PATTERN = re.compile(r"[0-9]{3}")


def _clean_name(value: str) -> str:
    """Trim the ends and collapse repeated whitespace: "  Mia   Smith " -> "Mia Smith"."""
    cleaned = " ".join(value.split())
    if not cleaned:
        raise ValueError("Name is required.")
    if len(cleaned) > MAX_NAME_LENGTH:
        raise ValueError(f"Name must be {MAX_NAME_LENGTH} characters or fewer.")
    return cleaned


def _clean_student_id(value: str) -> str:
    cleaned = value.strip().upper()
    if not cleaned:
        raise ValueError("Student ID is required.")
    return cleaned


def _clean_card_number(value: str) -> str:
    cleaned = value.replace(" ", "")
    if not CARD_NUMBER_PATTERN.fullmatch(cleaned):
        raise ValueError("Card number must be 16 digits.")
    return cleaned


def _check_expiry(value: str) -> str:
    """MM/YY, month 01-12, and not expired. A card works until the end of its expiry month."""
    match = EXPIRY_PATTERN.fullmatch(value)
    if match is None:
        raise ValueError("Expiry date must be in MM/YY format.")
    month = int(match.group(1))
    year = 2000 + int(match.group(2))
    if not 1 <= month <= 12:
        raise ValueError("Expiry month must be between 01 and 12.")
    today = date.today()
    if (year, month) < (today.year, today.month):
        raise ValueError("This card has expired.")
    return value


def _check_cvv(value: str) -> str:
    if not CVV_PATTERN.fullmatch(value):
        raise ValueError("CVV must be 3 digits.")
    return value


# StrictStr rejects numbers, e.g. a JSON card_number of 4111111111111111 instead of "4111...".
Name = Annotated[StrictStr, AfterValidator(_clean_name)]
StudentId = Annotated[StrictStr, AfterValidator(_clean_student_id)]
CardNumber = Annotated[StrictStr, AfterValidator(_clean_card_number)]
ExpiryDate = Annotated[StrictStr, AfterValidator(_check_expiry)]
Cvv = Annotated[StrictStr, AfterValidator(_check_cvv)]


def format_dollars(cents: int) -> str:
    """2500 -> "25.00". Decimal is exact, no float rounding."""
    return f"{Decimal(cents) / 100:.2f}"


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
        return format_dollars(self.cost_cents)


class RegistrationCreate(BaseModel):
    student_id: StudentId
    # Not stored. The service compares it with the school's record to catch a mistyped ID.
    student_name: Name
    parent_name: Name


class PaymentRequest(BaseModel):
    # No amount field: the price comes from the trip. Sending one is an error, not ignored.
    model_config = ConfigDict(extra="forbid")

    # repr=False keeps the card number and CVV out of printed or logged models.
    card_number: CardNumber = Field(repr=False)
    expiry_date: ExpiryDate
    cvv: Cvv = Field(repr=False)


class RegistrationOut(BaseModel):
    """No parent_name: if another parent registers the same child, they must not see it."""

    id: str
    trip_id: str
    student_id: str
    student_name: str  # from the school's record
    status: RegistrationStatus
    already_registered: bool  # True: registered before and not paid yet, so continue to payment


class PaymentOut(BaseModel):
    """The result of one payment attempt. A decline is a normal result, not an HTTP error."""

    transaction_id: str  # our own ID for this attempt
    # The payment processor's TX-... number, the one shown to parents. Only set on success.
    payment_reference: str | None
    status: TransactionStatus
    registration_status: RegistrationStatus
    amount_cents: int
    card_last4: str
    message: str

    @computed_field
    @property
    def amount(self) -> str:
        return format_dollars(self.amount_cents)
