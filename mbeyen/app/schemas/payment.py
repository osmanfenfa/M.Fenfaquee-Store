from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import PaymentMethod
from app.schemas.common import MoneyOut

PositiveMoney = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]


def _not_future(v: date | None) -> date | None:
    if v is not None and v > date.today():
        raise ValueError("Date cannot be in the future")
    return v


class PaymentCreate(BaseModel):
    """A payment added to an existing sale or purchase."""

    amount: PositiveMoney
    method: PaymentMethod = PaymentMethod.CASH
    payment_date: date = Field(default_factory=date.today)
    reference: str | None = Field(default=None, max_length=100)
    notes: str | None = None

    _check_date = field_validator("payment_date")(_not_future)


class InitialPayment(BaseModel):
    """Payment taken at the moment a sale/purchase is recorded (dated the same day)."""

    amount: PositiveMoney
    method: PaymentMethod = PaymentMethod.CASH
    reference: str | None = Field(default=None, max_length=100)


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sale_id: int | None
    purchase_id: int | None
    amount: MoneyOut
    method: PaymentMethod
    payment_date: date
    reference: str | None
    notes: str | None
    created_at: datetime
