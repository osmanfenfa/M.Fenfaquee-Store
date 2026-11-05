from typing import Annotated

from fastapi import APIRouter, Query, status

from app.dependencies import CurrentUser, DbSession
from app.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate
from app.services import supplier_service
from app.utils.pagination import Page, Pagination, build_page

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=Page[SupplierRead])
def list_suppliers(
    db: DbSession,
    _: CurrentUser,
    pagination: Pagination,
    search: Annotated[str | None, Query(max_length=100)] = None,
    is_active: bool = True,
):
    items, total = supplier_service.list_suppliers(db, pagination, search=search, is_active=is_active)
    return build_page(supplier_service.to_read_many(db, items), total, pagination)


@router.post("", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
def create_supplier(data: SupplierCreate, db: DbSession, _: CurrentUser):
    return supplier_service.to_read(db, supplier_service.create(db, data))


@router.get("/{supplier_id}", response_model=SupplierRead)
def get_supplier(supplier_id: int, db: DbSession, _: CurrentUser):
    return supplier_service.to_read(db, supplier_service.get(db, supplier_id))


@router.patch("/{supplier_id}", response_model=SupplierRead)
def update_supplier(supplier_id: int, data: SupplierUpdate, db: DbSession, _: CurrentUser):
    return supplier_service.to_read(db, supplier_service.update(db, supplier_id, data))


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_supplier(supplier_id: int, db: DbSession, user: CurrentUser):
    """Archives the supplier (history kept). Restore with PATCH is_active=true."""
    supplier_service.archive(db, supplier_id, user)
