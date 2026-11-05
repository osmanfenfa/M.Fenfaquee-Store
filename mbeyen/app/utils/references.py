from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session


def next_reference(db: Session, column, prefix: str, on: date) -> str:
    """
    Human-friendly sequential references per day, e.g. SAL-20261105-0003.
    `column` is the model's reference column (e.g. Sale.reference).
    """
    stem = f"{prefix}-{on:%Y%m%d}-"
    last = db.scalar(select(func.max(column)).where(column.like(f"{stem}%")))
    seq = int(last.rsplit("-", 1)[1]) + 1 if last else 1
    return f"{stem}{seq:04d}"
