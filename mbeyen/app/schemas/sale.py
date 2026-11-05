from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import PaymentStatus, SaleStatus
from app.schemas.common import MoneyIn, MoneyOut, QuantityOut
from app.schemas.payment import InitialPayment, PaymentRead, _not_future

PositiveQuantity = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=3)]


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: PositiveQuantity
    unit_price: MoneyIn | None = None  # omit to use the product's selling price
    discount: MoneyIn = Decimal("0")  # NLe off this line


class SaleCreate(BaseModel):
    sale_date: date = Field(default_factory=date.today)
    customer_name: str | None = Field(default=None, max_length=150)
    items: list[SaleItemCreate] = Field(min_length=1)
    discount: MoneyIn = Decimal("0")  # NLe off the whole sale (on top of line discounts)
    notes: str | None = None
    payment: InitialPayment | None = None  # omit for a fully unpaid (credit) sale

    _check_date = field_validator("sale_date")(_not_future)


class SaleVoid(BaseModel):
    reason: str = Field(min_length=3, max_length=255)


class SaleItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    product_unit: str
    quantity: QuantityOut
    unit_price: MoneyOut
    discount: MoneyOut
    line_total: MoneyOut
    unit_cost: MoneyOut


class SaleSummaryRead(BaseModel):
    """Row in the sales list."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    sale_date: date
    customer_name: str | None
    item_count: int
    total: MoneyOut
    amount_paid: MoneyOut
    balance_due: MoneyOut
    payment_status: PaymentStatus
    status: SaleStatus
    created_at: datetime


class SaleRead(SaleSummaryRead):
    subtotal: MoneyOut
    discount: MoneyOut
    gross_profit: MoneyOut
    void_reason: str | None
    notes: str | None
    items: list[SaleItemRead]
    payments: list[PaymentRead]
