"""
Purchases of stock from suppliers.

- Recorded as RECEIVED by default (stock added immediately), or ORDERED and
  received later.
- Receiving updates each product's cost price to the weighted average cost.
- Corrections: cancel (stock removed again — blocked if it was already sold)
  and re-enter.
"""

from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models import (
    MovementType,
    PaymentStatus,
    Product,
    Purchase,
    PurchaseItem,
    PurchaseStatus,
    Supplier,
    User,
)
from app.schemas.payment import PaymentCreate
from app.schemas.purchase import NewPurchaseStatus, PurchaseCancel, PurchaseCreate
from app.services import audit_service, inventory_service, payment_service
from app.utils.calculations import money, payment_status
from app.utils.pagination import PageParams, paginate
from app.utils.references import next_reference

_LOAD = (
    selectinload(Purchase.items).selectinload(PurchaseItem.product),
    selectinload(Purchase.payments),
    selectinload(Purchase.supplier),
)


def weighted_average_cost(
    current_qty: Decimal, current_cost: Decimal, added_qty: Decimal, added_cost: Decimal
) -> Decimal:
    """Blend the value of stock on hand with newly received stock."""
    if current_qty <= 0:
        return money(added_cost)
    total_qty = current_qty + added_qty
    return money((current_qty * current_cost + added_qty * added_cost) / total_qty)


def get(db: Session, purchase_id: int) -> Purchase:
    purchase = db.scalar(
        select(Purchase)
        .options(*_LOAD)
        .where(Purchase.id == purchase_id)
        .execution_options(populate_existing=True)
    )
    if purchase is None:
        raise NotFoundError(f"Purchase {purchase_id} not found")
    return purchase


def list_purchases(
    db: Session,
    params: PageParams,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    supplier_id: int | None = None,
    status: PurchaseStatus | None = None,
    payment_status: PaymentStatus | None = None,
    outstanding: bool | None = None,
    search: str | None = None,
) -> tuple[list[Purchase], int]:
    stmt = select(Purchase).options(selectinload(Purchase.items), selectinload(Purchase.supplier))
    if date_from:
        stmt = stmt.where(Purchase.purchase_date >= date_from)
    if date_to:
        stmt = stmt.where(Purchase.purchase_date <= date_to)
    if supplier_id:
        stmt = stmt.where(Purchase.supplier_id == supplier_id)
    if status:
        stmt = stmt.where(Purchase.status == status)
    if payment_status:
        stmt = stmt.where(Purchase.payment_status == payment_status)
    if outstanding:
        stmt = stmt.where(
            Purchase.status != PurchaseStatus.CANCELLED, Purchase.payment_status != PaymentStatus.PAID
        )
    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.outerjoin(Supplier, Purchase.supplier_id == Supplier.id).where(
            or_(
                func.lower(Purchase.reference).like(term),
                func.lower(Purchase.supplier_invoice_no).like(term),
                func.lower(Supplier.name).like(term),
            )
        )
    stmt = stmt.order_by(Purchase.purchase_date.desc(), Purchase.id.desc())
    return paginate(db, stmt, params)


def _receive_items(db: Session, purchase: Purchase, user: User) -> None:
    """Add each line's stock and update weighted average cost."""
    for item in purchase.items:
        product = db.get(Product, item.product_id)
        product.cost_price = weighted_average_cost(
            product.stock_quantity, product.cost_price, item.quantity, item.unit_cost
        )
        inventory_service.record_movement(
            db,
            product_id=item.product_id,
            quantity_change=item.quantity,
            movement_type=MovementType.PURCHASE,
            user=user,
            unit_cost=item.unit_cost,
            purchase_id=purchase.id,
            reason=purchase.reference,
        )
    purchase.status = PurchaseStatus.RECEIVED
    purchase.received_at = datetime.now(UTC)


def create(db: Session, data: PurchaseCreate, user: User) -> Purchase:
    if data.supplier_id is not None:
        supplier = db.get(Supplier, data.supplier_id)
        if supplier is None:
            raise NotFoundError(f"Supplier {data.supplier_id} not found")
        if not supplier.is_active:
            raise BusinessRuleError(f"Supplier '{supplier.name}' is archived")

    purchase = Purchase(
        reference=next_reference(db, Purchase.reference, "PUR", data.purchase_date),
        supplier_id=data.supplier_id,
        supplier_invoice_no=(data.supplier_invoice_no or "").strip() or None,
        purchase_date=data.purchase_date,
        status=PurchaseStatus.ORDERED,
        notes=data.notes,
        created_by_id=user.id,
    )
    db.add(purchase)

    total = Decimal("0")
    for line in data.items:
        product = db.get(Product, line.product_id)
        if product is None:
            raise NotFoundError(f"Product {line.product_id} not found")
        if not product.is_active:
            raise BusinessRuleError(f"'{product.name}' is archived — restore it before purchasing")

        line_total = money(line.quantity * line.unit_cost)
        total += line_total
        purchase.items.append(
            PurchaseItem(
                product_id=product.id,
                quantity=line.quantity,
                unit_cost=line.unit_cost,
                line_total=line_total,
            )
        )
        if line.new_selling_price is not None and line.new_selling_price != product.selling_price:
            audit_service.log(
                db, user, "update", "product", product.id,
                {"selling_price": f"{product.selling_price} -> {line.new_selling_price} (via purchase)"},
            )
            product.selling_price = line.new_selling_price

    purchase.total = total
    purchase.amount_paid = Decimal("0")
    purchase.payment_status = payment_status(total, Decimal("0"))
    db.flush()

    if data.status == NewPurchaseStatus.RECEIVED:
        _receive_items(db, purchase, user)

    if data.payment:
        payment_service.apply_payment(
            db, purchase,
            amount=data.payment.amount,
            method=data.payment.method,
            payment_date=data.purchase_date,
            reference=data.payment.reference,
            user=user,
        )

    if purchase.payment_status != PaymentStatus.PAID and purchase.supplier_id is None:
        raise BusinessRuleError("Choose a supplier when the purchase is not fully paid")

    db.commit()
    return get(db, purchase.id)


def receive(db: Session, purchase_id: int, user: User) -> Purchase:
    purchase = get(db, purchase_id)
    if purchase.status != PurchaseStatus.ORDERED:
        raise BusinessRuleError(f"Only ordered purchases can be received (this one is {purchase.status})")
    for item in purchase.items:
        if not item.product.is_active:
            raise BusinessRuleError(f"'{item.product.name}' is archived — restore it before receiving")
    _receive_items(db, purchase, user)
    db.commit()
    return get(db, purchase.id)


def add_payment(db: Session, purchase_id: int, data: PaymentCreate, user: User) -> Purchase:
    purchase = get(db, purchase_id)
    if purchase.status == PurchaseStatus.CANCELLED:
        raise BusinessRuleError("Cannot add a payment to a cancelled purchase")
    if purchase.payment_status == PaymentStatus.PAID:
        raise BusinessRuleError("This purchase is already fully paid")
    payment_service.apply_payment(
        db, purchase,
        amount=data.amount,
        method=data.method,
        payment_date=data.payment_date,
        reference=data.reference,
        notes=data.notes,
        user=user,
    )
    db.commit()
    return get(db, purchase.id)


def cancel(db: Session, purchase_id: int, data: PurchaseCancel, user: User) -> Purchase:
    purchase = get(db, purchase_id)
    if purchase.status == PurchaseStatus.CANCELLED:
        raise BusinessRuleError("This purchase is already cancelled")

    if purchase.status == PurchaseStatus.RECEIVED:
        for item in purchase.items:
            product = db.get(Product, item.product_id)
            remaining = product.stock_quantity - item.quantity
            # Undo this purchase's effect on average cost where that still makes sense
            if remaining > 0:
                reversed_cost = (product.stock_quantity * product.cost_price - item.quantity * item.unit_cost) / remaining
                if reversed_cost >= 0:
                    product.cost_price = money(reversed_cost)
            inventory_service.record_movement(  # raises if the stock was already sold
                db,
                product_id=item.product_id,
                quantity_change=-item.quantity,
                movement_type=MovementType.PURCHASE_CANCEL,
                user=user,
                unit_cost=item.unit_cost,
                purchase_id=purchase.id,
                reason=f"Cancel {purchase.reference}: {data.reason}",
            )

    purchase.status = PurchaseStatus.CANCELLED
    purchase.cancel_reason = data.reason.strip()
    audit_service.log(
        db, user, "cancel", "purchase", purchase.id,
        {"reference": purchase.reference, "total": purchase.total, "amount_paid": purchase.amount_paid, "reason": data.reason},
    )
    db.commit()
    return get(db, purchase.id)
