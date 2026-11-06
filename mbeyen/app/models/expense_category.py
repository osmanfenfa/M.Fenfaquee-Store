from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.database.tenancy import TenantMixin


class ExpenseCategory(TenantMixin, TimestampMixin, Base):
    """e.g. Rent, Electricity, Transport, Salaries."""

    __tablename__ = "expense_categories"
    __table_args__ = (UniqueConstraint("shop_id", "name", name="uq_expense_categories_shop_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))

    expenses: Mapped[list["Expense"]] = relationship(back_populates="category")  # noqa: F821
