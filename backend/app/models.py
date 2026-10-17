"""Database tables. These never go to the browser directly; see schemas.py."""
from datetime import date, datetime, timezone
from typing import Literal
from uuid import uuid4

from sqlalchemy import CheckConstraint, String, UniqueConstraint
from sqlmodel import Field, SQLModel

RegistrationStatus = Literal["pending", "paid"]
TransactionStatus = Literal["success", "failed"]


def _new_id() -> str:
    return str(uuid4())


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Trip(SQLModel, table=True):
    id: str = Field(primary_key=True)
    school_id: str
    name: str
    date: date
    location: str
    cost_cents: int


class Student(SQLModel, table=True):
    """Stands in for the school's student list. Children are identified by id, not name."""

    id: str = Field(primary_key=True)
    school_id: str
    full_name: str
    room: str


class Registration(SQLModel, table=True):
    # One registration per child per trip. The student's name comes from Student.
    __table_args__ = (
        UniqueConstraint("trip_id", "student_id"),
        CheckConstraint("status IN ('pending', 'paid')"),
    )

    id: str = Field(default_factory=_new_id, primary_key=True)
    trip_id: str = Field(foreign_key="trip.id")
    student_id: str = Field(foreign_key="student.id")
    parent_name: str
    # SQLModel can't build a column from a Literal, so the column is a string
    # and the CHECK constraint above enforces the allowed values.
    status: RegistrationStatus = Field(default="pending", sa_type=String)
    created_at: datetime = Field(default_factory=_utc_now)


class Transaction(SQLModel, table=True):
    """One row per payment attempt. No full card number and no CVV, ever."""

    __table_args__ = (CheckConstraint("status IN ('success', 'failed')"),)

    id: str = Field(default_factory=_new_id, primary_key=True)
    registration_id: str = Field(foreign_key="registration.id")
    amount_cents: int
    status: TransactionStatus = Field(sa_type=String)
    legacy_transaction_id: str | None = None
    error_message: str | None = None
    card_last4: str
    created_at: datetime = Field(default_factory=_utc_now)
