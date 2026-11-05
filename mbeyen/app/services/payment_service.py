"""
Payments for sales (money in) and purchases (money out to suppliers).
A parent's amount_paid and payment_status are always derived from its payments.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError
from app.models import Payment, PaymentMethod, Purchase, Sale, User
from app.utils.calculations import money, payment_status


def apply_payment(
    db: Session,
    parent: Sale | Purchase,
    *,
    amount: Decimal,
    method: PaymentMethod,
    payment_date: date,
    user: User | None,
    reference: str | None = None,
    notes: str | None = None,
) -> Payment:
    """Add a payment to a sale or purchase. Does NOT commit."""
    amount = money(amount)
    balance = parent.total - parent.amount_paid
    if amount > balance:
        raise BusinessRuleError(f"Payment of {amount} is more than the balance due ({balance})")

    parent_date = parent.sale_date if isinstance(parent, Sale) else parent.purchase_date
    if payment_date < parent_date:
        raise BusinessRuleError("Payment date cannot be before the transaction date")

    payment = Payment(
        sale_id=parent.id if isinstance(parent, Sale) else None,
        purchase_id=parent.id if isinstance(parent, Purchase) else None,
        amount=amount,
        method=method,
        payment_date=payment_date,
        reference=(reference or "").strip() or None,
        notes=notes,
        created_by_id=user.id if user else None,
    )
    db.add(payment)
    parent.payments.append(payment)
    parent.amount_paid = parent.amount_paid + amount
    parent.payment_status = payment_status(parent.total, parent.amount_paid)
    return payment
