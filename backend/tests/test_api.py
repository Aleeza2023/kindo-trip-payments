"""The HTTP layer: status codes, response shapes, and that card data never comes back."""
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session

from app.db import get_session
from app.main import app
from app.payment_gateway import get_gateway
from app.routers.payments import UNAVAILABLE_MESSAGE
from tests.fakes import DECLINED, FakeGateway

TRIP = "TRIP-ZOO-2026"
CARD = "4242424242424242"
CVV = "987"
MIA = {"student_id": "STU-1001", "student_name": "Mia Smith", "parent_name": "Jane Smith"}
GOOD_CARD = {"card_number": CARD, "expiry_date": "12/99", "cvv": CVV}


@pytest.fixture
def gateway() -> FakeGateway:
    return FakeGateway()


@pytest.fixture
def client(memory_engine: Engine, gateway: FakeGateway) -> Iterator[TestClient]:
    def test_session() -> Iterator[Session]:
        with Session(memory_engine) as session:
            yield session

    app.dependency_overrides[get_session] = test_session
    app.dependency_overrides[get_gateway] = lambda: gateway
    # Not "with TestClient(app)": that would run the lifespan, which seeds the real app.db.
    yield TestClient(app)
    app.dependency_overrides.clear()


def register(client: TestClient, body: dict[str, str] = MIA) -> str:
    response = client.post(f"/api/trips/{TRIP}/registrations", json=body)
    assert response.status_code == 201
    registration_id: str = response.json()["id"]
    return registration_id


# --- trips ---


def test_get_trip(client: TestClient) -> None:
    response = client.get(f"/api/trips/{TRIP}")
    assert response.status_code == 200
    assert response.json()["cost"] == "25.00"
    assert "school_id" not in response.json()


def test_get_unknown_trip(client: TestClient) -> None:
    assert client.get("/api/trips/NOPE").status_code == 404


# --- registrations ---


def test_register(client: TestClient) -> None:
    response = client.post(f"/api/trips/{TRIP}/registrations", json=MIA)
    assert response.status_code == 201
    body = response.json()
    assert body["student_name"] == "Mia Smith"
    assert body["status"] == "pending"
    assert body["already_registered"] is False
    assert "parent_name" not in body


def test_register_again_while_pending_returns_existing(client: TestClient) -> None:
    first_id = register(client)
    other_parent = MIA | {"parent_name": "Someone Else"}
    response = client.post(f"/api/trips/{TRIP}/registrations", json=other_parent)
    assert response.status_code == 200
    assert response.json()["id"] == first_id
    assert response.json()["already_registered"] is True


def test_register_again_after_paid_is_409(client: TestClient) -> None:
    client.post(f"/api/registrations/{register(client)}/payments", json=GOOD_CARD)
    response = client.post(f"/api/trips/{TRIP}/registrations", json=MIA)
    assert response.status_code == 409


def test_register_wrong_student_is_404_with_reason(client: TestClient) -> None:
    wrong_name = MIA | {"student_name": "Sam Lee"}
    response = client.post(f"/api/trips/{TRIP}/registrations", json=wrong_name)
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "name_mismatch"


def test_register_unknown_trip_is_404(client: TestClient) -> None:
    assert client.post("/api/trips/NOPE/registrations", json=MIA).status_code == 404


# --- payments ---


def test_pay_success(client: TestClient) -> None:
    response = client.post(f"/api/registrations/{register(client)}/payments", json=GOOD_CARD)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["payment_reference"] == "TX-1-1000"  # the processor's number, from the fake gateway
    assert body["registration_status"] == "paid"
    assert body["amount"] == "25.00"
    assert body["card_last4"] == "4242"
    # Only the last 4 digits come back: never the full card number or the CVV.
    assert CARD not in response.text
    assert CVV not in response.text


def test_pay_decline_is_200_with_failed_status(client: TestClient, gateway: FakeGateway) -> None:
    gateway.results = [DECLINED]
    response = client.post(f"/api/registrations/{register(client)}/payments", json=GOOD_CARD)
    assert response.status_code == 200
    assert response.json()["status"] == "failed"
    assert response.json()["payment_reference"] is None  # declines get no processor number
    assert response.json()["registration_status"] == "pending"
    assert "not been charged" in response.json()["message"]


def test_pay_twice_is_409_and_gateway_called_once(client: TestClient, gateway: FakeGateway) -> None:
    registration_id = register(client)
    client.post(f"/api/registrations/{registration_id}/payments", json=GOOD_CARD)
    response = client.post(f"/api/registrations/{registration_id}/payments", json=GOOD_CARD)
    assert response.status_code == 409
    assert len(gateway.calls) == 1


def test_pay_gateway_crash_is_502(client: TestClient, gateway: FakeGateway) -> None:
    gateway.crash = True
    response = client.post(f"/api/registrations/{register(client)}/payments", json=GOOD_CARD)
    assert response.status_code == 502
    assert response.json()["detail"] == UNAVAILABLE_MESSAGE


def test_pay_unknown_registration_is_404(client: TestClient) -> None:
    assert client.post("/api/registrations/no-such-id/payments", json=GOOD_CARD).status_code == 404


def test_pay_with_amount_is_422(client: TestClient, gateway: FakeGateway) -> None:
    with_amount = GOOD_CARD | {"amount": 1}
    response = client.post(f"/api/registrations/{register(client)}/payments", json=with_amount)
    assert response.status_code == 422
    assert gateway.calls == []


def test_422_does_not_echo_card_data(client: TestClient) -> None:
    bad_card = {"card_number": "4242 4242 4242 424", "expiry_date": "12/99", "cvv": "98"}
    response = client.post(f"/api/registrations/{register(client)}/payments", json=bad_card)
    assert response.status_code == 422
    assert "4242" not in response.text
    assert '"98"' not in response.text
    bad_fields = {tuple(error["loc"]) for error in response.json()["detail"]}
    assert bad_fields == {("body", "card_number"), ("body", "cvv")}
