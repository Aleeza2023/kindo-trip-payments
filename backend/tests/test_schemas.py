"""Validation rules for request schemas."""
from datetime import date
from typing import Any

import pytest
from pydantic import ValidationError

from app.schemas import PaymentRequest, RegistrationCreate


def months_from_now(months: int) -> str:
    """MM/YY for a month relative to today, so the tests never go out of date."""
    today = date.today()
    index = today.year * 12 + (today.month - 1) + months
    year, month = divmod(index, 12)
    return f"{month + 1:02d}/{year % 100:02d}"


def registration(**overrides: Any) -> dict[str, Any]:
    return {
        "student_id": "STU-1001",
        "student_name": "Mia Smith",
        "parent_name": "Jane Smith",
    } | overrides


def payment(**overrides: Any) -> dict[str, Any]:
    return {
        "card_number": "4111111111111111",
        "expiry_date": months_from_now(12),
        "cvv": "123",
    } | overrides


# --- RegistrationCreate ---


def test_valid_registration() -> None:
    reg = RegistrationCreate(**registration())
    assert reg.student_id == "STU-1001"
    assert reg.student_name == "Mia Smith"
    assert reg.parent_name == "Jane Smith"


def test_names_are_trimmed_and_spaces_collapsed() -> None:
    messy = registration(student_name="  Mia   Smith ", parent_name="Jane \t Smith")
    reg = RegistrationCreate(**messy)
    assert reg.student_name == "Mia Smith"
    assert reg.parent_name == "Jane Smith"


@pytest.mark.parametrize("field", ["student_name", "parent_name"])
def test_blank_names_rejected(field: str) -> None:
    with pytest.raises(ValidationError):
        RegistrationCreate(**registration(**{field: "   "}))


def test_names_over_100_characters_rejected() -> None:
    # Both names use the same Name rule, so one field is enough.
    RegistrationCreate(**registration(parent_name="a" * 100))  # exactly 100 is fine
    with pytest.raises(ValidationError):
        RegistrationCreate(**registration(parent_name="a" * 101))


def test_student_id_is_trimmed_and_upper_cased() -> None:
    assert RegistrationCreate(**registration(student_id="  stu-1001 ")).student_id == "STU-1001"


# --- PaymentRequest ---


def test_valid_payment() -> None:
    pay = PaymentRequest(**payment())
    assert pay.card_number == "4111111111111111"
    assert pay.cvv == "123"


def test_card_number_spaces_removed() -> None:
    pay = PaymentRequest(**payment(card_number="4111 1111 1111 1111"))
    assert pay.card_number == "4111111111111111"


@pytest.mark.parametrize(
    "card_number",
    [
        "411111111111111",  # 15 digits
        "41111111111111111",  # 17 digits
        "4111-1111-1111-1111",  # dashes
        "4111abcd11111111",  # letters
    ],
)
def test_card_number_must_be_16_digits(card_number: str) -> None:
    with pytest.raises(ValidationError):
        PaymentRequest(**payment(card_number=card_number))


@pytest.mark.parametrize("expiry_date", ["13/30", "00/30", "1/30", "aa/bb"])
def test_expiry_must_be_mm_yy_with_valid_month(expiry_date: str) -> None:
    with pytest.raises(ValidationError):
        PaymentRequest(**payment(expiry_date=expiry_date))


def test_expiry_last_month_rejected() -> None:
    with pytest.raises(ValidationError, match="expired"):
        PaymentRequest(**payment(expiry_date=months_from_now(-1)))


def test_expiry_this_month_still_valid() -> None:
    PaymentRequest(**payment(expiry_date=months_from_now(0)))


@pytest.mark.parametrize("cvv", ["12", "1234", "abc"])
def test_cvv_must_be_3_digits(cvv: str) -> None:
    with pytest.raises(ValidationError):
        PaymentRequest(**payment(cvv=cvv))


def test_cvv_keeps_leading_zero() -> None:
    assert PaymentRequest(**payment(cvv="012")).cvv == "012"


@pytest.mark.parametrize(
    "field, value",
    [("card_number", 4111111111111111), ("expiry_date", 1230), ("cvv", 123)],
)
def test_card_fields_must_be_strings(field: str, value: int) -> None:
    with pytest.raises(ValidationError):
        PaymentRequest(**payment(**{field: value}))
