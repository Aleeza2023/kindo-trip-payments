"""SQLite engine and the session dependency."""
from collections.abc import Iterator
from pathlib import Path
from sqlite3 import Connection as SQLiteConnection
from typing import Any

from sqlalchemy import event
from sqlmodel import Session, create_engine

# backend/app.db, built from this file's location so the working directory doesn't matter.
DB_PATH = Path(__file__).resolve().parent.parent / "app.db"

# FastAPI runs def endpoints in a thread pool, so a connection may be used
# by a different thread than the one that opened it.
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection: SQLiteConnection, connection_record: Any) -> None:
    """SQLite ignores foreign keys unless this is switched on for every connection."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_session() -> Iterator[Session]:
    """Give each request its own session and close it afterwards."""
    with Session(engine) as session:
        yield session
