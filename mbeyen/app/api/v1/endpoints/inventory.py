from datetime import date

from fastapi import APIRouter, status

from app.dependencies import CurrentUser, DbSession
from app.models import MovementType
from app.schemas.inventory import InventorySummary, StockAdjustmentCreate, StockMovementRead
from app.schemas.product import ProductRead
from app.services import inventory_service
from app.utils.pagination import Page, Pagination, build_page

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/summary", response_model=InventorySummary)
def inventory_summary(db: DbSession, _: CurrentUser):
    return inventory_service.summary(db)


@router.get("/low-stock", response_model=list[ProductRead])
def low_stock(db: DbSession, _: CurrentUser):
    return inventory_service.low_stock_products(db)


@router.get("/movements", response_model=Page[StockMovementRead])
def list_movements(
    db: DbSession,
    _: CurrentUser,
    pagination: Pagination,
    product_id: int | None = None,
    movement_type: MovementType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    items, total = inventory_service.list_movements(
        db, pagination, product_id=product_id, movement_type=movement_type,
        date_from=date_from, date_to=date_to,
    )
    return build_page([StockMovementRead.model_validate(m) for m in items], total, pagination)


@router.post("/adjustments", response_model=StockMovementRead, status_code=status.HTTP_201_CREATED)
def adjust_stock(data: StockAdjustmentCreate, db: DbSession, user: CurrentUser):
    """Correct stock after a count, damage, expiry or loss. A reason is required."""
    return inventory_service.adjust_stock(db, data, user)
