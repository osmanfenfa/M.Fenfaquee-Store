from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, Money, Quantity, str_enum
from app.database.tenancy import TenantMixin


class MovementType(StrEnum):
    OPENING = "opening"  # initial stock when a product is first recorded
    PURCHASE = "purchase"  # stock received from a supplier
    SALE = "sale"  # stock sold
    SALE_VOID = "sale_void"  # stock returned because a sale was voided
    PURCHASE_CANCEL = "purchase_cancel"  # stock removed because a received purchase was cancelled
    ADJUSTMENT = "adjustment"  # manual correction (count, damage, expiry...)


class StockMovement(TenantMixin, Base):
    """
    Immutable ledger of every stock change. Never updated or deleted —
    mistakes are corrected with a new movement.
    """

    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    movement_type: Mapped[MovementType] = mapped_column(str_enum(MovementType))
    quantity_change: Mapped[Quantity]  # positive = in, negative = out
    quantity_after: Mapped[Quantity]  # product balance after this movement
    unit_cost: Mapped[Money | None]

    sale_id: Mapped[int | None] = mapped_column(ForeignKey("sales.id", ondelete="RESTRICT"), index=True)
    purchase_id: Mapped[int | None] = mapped_column(
        ForeignKey("purchases.id", ondelete="RESTRICT"), index=True
    )
    reason: Mapped[str | None] = mapped_column(String(255))

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    product: Mapped["Product"] = relationship(back_populates="stock_movements")  # noqa: F821

    @property
    def product_name(self) -> str:
        return self.product.name

    @property
    def product_unit(self) -> str:
        return self.product.unit
