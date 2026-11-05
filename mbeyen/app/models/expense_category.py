from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class ExpenseCategory(TimestampMixin, Base):
    """e.g. Rent, Electricity, Transport, Salaries."""

    __tablename__ = "expense_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)

    expenses: Mapped[list["Expense"]] = relationship(back_populates="category")  # noqa: F821
