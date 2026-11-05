from datetime import date, timedelta

from sqlalchemy import func, select

from app.models import AuditLog, Product, StockMovement
from app.tests.test_products import API, make_product


def sell(client, headers, **payload):
    return client.post(f"{API}/sales", json=payload, headers=headers)


def stock_of(client, headers, product_id):
    return client.get(f"{API}/products/{product_id}", headers=headers).json()["stock_quantity"]


def test_cash_sale_reduces_stock_and_is_paid(client, auth_headers):
    p = make_product(client, auth_headers)  # cost 8.50, price 12, stock 24
    res = sell(
        client, auth_headers,
        items=[{"product_id": p["id"], "quantity": 3}],
        payment={"amount": 36, "method": "cash"},
    )
    assert res.status_code == 201, res.text
    s = res.json()
    assert s["reference"] == f"SAL-{date.today():%Y%m%d}-0001"
    assert s["subtotal"] == 36 and s["total"] == 36
    assert s["amount_paid"] == 36 and s["balance_due"] == 0
    assert s["payment_status"] == "paid"
    assert s["gross_profit"] == 10.5  # 3 x (12 - 8.50)
    assert s["items"][0]["product_name"] == "Coca-Cola 50cl"
    assert stock_of(client, auth_headers, p["id"]) == 21

    moves = client.get(f"{API}/inventory/movements", params={"movement_type": "sale"}, headers=auth_headers).json()
    assert moves["items"][0]["sale_id"] == s["id"]
    assert moves["items"][0]["quantity_change"] == -3


def test_custom_price_and_discounts(client, auth_headers):
    a = make_product(client, auth_headers, name="A", sku="A", cost_price=5, selling_price=10)
    b = make_product(client, auth_headers, name="B", sku="B", cost_price=1, selling_price=3)
    s = sell(
        client, auth_headers,
        items=[
            {"product_id": a["id"], "quantity": 2, "unit_price": 9.5, "discount": 1},  # 19 - 1 = 18
            {"product_id": b["id"], "quantity": 4, "discount": 2},  # 12 - 2 = 10
        ],
        discount=3,
        payment={"amount": 25},
    ).json()
    assert [i["line_total"] for i in s["items"]] == [18, 10]
    assert s["subtotal"] == 28 and s["discount"] == 3 and s["total"] == 25
    assert s["gross_profit"] == 25 - (2 * 5 + 4 * 1)  # 11
    assert s["payment_status"] == "paid"


def test_reference_sequence(client, auth_headers):
    p = make_product(client, auth_headers)
    refs = [
        sell(client, auth_headers, items=[{"product_id": p["id"], "quantity": 1}], payment={"amount": 12}).json()["reference"]
        for _ in range(3)
    ]
    assert [r[-4:] for r in refs] == ["0001", "0002", "0003"]


def test_overselling_blocked_and_nothing_saved(client, auth_headers, db):
    a = make_product(client, auth_headers, name="A", sku="A", opening_stock=10)
    b = make_product(client, auth_headers, name="B", sku="B", opening_stock=1)
    res = sell(
        client, auth_headers,
        items=[{"product_id": a["id"], "quantity": 2}, {"product_id": b["id"], "quantity": 5}],
        payment={"amount": 1},
    )
    assert res.status_code == 422
    assert "Not enough stock for 'B'" in res.json()["detail"]
    # Whole sale rolled back — including product A's stock
    assert stock_of(client, auth_headers, a["id"]) == 10
    assert client.get(f"{API}/sales", headers=auth_headers).json()["total"] == 0


def test_credit_sale_requires_customer_name(client, auth_headers):
    p = make_product(client, auth_headers)
    res = sell(client, auth_headers, items=[{"product_id": p["id"], "quantity": 1}])
    assert res.status_code == 422
    assert "Customer name" in res.json()["detail"]
    assert stock_of(client, auth_headers, p["id"]) == 24


def test_credit_sale_and_later_payments(client, auth_headers):
    p = make_product(client, auth_headers)
    s = sell(
        client, auth_headers,
        customer_name="Aminata Kamara",
        items=[{"product_id": p["id"], "quantity": 5}],  # 60
        payment={"amount": 20, "method": "mobile_money", "reference": "OM123"},
    ).json()
    assert s["payment_status"] == "partial" and s["balance_due"] == 40

    owed = client.get(f"{API}/sales", params={"outstanding": True}, headers=auth_headers).json()
    assert owed["total"] == 1

    too_much = client.post(f"{API}/sales/{s['id']}/payments", json={"amount": 41}, headers=auth_headers)
    assert too_much.status_code == 422

    s = client.post(f"{API}/sales/{s['id']}/payments", json={"amount": 40}, headers=auth_headers).json()
    assert s["payment_status"] == "paid" and s["balance_due"] == 0
    assert len(s["payments"]) == 2

    again = client.post(f"{API}/sales/{s['id']}/payments", json={"amount": 1}, headers=auth_headers)
    assert again.status_code == 422


def test_void_returns_stock_and_blocks_payments(client, auth_headers, db):
    p = make_product(client, auth_headers)
    s = sell(client, auth_headers, customer_name="Musa", items=[{"product_id": p["id"], "quantity": 4}]).json()
    assert stock_of(client, auth_headers, p["id"]) == 20

    res = client.post(f"{API}/sales/{s['id']}/void", json={"reason": "Wrong quantity"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "voided"
    assert stock_of(client, auth_headers, p["id"]) == 24

    assert client.post(f"{API}/sales/{s['id']}/void", json={"reason": "again"}, headers=auth_headers).status_code == 422
    assert client.post(f"{API}/sales/{s['id']}/payments", json={"amount": 5}, headers=auth_headers).status_code == 422
    assert db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.action == "void")) == 1

    # Ledger still balances after sale + void
    ledger = db.scalar(select(func.sum(StockMovement.quantity_change)).where(StockMovement.product_id == p["id"]))
    assert db.get(Product, p["id"]).stock_quantity == ledger


def test_backdated_sale_allowed_future_blocked(client, auth_headers):
    p = make_product(client, auth_headers)
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    ok = sell(client, auth_headers, sale_date=yesterday, items=[{"product_id": p["id"], "quantity": 1}], payment={"amount": 12})
    assert ok.status_code == 201
    assert ok.json()["payments"][0]["payment_date"] == yesterday

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    bad = sell(client, auth_headers, sale_date=tomorrow, items=[{"product_id": p["id"], "quantity": 1}], payment={"amount": 12})
    assert bad.status_code == 422


def test_payment_before_sale_date_rejected(client, auth_headers):
    p = make_product(client, auth_headers)
    s = sell(client, auth_headers, customer_name="Fatu", items=[{"product_id": p["id"], "quantity": 1}]).json()
    early = (date.today() - timedelta(days=1)).isoformat()
    res = client.post(f"{API}/sales/{s['id']}/payments", json={"amount": 5, "payment_date": early}, headers=auth_headers)
    assert res.status_code == 422


def test_invalid_discounts_and_archived_products(client, auth_headers):
    p = make_product(client, auth_headers)
    over_line = sell(client, auth_headers, items=[{"product_id": p["id"], "quantity": 1, "discount": 13}])
    assert over_line.status_code == 422
    over_sale = sell(client, auth_headers, items=[{"product_id": p["id"], "quantity": 1}], discount=13)
    assert over_sale.status_code == 422

    client.delete(f"{API}/products/{p['id']}", headers=auth_headers)
    archived = sell(client, auth_headers, items=[{"product_id": p["id"], "quantity": 1}], payment={"amount": 12})
    assert archived.status_code == 422
    assert "archived" in archived.json()["detail"]


def test_price_change_does_not_alter_past_sale(client, auth_headers):
    p = make_product(client, auth_headers)
    s = sell(client, auth_headers, items=[{"product_id": p["id"], "quantity": 2}], payment={"amount": 24}).json()
    client.patch(f"{API}/products/{p['id']}", json={"selling_price": 20, "cost_price": 15}, headers=auth_headers)
    again = client.get(f"{API}/sales/{s['id']}", headers=auth_headers).json()
    assert again["total"] == 24 and again["gross_profit"] == 7  # 24 - 2 x 8.50


def test_list_filters(client, auth_headers):
    p = make_product(client, auth_headers)
    sell(client, auth_headers, items=[{"product_id": p["id"], "quantity": 1}], payment={"amount": 12})
    sell(client, auth_headers, customer_name="Ibrahim Sesay", items=[{"product_id": p["id"], "quantity": 1}])
    assert client.get(f"{API}/sales", params={"search": "sesay"}, headers=auth_headers).json()["total"] == 1
    assert client.get(f"{API}/sales", params={"payment_status": "unpaid"}, headers=auth_headers).json()["total"] == 1
    listed = client.get(f"{API}/sales", headers=auth_headers).json()
    assert listed["total"] == 2 and listed["items"][0]["item_count"] == 1
