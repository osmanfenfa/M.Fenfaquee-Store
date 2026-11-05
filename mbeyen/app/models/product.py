from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, Money, Quantity, TimestampMixin


class Product(TimestampMixin, Base):
    """
    A product sold in a single unit (piece, bag, carton, litre...).

    `stock_quantity` is a running balance. It is ONLY changed by the inventory
    service, which writes a matching StockMovement row in the same transaction,
    so the balance always equals the sum of the product's movements.
    """

    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("cost_price >= 0", name="cost_price_non_negative"),
        CheckConstraint("selling_price >= 0", name="selling_price_non_negative"),
        CheckConstraint("stock_quantity >= 0", name="stock_non_negative"),
        CheckConstraint("reorder_level >= 0", name="reorder_level_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    sku: Mapped[str | None] = mapped_column(String(50), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), index=True
    )
    unit: Mapped[str] = mapped_column(String(20), default="piece", server_default="piece")

    cost_price: Mapped[Money] = mapped_column(default=Decimal("0"), server_default="0")
    selling_price: Mapped[Money] = mapped_column(default=Decimal("0"), server_default="0")
    stock_quantity: Mapped[Quantity] = mapped_column(default=Decimal("0"), server_default="0")
    reorder_level: Mapped[Quantity] = mapped_column(default=Decimal("0"), server_default="0")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    category: Mapped["Category | None"] = relationship(back_populates="products")  # noqa: F821
    stock_movements: Mapped[list["StockMovement"]] = relationship(back_populates="product")  # noqa: F821

    @property
    def is_low_stock(self) -> bool:
        return self.stock_quantity <= self.reorder_level

    @property
    def stock_value(self) -> Decimal:
        """Value of current stock at cost price."""
        return (self.stock_quantity * self.cost_price).quantize(Decimal("0.01"))

    @property
    def category_name(self) -> str | None:
        return self.category.name if self.category else None
