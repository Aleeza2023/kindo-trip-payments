"""Trip endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.db import get_session
from app.models import Trip
from app.schemas import TripOut

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.get("/{trip_id}", response_model=TripOut)
def get_trip(trip_id: str, session: Session = Depends(get_session)) -> Trip:
    trip = session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return trip
