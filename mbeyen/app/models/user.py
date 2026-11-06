from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    """A person who logs in. Belongs to one shop; platform admins may have no shop.

    Usernames are unique across all shops, so login needs only username + password.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    shop_id: Mapped[int | None] = mapped_column(ForeignKey("shops.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20), default="owner", server_default="owner")  # owner | manager | cashier
    is_superadmin: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    shop: Mapped["Shop | None"] = relationship()  # noqa: F821
