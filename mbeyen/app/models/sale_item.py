from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, Money, Quantity


class SaleItem(Base):
    """
    A line on a sale. unit_price and unit_cost are snapshots taken at the time
    of sale, so later price changes never alter past revenue or profit.
    """

    __tablename__ = "sale_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
        CheckConstraint("discount >= 0", name="discount_non_negative"),
        CheckConstraint("line_total >= 0", name="line_total_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    quantity: Mapped[Quantity]
    unit_price: Mapped[Money]  # price actually charged per unit (may differ from list price)
    discount: Mapped[Money] = mapped_column(default=Decimal("0"), server_default="0")
    unit_cost: Mapped[Money]
    line_total: Mapped[Money]  # quantity x unit_price - discount

    @property
    def product_name(self) -> str:
        return self.product.name

    @property
    def product_unit(self) -> str:
        return self.product.unit

    sale: Mapped["Sale"] = relationship(back_populates="items")  # noqa: F821
    product: Mapped["Product"] = relationship()  # noqa: F821

    @property
    def line_profit(self) -> Decimal:
        return self.line_total - self.unit_cost * self.quantity
