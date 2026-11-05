from app.tests.test_products import API


def test_settings_defaults_and_update(client, auth_headers):
    s = client.get(f"{API}/settings/shop", headers=auth_headers).json()
    assert s["shop_name"] == "M.Fenfaquee Enterprise" and s["currency"] == "NLe"
    assert s["receipt_note"]

    res = client.patch(
        f"{API}/settings/shop",
        json={"address": " 12 Kissy Road, Freetown ", "phone": "+232 76 000 000", "receipt_note": ""},
        headers=auth_headers,
    )
    body = res.json()
    assert body["address"] == "12 Kissy Road, Freetown"
    assert body["phone"] == "+232 76 000 000"
    assert body["receipt_note"] is None
    assert body["shop_name"] == "M.Fenfaquee Enterprise"  # untouched


def test_settings_require_auth(client):
    assert client.get(f"{API}/settings/shop").status_code == 401
