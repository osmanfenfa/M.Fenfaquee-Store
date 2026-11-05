from decimal import ROUND_HALF_UP, Decimal

from app.models import PaymentStatus

CENT = Decimal("0.01")


def money(value: Decimal | int | float | str) -> Decimal:
    """Round to 2 decimal places, half-up (how people expect cash to round)."""
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def payment_status(total: Decimal, paid: Decimal) -> PaymentStatus:
    if paid <= 0:
        return PaymentStatus.PAID if total == 0 else PaymentStatus.UNPAID
    if paid >= total:
        return PaymentStatus.PAID
    return PaymentStatus.PARTIAL
