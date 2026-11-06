from datetime import date
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import CheckConstraint, Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, Money, TimestampMixin, str_enum
from app.database.tenancy import TenantMixin
from app.models.payment import PaymentStatus


class SaleStatus(StrEnum):
    COMPLETED = "completed"
    VOIDED = "voided"  # cancelled: stock is returned and the sale is excluded from reports


class Sale(TenantMixin, TimestampMixin, Base):
    """A manually recorded sale (not a POS). Customer name is optional free text."""

    __tablename__ = "sales"
    __table_args__ = (
        UniqueConstraint("shop_id", "reference", name="uq_sales_shop_reference"),
        CheckConstraint("discount >= 0", name="discount_non_negative"),
        CheckConstraint("total >= 0", name="total_non_negative"),
        CheckConstraint("amount_paid >= 0", name="amount_paid_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(30))  # e.g. SAL-20261105-0001
    sale_date: Mapped[date] = mapped_column(Date, index=True)
    customer_name: Mapped[str | None] = mapped_column(String(150))

    subtotal: Mapped[Money] = mapped_column(default=Decimal("0"))
    discount: Mapped[Money] = mapped_column(default=Decimal("0"), server_default="0")
    total: Mapped[Money] = mapped_column(default=Decimal("0"))
    amount_paid: Mapped[Money] = mapped_column(default=Decimal("0"), server_default="0")
    payment_status: Mapped[PaymentStatus] = mapped_column(
        str_enum(PaymentStatus), default=PaymentStatus.UNPAID
    )

    status: Mapped[SaleStatus] = mapped_column(
        str_enum(SaleStatus), default=SaleStatus.COMPLETED, index=True
    )
    void_reason: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    items: Mapped[list["SaleItem"]] = relationship(  # noqa: F821
        back_populates="sale", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(back_populates="sale")  # noqa: F821

    @property
    def balance_due(self) -> Decimal:
        return self.total - self.amount_paid

    @property
    def gross_profit(self) -> Decimal:
        """Revenue minus cost of goods sold, after all discounts."""
        return sum((i.line_profit for i in self.items), Decimal("0")) - self.discount

    @property
    def item_count(self) -> int:
        return len(self.items)
