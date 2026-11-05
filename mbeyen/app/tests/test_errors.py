from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.main import app
from app.tests.test_products import API

boom = APIRouter()


@boom.get("/__test_boom")
def _boom():
    raise RuntimeError("simulated failure")


app.include_router(boom)


def test_unexpected_error_returns_json_with_error_id(client):
    c = TestClient(app, raise_server_exceptions=False)
    res = c.get("/__test_boom")
    assert res.status_code == 500
    detail = res.json()["detail"]
    assert "GET /__test_boom" in detail and "RuntimeError" in detail and "error ID" in detail


def test_business_errors_keep_their_message(client, auth_headers):
    res = client.post(f"{API}/products", json={"name": "X", "category_id": 999}, headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Category 999 not found"
