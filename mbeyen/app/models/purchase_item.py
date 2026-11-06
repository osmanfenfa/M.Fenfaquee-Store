from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, Money, Quantity
from app.database.tenancy import TenantMixin


class PurchaseItem(TenantMixin, Base):
    __tablename__ = "purchase_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_cost >= 0", name="unit_cost_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_id: Mapped[int] = mapped_column(ForeignKey("purchases.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    quantity: Mapped[Quantity]
    unit_cost: Mapped[Money]
    line_total: Mapped[Money]

    purchase: Mapped["Purchase"] = relationship(back_populates="items")  # noqa: F821
    product: Mapped["Product"] = relationship()  # noqa: F821

    @property
    def product_name(self) -> str:
        return self.product.name

    @property
    def product_unit(self) -> str:
        return self.product.unit
