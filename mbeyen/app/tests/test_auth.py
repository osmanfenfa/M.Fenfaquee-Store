import pytest

from app.services import auth_service
from app.tests.conftest import OWNER_PASSWORD, OWNER_USERNAME


def test_login_success(client, owner):
    res = client.post("/api/v1/auth/login", data={"username": OWNER_USERNAME, "password": OWNER_PASSWORD})
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_username_is_case_insensitive(client, owner):
    res = client.post("/api/v1/auth/login", data={"username": "OWNER", "password": OWNER_PASSWORD})
    assert res.status_code == 200


def test_login_wrong_password(client, owner):
    res = client.post("/api/v1/auth/login", data={"username": OWNER_USERNAME, "password": "nope-nope"})
    assert res.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_rejects_bad_token(client):
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-token"})
    assert res.status_code == 401


def test_me_returns_owner(client, auth_headers):
    res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["username"] == OWNER_USERNAME
    assert "password_hash" not in res.json()


def test_change_password(client, auth_headers):
    res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": OWNER_PASSWORD, "new_password": "a-brand-new-pass"},
        headers=auth_headers,
    )
    assert res.status_code == 204
    old = client.post("/api/v1/auth/login", data={"username": OWNER_USERNAME, "password": OWNER_PASSWORD})
    assert old.status_code == 401
    new = client.post("/api/v1/auth/login", data={"username": OWNER_USERNAME, "password": "a-brand-new-pass"})
    assert new.status_code == 200


def test_change_password_wrong_current(client, auth_headers):
    res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "wrong-password", "new_password": "a-brand-new-pass"},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_only_one_owner_allowed(db, owner):
    with pytest.raises(ValueError):
        auth_service.create_owner(db, "second", "Someone Else", "another-password")
