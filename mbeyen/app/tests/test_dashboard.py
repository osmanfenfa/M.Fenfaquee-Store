from datetime import date, timedelta

from app.tests.test_expenses import add_expense, make_exp_category
from app.tests.test_products import API, make_product
from app.tests.test_purchases import make_supplier


def sell(client, headers, **payload):
    res = client.post(f"{API}/sales", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def test_empty_dashboard(client, auth_headers):
    d = client.get(f"{API}/dashboard", headers=auth_headers).json()
    f = d["financials"]
    assert f["revenue"] == 0 and f["net_profit"] == 0 and f["gross_margin_pct"] is None
    assert d["date_from"] == date.today().replace(day=1).isoformat()
    assert len(d["sales_trend"]) == date.today().day  # one zero point per day so far
    assert d["recent_sales"] == [] and d["top_products"] == []


def test_dashboard_figures_match_records(client, auth_headers):
    """Hand-calculated scenario — every number must tie back to the records."""
    cola = make_product(client, auth_headers, name="Cola", sku="C", cost_price=8, selling_price=12, opening_stock=100)
    rice = make_product(client, auth_headers, name="Rice", sku="R", cost_price=200, selling_price=250, opening_stock=10)
    today = date.today().isoformat()

    # Sale 1: 10 cola, fully paid cash -> revenue 120, cogs 80
    sell(client, auth_headers, items=[{"product_id": cola["id"], "quantity": 10}], payment={"amount": 120})
    # Sale 2: 2 rice @250 with 20 line discount + 10 sale discount -> 470, cogs 400; credit, 100 by mobile money
    sell(client, auth_headers, customer_name="Aminata",
         items=[{"product_id": rice["id"], "quantity": 2, "discount": 20}], discount=10,
         payment={"amount": 100, "method": "mobile_money"})
    # Sale 3: voided -> must be ignored everywhere
    s3 = sell(client, auth_headers, items=[{"product_id": cola["id"], "quantity": 5}], payment={"amount": 60})
    client.post(f"{API}/sales/{s3['id']}/void", json={"reason": "test void"}, headers=auth_headers)

    # Expenses 90
    cat = make_exp_category(client, auth_headers, "Transport")
    add_expense(client, auth_headers, cat["id"], 90)

    # Purchase received, partly paid -> payables 300
    sup = make_supplier(client, auth_headers)
    client.post(f"{API}/purchases", json={
        "supplier_id": sup["id"], "items": [{"product_id": cola["id"], "quantity": 50, "unit_cost": 8}],
        "payment": {"amount": 100},
    }, headers=auth_headers)

    d = client.get(f"{API}/dashboard", params={"date_from": today, "date_to": today}, headers=auth_headers).json()
    f = d["financials"]
    assert f["revenue"] == 590  # 120 + 470
    assert f["cogs"] == 480  # 80 + 400
    assert f["gross_profit"] == 110
    assert f["gross_margin_pct"] == 18.6
    assert f["expenses"] == 90
    assert f["net_profit"] == 20
    assert f["sales_count"] == 2
    assert f["average_sale"] == 295
    assert f["discounts_given"] == 30
    assert f["purchases_total"] == 400

    assert d["today"] == {"revenue": 590, "sales_count": 2, "gross_profit": 110, "money_received": 220}
    assert {m["method"]: m["amount"] for m in d["money_in_by_method"]} == {"cash": 120, "mobile_money": 100}
    assert d["receivables"] == {"total": 370, "count": 1}
    assert d["payables"] == {"total": 300, "count": 1}

    assert [(p["name"], p["revenue"], p["gross_profit"]) for p in d["top_products"]] == [
        ("Rice", 480, 80),  # line totals (before the 10 sale-level discount)
        ("Cola", 120, 40),
    ]
    assert d["expenses_by_category"][0]["total"] == 90
    assert len(d["recent_sales"]) == 3 and d["recent_sales"][0]["status"] == "voided"
    assert d["sales_trend"] == [{"period": today, "revenue": 590, "gross_profit": 110, "sales_count": 2}]


def test_previous_period_comparison(client, auth_headers):
    p = make_product(client, auth_headers, opening_stock=100)
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    sell(client, auth_headers, sale_date=yesterday, items=[{"product_id": p["id"], "quantity": 1}], payment={"amount": 12})
    sell(client, auth_headers, items=[{"product_id": p["id"], "quantity": 2}], payment={"amount": 24})

    today = date.today().isoformat()
    d = client.get(f"{API}/dashboard", params={"date_from": today, "date_to": today}, headers=auth_headers).json()
    assert d["financials"]["revenue"] == 24
    assert d["previous_financials"]["revenue"] == 12


def test_long_period_groups_by_month(client, auth_headers):
    start = (date.today() - timedelta(days=200)).isoformat()
    d = client.get(f"{API}/dashboard", params={"date_from": start}, headers=auth_headers).json()
    assert d["trend_grouping"] == "month"
    assert all(p["period"].endswith("-01") for p in d["sales_trend"])


def test_invalid_range(client, auth_headers):
    res = client.get(f"{API}/dashboard", params={"date_from": "2026-02-01", "date_to": "2026-01-01"}, headers=auth_headers)
    assert res.status_code == 422
