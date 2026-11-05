from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.dependencies import CurrentUser, DbSession
from app.models import PaymentStatus, PurchaseStatus
from app.schemas.payment import PaymentCreate
from app.schemas.purchase import PurchaseCancel, PurchaseCreate, PurchaseRead, PurchaseSummaryRead
from app.services import purchase_service
from app.utils.pagination import Page, Pagination, build_page

router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.get("", response_model=Page[PurchaseSummaryRead])
def list_purchases(
    db: DbSession,
    _: CurrentUser,
    pagination: Pagination,
    date_from: date | None = None,
    date_to: date | None = None,
    supplier_id: int | None = None,
    status: PurchaseStatus | None = None,
    payment_status: PaymentStatus | None = None,
    outstanding: Annotated[bool | None, Query(description="Only purchases with money still owed to suppliers")] = None,
    search: Annotated[str | None, Query(max_length=100, description="Reference, invoice no. or supplier")] = None,
):
    items, total = purchase_service.list_purchases(
        db, pagination, date_from=date_from, date_to=date_to, supplier_id=supplier_id,
        status=status, payment_status=payment_status, outstanding=outstanding, search=search,
    )
    return build_page([PurchaseSummaryRead.model_validate(p) for p in items], total, pagination)


@router.post("", response_model=PurchaseRead, status_code=status.HTTP_201_CREATED)
def record_purchase(data: PurchaseCreate, db: DbSession, user: CurrentUser):
    """Record a purchase. Default status 'received' adds stock immediately."""
    return purchase_service.create(db, data, user)


@router.get("/{purchase_id}", response_model=PurchaseRead)
def get_purchase(purchase_id: int, db: DbSession, _: CurrentUser):
    return purchase_service.get(db, purchase_id)


@router.post("/{purchase_id}/receive", response_model=PurchaseRead)
def receive_purchase(purchase_id: int, db: DbSession, user: CurrentUser):
    """Mark an ordered purchase as received — adds the stock."""
    return purchase_service.receive(db, purchase_id, user)


@router.post("/{purchase_id}/payments", response_model=PurchaseRead, status_code=status.HTTP_201_CREATED)
def add_payment(purchase_id: int, data: PaymentCreate, db: DbSession, user: CurrentUser):
    """Record money paid to the supplier."""
    return purchase_service.add_payment(db, purchase_id, data, user)


@router.post("/{purchase_id}/cancel", response_model=PurchaseRead)
def cancel_purchase(purchase_id: int, data: PurchaseCancel, db: DbSession, user: CurrentUser):
    """Cancel a wrong purchase (removes its stock if received). Re-enter it correctly."""
    return purchase_service.cancel(db, purchase_id, data, user)
