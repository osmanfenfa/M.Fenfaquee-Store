from datetime import date, timedelta
from io import BytesIO

from openpyxl import load_workbook

from app.tests.test_expenses import add_expense, make_exp_category
from app.tests.test_products import API, make_product
from app.tests.test_purchases import make_supplier

TODAY = date.today().isoformat()


def seed(client, h):
    """Same hand-checked scenario as the dashboard test."""
    cola = make_product(client, h, name="Cola", sku="C", cost_price=8, selling_price=12, opening_stock=100, reorder_level=5)
    rice = make_product(client, h, name="Rice", sku="R", cost_price=200, selling_price=250, opening_stock=10, reorder_level=5)
    make_product(client, h, name="Empty", sku="E", opening_stock=0, reorder_level=1)
    client.post(f"{API}/sales", json={"items": [{"product_id": cola["id"], "quantity": 10}], "payment": {"amount": 120}}, headers=h)
    client.post(f"{API}/sales", json={
        "customer_name": "Aminata", "items": [{"product_id": rice["id"], "quantity": 2, "discount": 20}], "discount": 10,
        "payment": {"amount": 100, "method": "mobile_money"},
    }, headers=h)
    v = client.post(f"{API}/sales", json={"items": [{"product_id": cola["id"], "quantity": 5}], "payment": {"amount": 60}}, headers=h).json()
    client.post(f"{API}/sales/{v['id']}/void", json={"reason": "test"}, headers=h)
    cat = make_exp_category(client, h, "Transport")
    add_expense(client, h, cat["id"], 90)
    sup = make_supplier(client, h)
    client.post(f"{API}/purchases", json={
        "supplier_id": sup["id"], "supplier_invoice_no": "INV-9",
        "items": [{"product_id": cola["id"], "quantity": 50, "unit_cost": 8}], "payment": {"amount": 100},
    }, headers=h)


def get(client, h, kind, **params):
    res = client.get(f"{API}/reports/{kind}", params={"date_from": TODAY, "date_to": TODAY, **params}, headers=h)
    assert res.status_code == 200, res.text
    return res.json()


def summary(report):
    return {s["label"]: s["value"] for s in report["summary"]}


def test_sales_report(client, auth_headers):
    seed(client, auth_headers)
    r = get(client, auth_headers, "sales")
    s = summary(r)
    assert s["Revenue"] == 590 and s["Number of sales"] == 2 and s["Gross profit"] == 110
    by_day, by_product = r["tables"]
    assert by_day["rows"] == [[TODAY, 2, 590.0, 480.0, 110.0]]
    assert [row[0] for row in by_product["rows"]] == ["Rice", "Cola"]
    assert by_product["rows"][0][3:7] == [2.0, 480.0, 400.0, 80.0]
    assert "10.00" in by_product["note"]  # sale-level discount explained


def test_profit_loss_report(client, auth_headers):
    seed(client, auth_headers)
    r = get(client, auth_headers, "profit-loss")
    assert summary(r)["Net profit"] == 20
    rows = {row[0].strip(): row[1] for row in r["tables"][0]["rows"]}
    assert rows["Sales revenue"] == 590 and rows["Less: cost of goods sold"] == -480
    assert rows["Transport"] == -90 and rows["Total expenses"] == -90
    assert r["tables"][0]["totals"][:2] == ["Net profit", 20.0]


def test_stock_report(client, auth_headers):
    seed(client, auth_headers)
    r = get(client, auth_headers, "stock")
    rows = {row[0]: row for row in r["tables"][0]["rows"]}
    assert rows["Cola"][4] == 140  # 100 - 10 - 5 + 5 (void returned) + 50 purchased
    assert rows["Empty"][10] == "Out of stock"
    assert rows["Cola"][10] == "OK"
    assert r["period_label"].startswith("As of")


def test_money_owed_report(client, auth_headers):
    seed(client, auth_headers)
    r = get(client, auth_headers, "money-owed")
    s = summary(r)
    assert s["Customers owe you"] == 370 and s["You owe suppliers"] == 300
    recv, pay = r["tables"]
    assert recv["rows"][0][2] == "Aminata" and recv["rows"][0][6] == 0
    assert pay["rows"][0][3] == "INV-9"


def test_pdf_and_excel_downloads(client, auth_headers):
    seed(client, auth_headers)
    client.patch(f"{API}/settings/shop", json={"address": "12 Kissy Road", "phone": "+232 76 000 000"}, headers=auth_headers)
    for kind in ("sales", "profit-loss", "stock", "money-owed"):
        pdf = client.get(f"{API}/reports/{kind}/pdf", params={"date_from": TODAY, "date_to": TODAY}, headers=auth_headers)
        assert pdf.status_code == 200 and pdf.headers["content-type"] == "application/pdf"
        assert pdf.content.startswith(b"%PDF") and len(pdf.content) > 1500
        assert f"bukuma-{kind}-" in pdf.headers["content-disposition"]

        xl = client.get(f"{API}/reports/{kind}/excel", params={"date_from": TODAY, "date_to": TODAY}, headers=auth_headers)
        assert xl.status_code == 200
        wb = load_workbook(BytesIO(xl.content))
        assert wb.sheetnames[0] == "Summary" and len(wb.sheetnames) >= 2
        assert wb["Summary"]["A1"].value == "M.Fenfaquee Enterprise"

    wb = load_workbook(BytesIO(client.get(f"{API}/reports/sales/excel", params={"date_from": TODAY, "date_to": TODAY}, headers=auth_headers).content))
    ws = wb["Sales by product"]
    assert ws["A5"].value == "Product" and ws["E5"].value == "Revenue (NLe)"
    assert ws["A6"].value == "Rice" and ws["E6"].value == 480


def test_empty_period_still_renders(client, auth_headers):
    old = (date.today() - timedelta(days=400)).isoformat()
    for fmt in ("pdf", "excel"):
        res = client.get(f"{API}/reports/sales/{fmt}", params={"date_from": old, "date_to": old}, headers=auth_headers)
        assert res.status_code == 200


def test_report_validation(client, auth_headers):
    bad = client.get(f"{API}/reports/sales", params={"date_from": "2026-02-01", "date_to": "2026-01-01"}, headers=auth_headers)
    assert bad.status_code == 422
    assert client.get(f"{API}/reports/unknown", headers=auth_headers).status_code == 422
    assert client.get(f"{API}/reports/sales").status_code == 401
