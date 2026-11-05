"""
Manual sales records.

Recording a sale, in ONE transaction:
  1. price each line (default = product selling price), apply line discounts
  2. reduce stock via inventory_service (blocked if not enough stock)
  3. snapshot unit cost for profit reporting
  4. record the initial payment, if any (credit sales allowed)

Mistakes are corrected by voiding (stock returned) and re-entering.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models import (
    MovementType,
    PaymentStatus,
    Product,
    Sale,
    SaleItem,
    SaleStatus,
    User,
)
from app.schemas.payment import PaymentCreate
from app.schemas.sale import SaleCreate, SaleVoid
from app.services import audit_service, inventory_service, payment_service
from app.utils.calculations import money, payment_status
from app.utils.pagination import PageParams, paginate
from app.utils.references import next_reference

_LOAD = (
    selectinload(Sale.items).selectinload(SaleItem.product),
    selectinload(Sale.payments),
)


def get(db: Session, sale_id: int) -> Sale:
    sale = db.scalar(
        select(Sale).options(*_LOAD).where(Sale.id == sale_id).execution_options(populate_existing=True)
    )
    if sale is None:
        raise NotFoundError(f"Sale {sale_id} not found")
    return sale


def list_sales(
    db: Session,
    params: PageParams,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    status: SaleStatus | None = None,
    payment_status: PaymentStatus | None = None,
    outstanding: bool | None = None,
    search: str | None = None,
) -> tuple[list[Sale], int]:
    stmt = select(Sale).options(selectinload(Sale.items))
    if date_from:
        stmt = stmt.where(Sale.sale_date >= date_from)
    if date_to:
        stmt = stmt.where(Sale.sale_date <= date_to)
    if status:
        stmt = stmt.where(Sale.status == status)
    if payment_status:
        stmt = stmt.where(Sale.payment_status == payment_status)
    if outstanding:
        stmt = stmt.where(Sale.status == SaleStatus.COMPLETED, Sale.payment_status != PaymentStatus.PAID)
    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(func.lower(Sale.reference).like(term), func.lower(Sale.customer_name).like(term))
        )
    stmt = stmt.order_by(Sale.sale_date.desc(), Sale.id.desc())
    return paginate(db, stmt, params)


def create(db: Session, data: SaleCreate, user: User) -> Sale:
    customer = (data.customer_name or "").strip() or None

    sale = Sale(
        reference=next_reference(db, Sale.reference, "SAL", data.sale_date),
        sale_date=data.sale_date,
        customer_name=customer,
        notes=data.notes,
        created_by_id=user.id,
        status=SaleStatus.COMPLETED,
    )
    db.add(sale)

    subtotal = Decimal("0")
    for line in data.items:
        product = db.get(Product, line.product_id)
        if product is None:
            raise NotFoundError(f"Product {line.product_id} not found")
        if not product.is_active:
            raise BusinessRuleError(f"'{product.name}' is archived and cannot be sold")

        unit_price = line.unit_price if line.unit_price is not None else product.selling_price
        gross = money(line.quantity * unit_price)
        if line.discount > gross:
            raise BusinessRuleError(f"Discount on '{product.name}' is more than the line amount ({gross})")
        line_total = gross - line.discount
        subtotal += line_total

        sale.items.append(
            SaleItem(
                product_id=product.id,
                quantity=line.quantity,
                unit_price=unit_price,
                discount=line.discount,
                unit_cost=product.cost_price,
                line_total=line_total,
            )
        )

    if data.discount > subtotal:
        raise BusinessRuleError(f"Sale discount is more than the subtotal ({subtotal})")

    sale.subtotal = subtotal
    sale.discount = data.discount
    sale.total = subtotal - data.discount
    sale.amount_paid = Decimal("0")
    sale.payment_status = payment_status(sale.total, Decimal("0"))
    db.flush()  # sale.id needed for stock movements and payments

    for item in sale.items:
        inventory_service.record_movement(
            db,
            product_id=item.product_id,
            quantity_change=-item.quantity,
            movement_type=MovementType.SALE,
            user=user,
            unit_cost=item.unit_cost,
            sale_id=sale.id,
            reason=sale.reference,
        )

    if data.payment:
        payment_service.apply_payment(
            db, sale,
            amount=data.payment.amount,
            method=data.payment.method,
            payment_date=data.sale_date,
            reference=data.payment.reference,
            user=user,
        )

    if sale.payment_status != PaymentStatus.PAID and not customer:
        raise BusinessRuleError("Customer name is required when a sale is not fully paid")

    db.commit()
    return get(db, sale.id)


def add_payment(db: Session, sale_id: int, data: PaymentCreate, user: User) -> Sale:
    sale = get(db, sale_id)
    if sale.status == SaleStatus.VOIDED:
        raise BusinessRuleError("Cannot add a payment to a voided sale")
    if sale.payment_status == PaymentStatus.PAID:
        raise BusinessRuleError("This sale is already fully paid")
    payment_service.apply_payment(
        db, sale,
        amount=data.amount,
        method=data.method,
        payment_date=data.payment_date,
        reference=data.reference,
        notes=data.notes,
        user=user,
    )
    db.commit()
    return get(db, sale.id)


def void(db: Session, sale_id: int, data: SaleVoid, user: User) -> Sale:
    """
    Cancel a sale: stock is returned and the sale is excluded from reports.
    Any payments stay on record (shown as refunded/cancelled with the sale).
    """
    sale = get(db, sale_id)
    if sale.status == SaleStatus.VOIDED:
        raise BusinessRuleError("This sale is already voided")

    for item in sale.items:
        inventory_service.record_movement(
            db,
            product_id=item.product_id,
            quantity_change=item.quantity,
            movement_type=MovementType.SALE_VOID,
            user=user,
            unit_cost=item.unit_cost,
            sale_id=sale.id,
            reason=f"Void {sale.reference}: {data.reason}",
        )
    sale.status = SaleStatus.VOIDED
    sale.void_reason = data.reason.strip()
    audit_service.log(
        db, user, "void", "sale", sale.id,
        {"reference": sale.reference, "total": sale.total, "amount_paid": sale.amount_paid, "reason": data.reason},
    )
    db.commit()
    return get(db, sale.id)
