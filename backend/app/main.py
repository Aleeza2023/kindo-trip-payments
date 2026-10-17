"""Entry point for the FastAPI backend."""
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI
from sqlmodel import Session, SQLModel

from app.db import engine
from app.models import Student, Trip
from app.routers import trips

def seed(session: Session) -> None:
    """Add each seed row only if it isn't there yet, so restarts don't duplicate."""
    rows: list[Trip | Student] = [
        Trip(
            id="TRIP-ZOO-2026",
            school_id="SCH-001",
            name="Hamilton Zoo Visit",
            date=date(2026, 11, 12),
            location="Hamilton Zoo",
            cost_cents=2500,
        ),
        # Two different children called Sam Lee, to show why we identify by student id.
        Student(id="STU-1001", school_id="SCH-001", full_name="Mia Smith", room="Room 5"),
        Student(id="STU-1002", school_id="SCH-001", full_name="Sam Lee", room="Room 5"),
        Student(id="STU-1003", school_id="SCH-001", full_name="Sam Lee", room="Room 8"),
        Student(id="STU-2001", school_id="SCH-002", full_name="Ava Brown", room="Room 2"),
    ]
    for row in rows:
        if session.get(type(row), row.id) is None:
            session.add(row)
    session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        seed(session)
    yield


app = FastAPI(title="Kindo Trip Payments", lifespan=lifespan)
app.include_router(trips.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Simple check that the server is running."""
    return {"status": "ok"}
