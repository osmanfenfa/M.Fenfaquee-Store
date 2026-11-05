from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.core.exceptions import BusinessRuleError
from app.models import MovementType, Product, StockMovement
from app.services import inventory_service
from app.tests.test_products import API, make_product


def test_adjust_by_change(client, auth_headers):
    p = make_product(client, auth_headers)  # 24 in stock
    res = client.post(
        f"{API}/inventory/adjustments",
        json={"product_id": p["id"], "quantity_change": -3, "reason": "Damaged bottles"},
        headers=auth_headers,
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["movement_type"] == "adjustment"
    assert body["quantity_change"] == -3
    assert body["quantity_after"] == 21
    assert body["product_name"] == "Coca-Cola 50cl"


def test_adjust_by_count(client, auth_headers):
    p = make_product(client, auth_headers)
    res = client.post(
        f"{API}/inventory/adjustments",
        json={"product_id": p["id"], "counted_quantity": 30, "reason": "Weekly count"},
        headers=auth_headers,
    )
    assert res.json()["quantity_change"] == 6
    assert client.get(f"{API}/products/{p['id']}", headers=auth_headers).json()["stock_quantity"] == 30


def test_adjust_cannot_go_negative(client, auth_headers):
    p = make_product(client, auth_headers)
    res = client.post(
        f"{API}/inventory/adjustments",
        json={"product_id": p["id"], "quantity_change": -25, "reason": "Too much"},
        headers=auth_headers,
    )
    assert res.status_code == 422
    assert "Not enough stock" in res.json()["detail"]


@pytest.mark.parametrize(
    "payload",
    [
        {"quantity_change": 1, "counted_quantity": 1, "reason": "both"},
        {"reason": "neither"},
        {"quantity_change": 0, "reason": "zero change"},
        {"quantity_change": 1, "reason": ""},
    ],
)
def test_adjust_validation(client, auth_headers, payload):
    p = make_product(client, auth_headers)
    res = client.post(f"{API}/inventory/adjustments", json={"product_id": p["id"], **payload}, headers=auth_headers)
    assert res.status_code == 422


def test_count_equal_to_stock_rejected(client, auth_headers):
    p = make_product(client, auth_headers)
    res = client.post(
        f"{API}/inventory/adjustments",
        json={"product_id": p["id"], "counted_quantity": 24, "reason": "Count"},
        headers=auth_headers,
    )
    assert res.status_code == 422


def test_record_movement_blocks_overselling(db, owner, client, auth_headers):
    p = make_product(client, auth_headers, opening_stock=5)
    with pytest.raises(BusinessRuleError):
        inventory_service.record_movement(
            db, product_id=p["id"], quantity_change=Decimal("-6"),
            movement_type=MovementType.SALE, user=owner,
        )


def test_stock_balance_equals_ledger(db, client, auth_headers):
    """The core accuracy guarantee: stock_quantity == sum of movements."""
    p = make_product(client, auth_headers, opening_stock=10)
    for change in (5, -3, -2.5):
        client.post(
            f"{API}/inventory/adjustments",
            json={"product_id": p["id"], "quantity_change": change, "reason": "test"},
            headers=auth_headers,
        )
    product = db.get(Product, p["id"])
    ledger = db.scalar(
        select(func.sum(StockMovement.quantity_change)).where(StockMovement.product_id == p["id"])
    )
    assert product.stock_quantity == Decimal(ledger) == Decimal("9.5")


def test_summary_and_low_stock(client, auth_headers):
    make_product(client, auth_headers, name="A", sku="A", cost_price=10, selling_price=15, opening_stock=4, reorder_level=5)
    make_product(client, auth_headers, name="B", sku="B", cost_price=2, selling_price=3, opening_stock=0, reorder_level=1)
    make_product(client, auth_headers, name="C", sku="C", cost_price=1, selling_price=2, opening_stock=100, reorder_level=5)

    s = client.get(f"{API}/inventory/summary", headers=auth_headers).json()
    assert s == {
        "active_products": 3,
        "low_stock_count": 2,
        "out_of_stock_count": 1,
        "stock_value_cost": 140.0,  # 4x10 + 0 + 100x1
        "stock_value_retail": 260.0,  # 4x15 + 0 + 100x2
    }

    low = client.get(f"{API}/inventory/low-stock", headers=auth_headers).json()
    assert [p["name"] for p in low] == ["B", "A"]  # emptiest first


def test_movements_filter_by_type(client, auth_headers):
    p = make_product(client, auth_headers)
    client.post(
        f"{API}/inventory/adjustments",
        json={"product_id": p["id"], "quantity_change": 1, "reason": "found one"},
        headers=auth_headers,
    )
    res = client.get(f"{API}/inventory/movements", params={"movement_type": "adjustment"}, headers=auth_headers)
    assert res.json()["total"] == 1
    assert client.get(f"{API}/inventory/movements", headers=auth_headers).json()["total"] == 2
