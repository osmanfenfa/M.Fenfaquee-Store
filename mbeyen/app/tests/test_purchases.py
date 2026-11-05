from datetime import date
from decimal import Decimal

from sqlalchemy import func, select

from app.models import Product, StockMovement
from app.services.purchase_service import weighted_average_cost
from app.tests.test_products import API, make_product
from app.tests.test_sales import stock_of


def make_supplier(client, headers, name="Freetown Wholesale", **extra):
    res = client.post(f"{API}/suppliers", json={"name": name, **extra}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def buy(client, headers, **payload):
    return client.post(f"{API}/purchases", json=payload, headers=headers)


# ---------- suppliers ----------

def test_supplier_crud(client, auth_headers):
    s = make_supplier(client, auth_headers, phone=" 076 123 456 ", email="sales@fw.sl")
    assert s["phone"] == "076 123 456" and s["balance_owed"] == 0 and s["purchase_count"] == 0

    dup = client.post(f"{API}/suppliers", json={"name": "freetown wholesale"}, headers=auth_headers)
    assert dup.status_code == 409

    res = client.patch(f"{API}/suppliers/{s['id']}", json={"contact_person": "Mr Bangura"}, headers=auth_headers)
    assert res.json()["contact_person"] == "Mr Bangura"

    found = client.get(f"{API}/suppliers", params={"search": "bangura"}, headers=auth_headers).json()
    assert found["total"] == 1

    assert client.delete(f"{API}/suppliers/{s['id']}", headers=auth_headers).status_code == 204
    assert client.get(f"{API}/suppliers", headers=auth_headers).json()["total"] == 0


def test_invalid_supplier_email(client, auth_headers):
    res = client.post(f"{API}/suppliers", json={"name": "X", "email": "not-an-email"}, headers=auth_headers)
    assert res.status_code == 422


# ---------- weighted average ----------

def test_weighted_average_cost_maths():
    assert weighted_average_cost(Decimal("10"), Decimal("8"), Decimal("10"), Decimal("10")) == Decimal("9.00")
    assert weighted_average_cost(Decimal("0"), Decimal("8"), Decimal("5"), Decimal("11")) == Decimal("11.00")
    assert weighted_average_cost(Decimal("3"), Decimal("1"), Decimal("1"), Decimal("2")) == Decimal("1.25")


# ---------- purchases ----------

def test_received_purchase_adds_stock_and_averages_cost(client, auth_headers):
    p = make_product(client, auth_headers, cost_price=8, opening_stock=10)
    sup = make_supplier(client, auth_headers)
    res = buy(
        client, auth_headers,
        supplier_id=sup["id"],
        supplier_invoice_no="INV-77",
        items=[{"product_id": p["id"], "quantity": 10, "unit_cost": 10, "new_selling_price": 14}],
        payment={"amount": 100, "method": "bank_transfer"},
    )
    assert res.status_code == 201, res.text
    pur = res.json()
    assert pur["reference"] == f"PUR-{date.today():%Y%m%d}-0001"
    assert pur["status"] == "received" and pur["received_at"]
    assert pur["total"] == 100 and pur["payment_status"] == "paid"
    assert pur["supplier_name"] == "Freetown Wholesale"

    prod = client.get(f"{API}/products/{p['id']}", headers=auth_headers).json()
    assert prod["stock_quantity"] == 20
    assert prod["cost_price"] == 9  # (10x8 + 10x10) / 20
    assert prod["selling_price"] == 14


def test_ordered_then_received(client, auth_headers):
    p = make_product(client, auth_headers, opening_stock=0)
    sup = make_supplier(client, auth_headers)
    pur = buy(
        client, auth_headers, supplier_id=sup["id"], status="ordered",
        items=[{"product_id": p["id"], "quantity": 12, "unit_cost": 7}],
    ).json()
    assert pur["status"] == "ordered"
    assert stock_of(client, auth_headers, p["id"]) == 0

    res = client.post(f"{API}/purchases/{pur['id']}/receive", headers=auth_headers)
    assert res.json()["status"] == "received"
    assert stock_of(client, auth_headers, p["id"]) == 12
    prod = client.get(f"{API}/products/{p['id']}", headers=auth_headers).json()
    assert prod["cost_price"] == 7  # no prior stock -> new cost

    again = client.post(f"{API}/purchases/{pur['id']}/receive", headers=auth_headers)
    assert again.status_code == 422


def test_unpaid_purchase_needs_supplier(client, auth_headers):
    p = make_product(client, auth_headers)
    res = buy(client, auth_headers, items=[{"product_id": p["id"], "quantity": 1, "unit_cost": 5}])
    assert res.status_code == 422
    assert stock_of(client, auth_headers, p["id"]) == 24  # rolled back

    # Fully paid market purchase without a supplier is fine
    ok = buy(client, auth_headers, items=[{"product_id": p["id"], "quantity": 1, "unit_cost": 5}], payment={"amount": 5})
    assert ok.status_code == 201


def test_supplier_balance_and_payments(client, auth_headers):
    p = make_product(client, auth_headers)
    sup = make_supplier(client, auth_headers)
    pur = buy(
        client, auth_headers, supplier_id=sup["id"],
        items=[{"product_id": p["id"], "quantity": 20, "unit_cost": 8}],  # 160
        payment={"amount": 60},
    ).json()
    assert pur["payment_status"] == "partial"
    assert client.get(f"{API}/suppliers/{sup['id']}", headers=auth_headers).json()["balance_owed"] == 100

    owed = client.get(f"{API}/purchases", params={"outstanding": True}, headers=auth_headers).json()
    assert owed["total"] == 1

    res = client.post(f"{API}/purchases/{pur['id']}/payments", json={"amount": 100, "method": "cash"}, headers=auth_headers)
    assert res.json()["payment_status"] == "paid"
    assert client.get(f"{API}/suppliers/{sup['id']}", headers=auth_headers).json()["balance_owed"] == 0


def test_cancel_received_purchase_removes_stock(client, auth_headers, db):
    p = make_product(client, auth_headers, cost_price=8, opening_stock=10)
    sup = make_supplier(client, auth_headers)
    pur = buy(
        client, auth_headers, supplier_id=sup["id"],
        items=[{"product_id": p["id"], "quantity": 10, "unit_cost": 10}],
    ).json()
    res = client.post(f"{API}/purchases/{pur['id']}/cancel", json={"reason": "Wrong supplier"}, headers=auth_headers)
    assert res.status_code == 200 and res.json()["status"] == "cancelled"

    prod = client.get(f"{API}/products/{p['id']}", headers=auth_headers).json()
    assert prod["stock_quantity"] == 10
    assert prod["cost_price"] == 8  # average restored
    assert client.get(f"{API}/suppliers/{sup['id']}", headers=auth_headers).json()["balance_owed"] == 0

    pay = client.post(f"{API}/purchases/{pur['id']}/payments", json={"amount": 1}, headers=auth_headers)
    assert pay.status_code == 422

    ledger = db.scalar(select(func.sum(StockMovement.quantity_change)).where(StockMovement.product_id == p["id"]))
    assert db.get(Product, p["id"]).stock_quantity == ledger


def test_cancel_blocked_when_stock_already_sold(client, auth_headers):
    p = make_product(client, auth_headers, opening_stock=0)
    pur = buy(
        client, auth_headers,
        items=[{"product_id": p["id"], "quantity": 5, "unit_cost": 8}], payment={"amount": 40},
    ).json()
    client.post(f"{API}/sales", json={"items": [{"product_id": p["id"], "quantity": 3}], "payment": {"amount": 36}}, headers=auth_headers)

    res = client.post(f"{API}/purchases/{pur['id']}/cancel", json={"reason": "Mistake"}, headers=auth_headers)
    assert res.status_code == 422
    assert "Not enough stock" in res.json()["detail"]
    assert client.get(f"{API}/purchases/{pur['id']}", headers=auth_headers).json()["status"] == "received"


def test_cancel_ordered_purchase_no_stock_change(client, auth_headers):
    p = make_product(client, auth_headers)
    sup = make_supplier(client, auth_headers)
    pur = buy(client, auth_headers, supplier_id=sup["id"], status="ordered",
              items=[{"product_id": p["id"], "quantity": 5, "unit_cost": 8}]).json()
    res = client.post(f"{API}/purchases/{pur['id']}/cancel", json={"reason": "Supplier out of stock"}, headers=auth_headers)
    assert res.json()["status"] == "cancelled"
    assert stock_of(client, auth_headers, p["id"]) == 24


def test_archived_supplier_or_product_rejected(client, auth_headers):
    p = make_product(client, auth_headers)
    sup = make_supplier(client, auth_headers)
    client.delete(f"{API}/suppliers/{sup['id']}", headers=auth_headers)
    res = buy(client, auth_headers, supplier_id=sup["id"], items=[{"product_id": p["id"], "quantity": 1, "unit_cost": 1}])
    assert res.status_code == 422

    client.delete(f"{API}/products/{p['id']}", headers=auth_headers)
    res = buy(client, auth_headers, items=[{"product_id": p["id"], "quantity": 1, "unit_cost": 1}], payment={"amount": 1})
    assert res.status_code == 422


def test_list_search_by_supplier_and_invoice(client, auth_headers):
    p = make_product(client, auth_headers)
    a = make_supplier(client, auth_headers, "Kissy Traders")
    b = make_supplier(client, auth_headers, "Bo Distributors")
    buy(client, auth_headers, supplier_id=a["id"], supplier_invoice_no="KT-1",
        items=[{"product_id": p["id"], "quantity": 1, "unit_cost": 1}], payment={"amount": 1})
    buy(client, auth_headers, supplier_id=b["id"], items=[{"product_id": p["id"], "quantity": 1, "unit_cost": 1}])

    assert client.get(f"{API}/purchases", params={"search": "kissy"}, headers=auth_headers).json()["total"] == 1
    assert client.get(f"{API}/purchases", params={"search": "kt-1"}, headers=auth_headers).json()["total"] == 1
    assert client.get(f"{API}/purchases", params={"supplier_id": b["id"]}, headers=auth_headers).json()["total"] == 1
