from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.dependencies import CurrentUser, DbSession
from app.models import PaymentStatus, SaleStatus
from app.schemas.payment import PaymentCreate
from app.schemas.sale import SaleCreate, SaleRead, SaleSummaryRead, SaleVoid
from app.services import sales_service
from app.utils.pagination import Page, Pagination, build_page

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=Page[SaleSummaryRead])
def list_sales(
    db: DbSession,
    _: CurrentUser,
    pagination: Pagination,
    date_from: date | None = None,
    date_to: date | None = None,
    status: SaleStatus | None = None,
    payment_status: PaymentStatus | None = None,
    outstanding: Annotated[bool | None, Query(description="Only completed sales with money still owed")] = None,
    search: Annotated[str | None, Query(max_length=100, description="Reference or customer name")] = None,
):
    items, total = sales_service.list_sales(
        db, pagination, date_from=date_from, date_to=date_to, status=status,
        payment_status=payment_status, outstanding=outstanding, search=search,
    )
    return build_page([SaleSummaryRead.model_validate(s) for s in items], total, pagination)


@router.post("", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
def record_sale(data: SaleCreate, db: DbSession, user: CurrentUser):
    return sales_service.create(db, data, user)


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(sale_id: int, db: DbSession, _: CurrentUser):
    return sales_service.get(db, sale_id)


@router.post("/{sale_id}/payments", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
def add_payment(sale_id: int, data: PaymentCreate, db: DbSession, user: CurrentUser):
    """Record money received later for a credit/partly-paid sale."""
    return sales_service.add_payment(db, sale_id, data, user)


@router.post("/{sale_id}/void", response_model=SaleRead)
def void_sale(sale_id: int, data: SaleVoid, db: DbSession, user: CurrentUser):
    """Cancel a wrong sale: stock is returned and it's excluded from reports. Re-enter it correctly."""
    return sales_service.void(db, sale_id, data, user)
