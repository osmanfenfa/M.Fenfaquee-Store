from pydantic import BaseModel, ConfigDict, Field


class ShopSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    shop_name: str
    address: str | None
    phone: str | None
    receipt_note: str | None
    currency: str = "NLe"


class ShopSettingsUpdate(BaseModel):
    shop_name: str | None = Field(default=None, min_length=1, max_length=150)
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=60)
    receipt_note: str | None = Field(default=None, max_length=255)
