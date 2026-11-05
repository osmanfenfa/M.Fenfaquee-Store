from datetime import date, timedelta

from sqlalchemy import func, select

from app.models import AuditLog
from app.tests.test_products import API


def make_exp_category(client, headers, name="Rent"):
    res = client.post(f"{API}/expenses/categories", json={"name": name}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def add_expense(client, headers, category_id, amount, **extra):
    payload = {"category_id": category_id, "amount": amount, "description": "Test expense", **extra}
    res = client.post(f"{API}/expenses", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def test_expense_category_management(client, auth_headers):
    rent = make_exp_category(client, auth_headers)
    assert client.post(f"{API}/expenses/categories", json={"name": "rent"}, headers=auth_headers).status_code == 409

    res = client.patch(f"{API}/expenses/categories/{rent['id']}", json={"name": "Shop Rent"}, headers=auth_headers)
    assert res.json()["name"] == "Shop Rent"

    add_expense(client, auth_headers, rent["id"], 500)
    cats = client.get(f"{API}/expenses/categories", headers=auth_headers).json()
    assert cats[0]["expense_count"] == 1
    assert client.delete(f"{API}/expenses/categories/{rent['id']}", headers=auth_headers).status_code == 409

    empty = make_exp_category(client, auth_headers, "Unused")
    assert client.delete(f"{API}/expenses/categories/{empty['id']}", headers=auth_headers).status_code == 204


def test_create_list_update_delete_expense(client, auth_headers, db):
    power = make_exp_category(client, auth_headers, "Electricity")
    transport = make_exp_category(client, auth_headers, "Transport")
    e = add_expense(client, auth_headers, power["id"], 150.5, description="EDSA top-up", payment_method="mobile_money")
    assert e["category_name"] == "Electricity" and e["amount"] == 150.5

    res = client.patch(
        f"{API}/expenses/{e['id']}", json={"amount": 175, "category_id": transport["id"]}, headers=auth_headers
    )
    assert res.json()["amount"] == 175 and res.json()["category_name"] == "Transport"

    found = client.get(f"{API}/expenses", params={"search": "edsa"}, headers=auth_headers).json()
    assert found["total"] == 1

    assert client.delete(f"{API}/expenses/{e['id']}", headers=auth_headers).status_code == 204
    assert client.get(f"{API}/expenses", headers=auth_headers).json()["total"] == 0
    actions = set(db.scalars(select(AuditLog.action).where(AuditLog.entity == "expense")))
    assert actions == {"update", "delete"}


def test_expense_validation(client, auth_headers):
    cat = make_exp_category(client, auth_headers)
    base = {"category_id": cat["id"], "description": "x"}
    assert client.post(f"{API}/expenses", json={**base, "amount": 0}, headers=auth_headers).status_code == 422
    future = (date.today() + timedelta(days=1)).isoformat()
    assert client.post(f"{API}/expenses", json={**base, "amount": 5, "expense_date": future}, headers=auth_headers).status_code == 422
    assert client.post(f"{API}/expenses", json={**base, "amount": 5, "category_id": 999}, headers=auth_headers).status_code == 404


def test_expense_summary_by_category(client, auth_headers):
    rent = make_exp_category(client, auth_headers, "Rent")
    power = make_exp_category(client, auth_headers, "Electricity")
    add_expense(client, auth_headers, rent["id"], 1000)
    add_expense(client, auth_headers, power["id"], 100)
    add_expense(client, auth_headers, power["id"], 50)
    old = (date.today().replace(day=1) - timedelta(days=1)).isoformat()  # last month
    add_expense(client, auth_headers, power["id"], 999, expense_date=old)

    s = client.get(f"{API}/expenses/summary", headers=auth_headers).json()
    assert s["total"] == 1150 and s["count"] == 3
    assert [(c["category_name"], c["total"]) for c in s["by_category"]] == [("Rent", 1000), ("Electricity", 150)]
