from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class Shop(TimestampMixin, Base):
    """A business using Bu'kuma. All of its data is linked by `shop_id`."""

    __tablename__ = "shops"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(60))
    receipt_note: Mapped[str | None] = mapped_column(String(255))
    # Suspended shops can't log in (set by the platform admin)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
