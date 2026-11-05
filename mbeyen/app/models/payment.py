from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, Money, str_enum


class PaymentMethod(StrEnum):
    CASH = "cash"
    MOBILE_MONEY = "mobile_money"
    BANK_TRANSFER = "bank_transfer"
    OTHER = "other"


class PaymentStatus(StrEnum):
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"


class Payment(Base):
    """
    A single payment received for a sale, or paid to a supplier for a purchase.
    Exactly one of sale_id / purchase_id is set. The parent record's
    amount_paid is always the sum of its payments.
    """

    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint("(sale_id IS NULL) <> (purchase_id IS NULL)", name="exactly_one_parent"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int | None] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), index=True)
    purchase_id: Mapped[int | None] = mapped_column(
        ForeignKey("purchases.id", ondelete="CASCADE"), index=True
    )
    amount: Mapped[Money]
    method: Mapped[PaymentMethod] = mapped_column(str_enum(PaymentMethod))
    payment_date: Mapped[date] = mapped_column(Date, index=True)
    reference: Mapped[str | None] = mapped_column(String(100))  # e.g. mobile money transaction id
    notes: Mapped[str | None] = mapped_column(Text)

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sale: Mapped["Sale | None"] = relationship(back_populates="payments")  # noqa: F821
    purchase: Mapped["Purchase | None"] = relationship(back_populates="payments")  # noqa: F821
