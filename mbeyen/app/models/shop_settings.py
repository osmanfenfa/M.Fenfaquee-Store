from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class ShopSettings(TimestampMixin, Base):
    """Single-row table (id = 1) with the shop details printed on receipts and reports."""

    __tablename__ = "shop_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    shop_name: Mapped[str] = mapped_column(String(150), default="M.Fenfaquee Enterprise")
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(60))
    receipt_note: Mapped[str | None] = mapped_column(String(255))
