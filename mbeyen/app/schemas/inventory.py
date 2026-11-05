from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models import MovementType
from app.schemas.common import MoneyOut, QuantityIn, QuantityOut


class StockAdjustmentCreate(BaseModel):
    """
    Correct a product's stock. Give EITHER:
      - quantity_change: +5 to add, -2 to remove, or
      - counted_quantity: the quantity physically counted on the shelf.
    """

    product_id: int
    quantity_change: Annotated[Decimal, Field(max_digits=14, decimal_places=3)] | None = None
    counted_quantity: QuantityIn | None = None
    reason: str = Field(min_length=3, max_length=255)

    @model_validator(mode="after")
    def exactly_one_amount(self):
        if (self.quantity_change is None) == (self.counted_quantity is None):
            raise ValueError("Provide either quantity_change or counted_quantity, not both")
        if self.quantity_change is not None and self.quantity_change == 0:
            raise ValueError("quantity_change cannot be zero")
        return self


class StockMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    product_unit: str
    movement_type: MovementType
    quantity_change: QuantityOut
    quantity_after: QuantityOut
    unit_cost: MoneyOut | None
    sale_id: int | None
    purchase_id: int | None
    reason: str | None
    created_at: datetime


class InventorySummary(BaseModel):
    active_products: int
    low_stock_count: int
    out_of_stock_count: int
    stock_value_cost: MoneyOut  # what the stock cost
    stock_value_retail: MoneyOut  # what it would sell for
