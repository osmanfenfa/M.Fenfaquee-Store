from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import PaymentStatus, PurchaseStatus
from app.schemas.common import MoneyIn, MoneyOut, QuantityOut
from app.schemas.payment import InitialPayment, PaymentRead, _not_future

PositiveQuantity = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=3)]


class NewPurchaseStatus(StrEnum):
    RECEIVED = "received"
    ORDERED = "ordered"


class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: PositiveQuantity
    unit_cost: MoneyIn
    new_selling_price: MoneyIn | None = None  # optionally update the product's selling price


class PurchaseCreate(BaseModel):
    supplier_id: int | None = None
    supplier_invoice_no: str | None = Field(default=None, max_length=50)
    purchase_date: date = Field(default_factory=date.today)
    status: NewPurchaseStatus = NewPurchaseStatus.RECEIVED
    items: list[PurchaseItemCreate] = Field(min_length=1)
    notes: str | None = None
    payment: InitialPayment | None = None

    _check_date = field_validator("purchase_date")(_not_future)


class PurchaseCancel(BaseModel):
    reason: str = Field(min_length=3, max_length=255)


class PurchaseItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    product_unit: str
    quantity: QuantityOut
    unit_cost: MoneyOut
    line_total: MoneyOut


class PurchaseSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    supplier_id: int | None
    supplier_name: str | None
    supplier_invoice_no: str | None
    purchase_date: date
    item_count: int
    total: MoneyOut
    amount_paid: MoneyOut
    balance_due: MoneyOut
    payment_status: PaymentStatus
    status: PurchaseStatus
    created_at: datetime


class PurchaseRead(PurchaseSummaryRead):
    received_at: datetime | None
    cancel_reason: str | None
    notes: str | None
    items: list[PurchaseItemRead]
    payments: list[PaymentRead]
