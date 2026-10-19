"""Registration endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session

from app.db import get_session
from app.schemas import RegistrationCreate, RegistrationOut
from app.services.payment_service import (
    AlreadyPaid,
    StudentNotFound,
    StudentProblem,
    TripNotFound,
    register_child,
)

router = APIRouter(prefix="/api", tags=["registrations"])

STUDENT_MESSAGES: dict[StudentProblem, str] = {
    "unknown_id": "We couldn't find a student with this ID.",
    "other_school": "This student isn't enrolled at the school running this trip.",
    "name_mismatch": "The name doesn't match our records for this student ID.",
}
ALREADY_PAID_MESSAGE = "This child is already registered and paid for this trip."


@router.post("/trips/{trip_id}/registrations", response_model=RegistrationOut, status_code=201)
def create_registration(
    trip_id: str,
    data: RegistrationCreate,
    response: Response,
    session: Session = Depends(get_session),
) -> RegistrationOut:
    try:
        result = register_child(session, trip_id, data)
    except TripNotFound:
        raise HTTPException(status_code=404, detail="Trip not found.")
    except StudentNotFound as exc:
        # The code lets the frontend show the matching message.
        detail = {"code": exc.reason, "message": STUDENT_MESSAGES[exc.reason]}
        raise HTTPException(status_code=404, detail=detail)
    except AlreadyPaid:
        raise HTTPException(status_code=409, detail=ALREADY_PAID_MESSAGE)

    if not result.created:
        response.status_code = 200  # nothing new was created
    return RegistrationOut(
        id=result.registration.id,
        trip_id=result.registration.trip_id,
        student_id=result.registration.student_id,
        student_name=result.student_name,
        status=result.registration.status,
        already_registered=not result.created,
    )
