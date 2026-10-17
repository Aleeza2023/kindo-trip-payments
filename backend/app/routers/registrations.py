"""Registration endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session

from app.db import get_session
from app.schemas import RegistrationCreate, RegistrationOut
from app.services.payment_service import AlreadyPaid, StudentNotFound, TripNotFound, register_child

router = APIRouter(prefix="/api", tags=["registrations"])

STUDENT_NOT_FOUND_MESSAGE = "We couldn't find that student. Check the student ID and name."
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
    except StudentNotFound:
        raise HTTPException(status_code=404, detail=STUDENT_NOT_FOUND_MESSAGE)
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
