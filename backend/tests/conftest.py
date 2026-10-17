"""Shared fixtures: a fresh, seeded test database for each test. The real app.db is never used."""
from collections.abc import Iterator
from pathlib import Path

import pytest
from sqlalchemy import Engine, event
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.db import enable_foreign_keys
from app.main import seed


def _seeded_engine(url: str, **kwargs: object) -> Engine:
    engine = create_engine(url, connect_args={"check_same_thread": False}, **kwargs)
    event.listen(engine, "connect", enable_foreign_keys)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        seed(session)
    return engine


@pytest.fixture
def memory_engine() -> Iterator[Engine]:
    # StaticPool: every connection is the same one,
    # so the in-memory database isn't lost between them.
    engine = _seeded_engine("sqlite://", poolclass=StaticPool)
    yield engine
    engine.dispose()


@pytest.fixture
def session(memory_engine: Engine) -> Iterator[Session]:
    with Session(memory_engine) as session:
        yield session


@pytest.fixture
def file_engine(tmp_path: Path) -> Iterator[Engine]:
    """A real database file, for tests where two threads need their own connections."""
    engine = _seeded_engine(f"sqlite:///{tmp_path / 'test.db'}")
    yield engine
    engine.dispose()
