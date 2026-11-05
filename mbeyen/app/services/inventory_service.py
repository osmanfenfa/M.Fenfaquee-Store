"""
The ONLY place where product stock changes.

Every change goes through `record_movement`, which updates the product's
running balance and writes a StockMovement in the same transaction. Sales and
purchases call it too, so stock, sales and purchases always agree.
"""

from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models import MovementType, Product, StockMovement, User
from app.schemas.inventory import InventorySummary, StockAdjustmentCreate
from app.services import audit_service
from app.utils.pagination import PageParams, paginate


def _lock_product(db: Session, product_id: int) -> Product:
    """Load a product with a row lock so two simultaneous changes can't corrupt the balance."""
    product = db.scalar(select(Product).where(Product.id == product_id).with_for_update())
    if product is None:
        raise NotFoundError(f"Product {product_id} not found")
    return product


def record_movement(
    db: Session,
    *,
    product_id: int,
    quantity_change: Decimal,
    movement_type: MovementType,
    user: User | None,
    unit_cost: Decimal | None = None,
    sale_id: int | None = None,
    purchase_id: int | None = None,
    reason: str | None = None,
) -> StockMovement:
    """Apply a stock change. Does NOT commit — the caller owns the transaction."""
    product = _lock_product(db, product_id)
    new_quantity = product.stock_quantity + quantity_change
    if new_quantity < 0:
        raise BusinessRuleError(
            f"Not enough stock for '{product.name}': "
            f"{product.stock_quantity.normalize():f} {product.unit} available, "
            f"{(-quantity_change).normalize():f} requested"
        )
    product.stock_quantity = new_quantity
    movement = StockMovement(
        product_id=product.id,
        movement_type=movement_type,
        quantity_change=quantity_change,
        quantity_after=new_quantity,
        unit_cost=unit_cost,
        sale_id=sale_id,
        purchase_id=purchase_id,
        reason=reason,
        created_by_id=user.id if user else None,
    )
    db.add(movement)
    return movement


def adjust_stock(db: Session, data: StockAdjustmentCreate, user: User) -> StockMovement:
    product = _lock_product(db, data.product_id)
    if data.counted_quantity is not None:
        change = data.counted_quantity - product.stock_quantity
        if change == 0:
            raise BusinessRuleError("Counted quantity matches recorded stock — no adjustment needed")
    else:
        change = data.quantity_change  # type: ignore[assignment]

    movement = record_movement(
        db,
        product_id=product.id,
        quantity_change=change,
        movement_type=MovementType.ADJUSTMENT,
        user=user,
        unit_cost=product.cost_price,
        reason=data.reason.strip(),
    )
    audit_service.log(
        db, user, "stock_adjustment", "product", product.id,
        {"change": change, "new_quantity": movement.quantity_after, "reason": data.reason},
    )
    db.commit()
    db.refresh(movement)
    return movement


def list_movements(
    db: Session,
    params: PageParams,
    *,
    product_id: int | None = None,
    movement_type: MovementType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[list[StockMovement], int]:
    stmt = select(StockMovement).options(joinedload(StockMovement.product))
    if product_id is not None:
        stmt = stmt.where(StockMovement.product_id == product_id)
    if movement_type is not None:
        stmt = stmt.where(StockMovement.movement_type == movement_type)
    if date_from is not None:
        stmt = stmt.where(StockMovement.created_at >= datetime.combine(date_from, time.min))
    if date_to is not None:
        stmt = stmt.where(StockMovement.created_at <= datetime.combine(date_to, time.max))
    stmt = stmt.order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
    return paginate(db, stmt, params)


def low_stock_products(db: Session) -> list[Product]:
    stmt = (
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.is_active.is_(True), Product.stock_quantity <= Product.reorder_level)
        .order_by(Product.stock_quantity, Product.name)
    )
    return list(db.scalars(stmt))


def summary(db: Session) -> InventorySummary:
    row = db.execute(
        select(
            func.count(Product.id),
            func.coalesce(func.sum(case((Product.stock_quantity <= Product.reorder_level, 1), else_=0)), 0),
            func.coalesce(func.sum(case((Product.stock_quantity <= 0, 1), else_=0)), 0),
            func.coalesce(func.sum(Product.stock_quantity * Product.cost_price), 0),
            func.coalesce(func.sum(Product.stock_quantity * Product.selling_price), 0),
        ).where(Product.is_active.is_(True))
    ).one()
    two_dp = Decimal("0.01")
    return InventorySummary(
        active_products=row[0],
        low_stock_count=row[1],
        out_of_stock_count=row[2],
        stock_value_cost=Decimal(row[3]).quantize(two_dp),
        stock_value_retail=Decimal(row[4]).quantize(two_dp),
    )
