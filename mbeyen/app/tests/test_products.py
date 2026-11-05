API = "/api/v1"


def make_category(client, headers, name="Beverages"):
    res = client.post(f"{API}/categories", json={"name": name}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def make_product(client, headers, **overrides):
    payload = {
        "name": "Coca-Cola 50cl",
        "sku": "cc-50",
        "unit": "Bottle",
        "cost_price": 8.5,
        "selling_price": 12,
        "reorder_level": 10,
        "opening_stock": 24,
    }
    payload.update(overrides)
    res = client.post(f"{API}/products", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


# ---------- categories ----------

def test_category_crud_and_counts(client, auth_headers):
    cat = make_category(client, auth_headers)
    make_product(client, auth_headers, category_id=cat["id"])

    listed = client.get(f"{API}/categories", headers=auth_headers).json()
    assert listed[0]["name"] == "Beverages"
    assert listed[0]["product_count"] == 1

    res = client.patch(f"{API}/categories/{cat['id']}", json={"name": "Drinks"}, headers=auth_headers)
    assert res.json()["name"] == "Drinks"


def test_category_duplicate_name_rejected(client, auth_headers):
    make_category(client, auth_headers, "Snacks")
    res = client.post(f"{API}/categories", json={"name": "snacks"}, headers=auth_headers)
    assert res.status_code == 409


def test_category_with_products_cannot_be_deleted(client, auth_headers):
    cat = make_category(client, auth_headers)
    make_product(client, auth_headers, category_id=cat["id"])
    assert client.delete(f"{API}/categories/{cat['id']}", headers=auth_headers).status_code == 409


def test_empty_category_can_be_deleted(client, auth_headers):
    cat = make_category(client, auth_headers)
    assert client.delete(f"{API}/categories/{cat['id']}", headers=auth_headers).status_code == 204


# ---------- products ----------

def test_create_product_records_opening_stock(client, auth_headers):
    cat = make_category(client, auth_headers)
    p = make_product(client, auth_headers, category_id=cat["id"])
    assert p["sku"] == "CC-50"  # normalised
    assert p["unit"] == "bottle"
    assert p["stock_quantity"] == 24
    assert p["stock_value"] == 204.0  # 24 x 8.50
    assert p["category_name"] == "Beverages"
    assert p["is_low_stock"] is False

    moves = client.get(f"{API}/products/{p['id']}/movements", headers=auth_headers).json()
    assert moves["total"] == 1
    assert moves["items"][0]["movement_type"] == "opening"
    assert moves["items"][0]["quantity_after"] == 24


def test_product_without_opening_stock_has_no_movement(client, auth_headers):
    p = make_product(client, auth_headers, opening_stock=0)
    assert p["is_low_stock"] is True  # 0 <= reorder level
    moves = client.get(f"{API}/products/{p['id']}/movements", headers=auth_headers).json()
    assert moves["total"] == 0


def test_duplicate_name_and_sku_rejected(client, auth_headers):
    make_product(client, auth_headers)
    dup_name = client.post(f"{API}/products", json={"name": "coca-cola 50CL"}, headers=auth_headers)
    assert dup_name.status_code == 409
    dup_sku = client.post(f"{API}/products", json={"name": "Other", "sku": "CC-50"}, headers=auth_headers)
    assert dup_sku.status_code == 409


def test_negative_price_rejected(client, auth_headers):
    res = client.post(f"{API}/products", json={"name": "Bad", "selling_price": -1}, headers=auth_headers)
    assert res.status_code == 422


def test_unknown_category_rejected(client, auth_headers):
    res = client.post(f"{API}/products", json={"name": "X", "category_id": 999}, headers=auth_headers)
    assert res.status_code == 404


def test_update_cannot_change_stock(client, auth_headers):
    p = make_product(client, auth_headers)
    res = client.patch(
        f"{API}/products/{p['id']}",
        json={"selling_price": 13, "stock_quantity": 999},
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["selling_price"] == 13
    assert res.json()["stock_quantity"] == 24


def test_update_category_reflected(client, auth_headers):
    a = make_category(client, auth_headers, "A")
    b = make_category(client, auth_headers, "B")
    p = make_product(client, auth_headers, category_id=a["id"])
    res = client.patch(f"{API}/products/{p['id']}", json={"category_id": b["id"]}, headers=auth_headers)
    assert res.json()["category_name"] == "B"


def test_list_search_filter_and_pagination(client, auth_headers):
    make_product(client, auth_headers, name="Rice 25kg", sku="RICE25", opening_stock=2, reorder_level=5)
    make_product(client, auth_headers, name="Sugar 1kg", sku="SUG1", opening_stock=50, reorder_level=5)
    make_product(client, auth_headers, name="Rice 50kg", sku="RICE50", opening_stock=20, reorder_level=5)

    rice = client.get(f"{API}/products", params={"search": "rice"}, headers=auth_headers).json()
    assert rice["total"] == 2

    low = client.get(f"{API}/products", params={"low_stock": True}, headers=auth_headers).json()
    assert [p["name"] for p in low["items"]] == ["Rice 25kg"]

    page = client.get(f"{API}/products", params={"page_size": 2, "page": 2}, headers=auth_headers).json()
    assert page["total"] == 3 and page["pages"] == 2 and len(page["items"]) == 1


def test_sorting(client, auth_headers):
    make_product(client, auth_headers, name="B", sku="B", opening_stock=5, selling_price=1)
    make_product(client, auth_headers, name="A", sku="A", opening_stock=50, selling_price=9)
    make_product(client, auth_headers, name="C", sku="C", opening_stock=1, selling_price=5)

    def names(sort):
        res = client.get(f"{API}/products", params={"sort": sort}, headers=auth_headers).json()
        return [p["name"] for p in res["items"]]

    assert names("name") == ["A", "B", "C"]
    assert names("stock") == ["C", "B", "A"]
    assert names("price_desc") == ["A", "C", "B"]
    assert client.get(f"{API}/products", params={"sort": "bogus"}, headers=auth_headers).status_code == 422


def test_archive_and_restore(client, auth_headers):
    p = make_product(client, auth_headers)
    assert client.delete(f"{API}/products/{p['id']}", headers=auth_headers).status_code == 204
    assert client.get(f"{API}/products", headers=auth_headers).json()["total"] == 0
    archived = client.get(f"{API}/products", params={"is_active": False}, headers=auth_headers).json()
    assert archived["total"] == 1

    res = client.patch(f"{API}/products/{p['id']}", json={"is_active": True}, headers=auth_headers)
    assert res.json()["is_active"] is True


def test_products_require_auth(client):
    assert client.get(f"{API}/products").status_code == 401
