from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SignupRequest(BaseModel):
    shop_name: str = Field(min_length=2, max_length=150)
    full_name: str = Field(min_length=2, max_length=120)
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=60)
    address: str | None = Field(default=None, max_length=500)

    @field_validator("shop_name", "full_name")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("This field is required")
        return v

    @field_validator("username")
    @classmethod
    def _username_chars(cls, v: str) -> str:
        v = v.strip()
        if not v.replace("_", "").replace(".", "").replace("-", "").isalnum():
            raise ValueError("Use only letters, numbers, dots, dashes or underscores (no spaces)")
        return v


class ShopBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class AdminShopRead(BaseModel):
    id: int
    name: str
    phone: str | None
    is_active: bool
    created_at: datetime
    owner_name: str | None
    owner_username: str | None
    user_count: int
    product_count: int
    sale_count: int
    last_sale_date: date | None


class AdminShopUpdate(BaseModel):
    is_active: bool
