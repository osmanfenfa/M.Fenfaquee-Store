from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog, User


def _jsonable(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)  # Decimal, date, enum...


def log(
    db: Session,
    user: User | None,
    action: str,
    entity: str,
    entity_id: int | None,
    details: dict[str, Any] | None = None,
) -> None:
    """Add an audit entry to the current transaction (the caller commits)."""
    db.add(
        AuditLog(
            user_id=user.id if user else None,
            action=action,
            entity=entity,
            entity_id=entity_id,
            details={k: _jsonable(v) for k, v in details.items()} if details else None,
        )
    )
