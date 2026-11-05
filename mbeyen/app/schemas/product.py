from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import MoneyIn, MoneyOut, QuantityIn, QuantityOut


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    sku: str | None = Field(default=None, max_length=50)
    description: str | None = None
    category_id: int | None = None
    unit: str = Field(default="piece", min_length=1, max_length=20)
    cost_price: MoneyIn = Decimal("0")
    selling_price: MoneyIn = Decimal("0")
    reorder_level: QuantityIn = Decimal("0")


class ProductCreate(ProductBase):
    opening_stock: QuantityIn = Decimal("0")


class ProductUpdate(BaseModel):
    """Stock is NOT editable here — use an inventory adjustment so the change is recorded."""

    name: str | None = Field(default=None, min_length=1, max_length=150)
    sku: str | None = Field(default=None, max_length=50)
    description: str | None = None
    category_id: int | None = None
    unit: str | None = Field(default=None, min_length=1, max_length=20)
    cost_price: MoneyIn | None = None
    selling_price: MoneyIn | None = None
    reorder_level: QuantityIn | None = None
    is_active: bool | None = None


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str | None
    description: str | None
    category_id: int | None
    category_name: str | None
    unit: str
    cost_price: MoneyOut
    selling_price: MoneyOut
    stock_quantity: QuantityOut
    reorder_level: QuantityOut
    stock_value: MoneyOut
    is_low_stock: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
