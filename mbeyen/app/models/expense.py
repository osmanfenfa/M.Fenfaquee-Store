from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, Money, TimestampMixin, str_enum
from app.models.payment import PaymentMethod


class Expense(TimestampMixin, Base):
    """Operating costs that are not stock purchases (rent, power, transport...)."""

    __tablename__ = "expenses"
    __table_args__ = (CheckConstraint("amount > 0", name="amount_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("expense_categories.id", ondelete="RESTRICT"), index=True
    )
    expense_date: Mapped[date] = mapped_column(Date, index=True)
    amount: Mapped[Money]
    description: Mapped[str] = mapped_column(String(255))
    payment_method: Mapped[PaymentMethod] = mapped_column(str_enum(PaymentMethod))
    reference: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    category: Mapped["ExpenseCategory"] = relationship(back_populates="expenses")  # noqa: F821

    @property
    def category_name(self) -> str:
        return self.category.name
