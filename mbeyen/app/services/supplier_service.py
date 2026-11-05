from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Purchase, PurchaseStatus, Supplier, User
from app.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate
from app.services import audit_service
from app.utils.pagination import PageParams, paginate


def _clean(value: str | None) -> str | None:
    return (value or "").strip() or None


def _ensure_unique_name(db: Session, name: str, exclude_id: int | None = None) -> None:
    stmt = select(Supplier.id).where(func.lower(Supplier.name) == name.lower())
    if exclude_id is not None:
        stmt = stmt.where(Supplier.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise ConflictError(f"A supplier named '{name}' already exists")


def get(db: Session, supplier_id: int) -> Supplier:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise NotFoundError(f"Supplier {supplier_id} not found")
    return supplier


def _stats(db: Session, supplier_ids: list[int]) -> dict[int, tuple[int, Decimal]]:
    """purchase_count and balance_owed per supplier (cancelled purchases excluded)."""
    if not supplier_ids:
        return {}
    rows = db.execute(
        select(
            Purchase.supplier_id,
            func.count(Purchase.id),
            func.coalesce(func.sum(Purchase.total - Purchase.amount_paid), 0),
        )
        .where(Purchase.supplier_id.in_(supplier_ids), Purchase.status != PurchaseStatus.CANCELLED)
        .group_by(Purchase.supplier_id)
    ).all()
    return {sid: (n, Decimal(str(owed)).quantize(Decimal("0.01"))) for sid, n, owed in rows}


def to_read_many(db: Session, suppliers: list[Supplier]) -> list[SupplierRead]:
    stats = _stats(db, [s.id for s in suppliers])
    out = []
    for s in suppliers:
        n, owed = stats.get(s.id, (0, Decimal("0")))
        out.append(SupplierRead.model_validate(s).model_copy(update={"purchase_count": n, "balance_owed": owed}))
    return out


def to_read(db: Session, supplier: Supplier) -> SupplierRead:
    return to_read_many(db, [supplier])[0]


def list_suppliers(
    db: Session, params: PageParams, *, search: str | None = None, is_active: bool | None = True
) -> tuple[list[Supplier], int]:
    stmt = select(Supplier)
    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Supplier.name).like(term),
                func.lower(Supplier.contact_person).like(term),
                Supplier.phone.like(term),
            )
        )
    if is_active is not None:
        stmt = stmt.where(Supplier.is_active.is_(is_active))
    return paginate(db, stmt.order_by(Supplier.name), params)


def create(db: Session, data: SupplierCreate) -> Supplier:
    name = data.name.strip()
    _ensure_unique_name(db, name)
    supplier = Supplier(
        name=name,
        contact_person=_clean(data.contact_person),
        phone=_clean(data.phone),
        email=_clean(str(data.email) if data.email else None),
        address=_clean(data.address),
        notes=data.notes,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def update(db: Session, supplier_id: int, data: SupplierUpdate) -> Supplier:
    supplier = get(db, supplier_id)
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        if changes["name"] is None:
            changes.pop("name")
        else:
            changes["name"] = changes["name"].strip()
            _ensure_unique_name(db, changes["name"], exclude_id=supplier.id)
    if "is_active" in changes and changes["is_active"] is None:
        changes.pop("is_active")
    for field in ("contact_person", "phone", "address"):
        if field in changes:
            changes[field] = _clean(changes[field])
    if "email" in changes:
        changes["email"] = _clean(str(changes["email"]) if changes["email"] else None)
    for field, value in changes.items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


def archive(db: Session, supplier_id: int, user: User) -> None:
    """Suppliers are archived, not deleted, so purchase history stays intact."""
    supplier = get(db, supplier_id)
    if not supplier.is_active:
        return
    supplier.is_active = False
    audit_service.log(db, user, "archive", "supplier", supplier.id, {"name": supplier.name})
    db.commit()
