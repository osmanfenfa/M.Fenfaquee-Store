from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import PaymentMethod
from app.schemas.common import MoneyOut
from app.schemas.payment import PositiveMoney, _not_future


# ---------- expense categories ----------

class ExpenseCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class ExpenseCategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    expense_count: int = 0


# ---------- expenses ----------

class ExpenseCreate(BaseModel):
    category_id: int
    expense_date: date = Field(default_factory=date.today)
    amount: PositiveMoney
    description: str = Field(min_length=1, max_length=255)
    payment_method: PaymentMethod = PaymentMethod.CASH
    reference: str | None = Field(default=None, max_length=100)
    notes: str | None = None

    _check_date = field_validator("expense_date")(_not_future)


class ExpenseUpdate(BaseModel):
    category_id: int | None = None
    expense_date: date | None = None
    amount: PositiveMoney | None = None
    description: str | None = Field(default=None, min_length=1, max_length=255)
    payment_method: PaymentMethod | None = None
    reference: str | None = Field(default=None, max_length=100)
    notes: str | None = None

    _check_date = field_validator("expense_date")(_not_future)


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    category_name: str
    expense_date: date
    amount: MoneyOut
    description: str
    payment_method: PaymentMethod
    reference: str | None
    notes: str | None
    created_at: datetime


class ExpenseCategoryTotal(BaseModel):
    category_id: int
    category_name: str
    total: MoneyOut
    count: int


class ExpenseSummary(BaseModel):
    date_from: date
    date_to: date
    total: MoneyOut
    count: int
    by_category: list[ExpenseCategoryTotal]
