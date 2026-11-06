from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, Money, TimestampMixin, str_enum
from app.database.tenancy import TenantMixin
from app.models.payment import PaymentStatus


class PurchaseStatus(StrEnum):
    ORDERED = "ordered"  # recorded, goods not yet in the shop
    RECEIVED = "received"  # goods received; stock has been added
    CANCELLED = "cancelled"


class Purchase(TenantMixin, TimestampMixin, Base):
    """Stock bought from a supplier. Stock only increases when the purchase is received."""

    __tablename__ = "purchases"
    __table_args__ = (
        UniqueConstraint("shop_id", "reference", name="uq_purchases_shop_reference"),
        CheckConstraint("total >= 0", name="total_non_negative"),
        CheckConstraint("amount_paid >= 0", name="amount_paid_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(30))  # e.g. PUR-20261105-0001
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT"), index=True
    )
    supplier_invoice_no: Mapped[str | None] = mapped_column(String(50))
    purchase_date: Mapped[date] = mapped_column(Date, index=True)

    total: Mapped[Money] = mapped_column(default=Decimal("0"))
    amount_paid: Mapped[Money] = mapped_column(default=Decimal("0"), server_default="0")
    payment_status: Mapped[PaymentStatus] = mapped_column(
        str_enum(PaymentStatus), default=PaymentStatus.UNPAID
    )

    status: Mapped[PurchaseStatus] = mapped_column(
        str_enum(PurchaseStatus), default=PurchaseStatus.ORDERED, index=True
    )
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_reason: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    supplier: Mapped["Supplier | None"] = relationship(back_populates="purchases")  # noqa: F821
    items: Mapped[list["PurchaseItem"]] = relationship(  # noqa: F821
        back_populates="purchase", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(back_populates="purchase")  # noqa: F821

    @property
    def balance_due(self) -> Decimal:
        return self.total - self.amount_paid

    @property
    def supplier_name(self) -> str | None:
        return self.supplier.name if self.supplier else None

    @property
    def item_count(self) -> int:
        return len(self.items)
