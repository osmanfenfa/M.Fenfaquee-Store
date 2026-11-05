import os

# Tests run against an in-memory SQLite database — set before the app is imported.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-at-least-32-characters"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.services import auth_service

OWNER_USERNAME = "owner"
OWNER_PASSWORD = "correct-horse-battery"


@pytest.fixture
def db() -> Session:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def _enable_fk(dbapi_conn, _):  # SQLite ignores foreign keys unless asked
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def client(db: Session) -> TestClient:
    def _override():
        try:
            yield db
        except Exception:
            db.rollback()
            raise

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def owner(db: Session):
    return auth_service.create_owner(db, OWNER_USERNAME, "Shop Owner", OWNER_PASSWORD)


@pytest.fixture
def auth_headers(client: TestClient, owner) -> dict[str, str]:
    res = client.post(
        "/api/v1/auth/login", data={"username": OWNER_USERNAME, "password": OWNER_PASSWORD}
    )
    return {"Authorization": f"Bearer {res.json()['access_token']}"}
