from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.database.tenancy import TenantMixin


class AuditLog(TenantMixin, Base):
    """Records important changes (price edits, voids, stock adjustments, deletions)."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(50))  # e.g. "update", "void", "delete"
    entity: Mapped[str] = mapped_column(String(50), index=True)  # e.g. "product", "sale"
    entity_id: Mapped[int | None]
    details: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
