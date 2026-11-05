from typing import Annotated, Literal

from fastapi import APIRouter, Query, status

from app.dependencies import CurrentUser, DbSession
from app.schemas.inventory import StockMovementRead
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.services import inventory_service, product_service
from app.utils.pagination import Page, Pagination, build_page

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=Page[ProductRead])
def list_products(
    db: DbSession,
    _: CurrentUser,
    pagination: Pagination,
    search: Annotated[str | None, Query(max_length=100)] = None,
    category_id: int | None = None,
    low_stock: bool | None = None,
    is_active: Annotated[bool, Query(description="true (default) for active products, false for archived")] = True,
    sort: Annotated[Literal["name", "stock", "price_desc", "newest"], Query()] = "name",
):
    items, total = product_service.list_products(
        db, pagination, search=search, category_id=category_id, low_stock=low_stock,
        is_active=is_active, sort=sort,
    )
    return build_page([ProductRead.model_validate(p) for p in items], total, pagination)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreate, db: DbSession, user: CurrentUser):
    return product_service.create(db, data, user)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: DbSession, _: CurrentUser):
    return product_service.get(db, product_id)


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(product_id: int, data: ProductUpdate, db: DbSession, user: CurrentUser):
    return product_service.update(db, product_id, data, user)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_product(product_id: int, db: DbSession, user: CurrentUser):
    """Archives the product (it keeps its history). Restore with PATCH is_active=true."""
    product_service.archive(db, product_id, user)


@router.get("/{product_id}/movements", response_model=Page[StockMovementRead])
def product_movements(product_id: int, db: DbSession, _: CurrentUser, pagination: Pagination):
    product_service.get(db, product_id)  # 404 if missing
    items, total = inventory_service.list_movements(db, pagination, product_id=product_id)
    return build_page([StockMovementRead.model_validate(m) for m in items], total, pagination)
