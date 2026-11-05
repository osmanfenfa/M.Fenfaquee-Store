from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Category, Product, User
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services import audit_service


def _ensure_unique_name(db: Session, name: str, exclude_id: int | None = None) -> None:
    stmt = select(Category.id).where(func.lower(Category.name) == name.lower())
    if exclude_id is not None:
        stmt = stmt.where(Category.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise ConflictError(f"A category named '{name}' already exists")


def get(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise NotFoundError(f"Category {category_id} not found")
    return category


def list_with_counts(db: Session) -> list[CategoryRead]:
    count = (
        select(func.count(Product.id))
        .where(Product.category_id == Category.id, Product.is_active.is_(True))
        .correlate(Category)
        .scalar_subquery()
    )
    rows = db.execute(select(Category, count).order_by(Category.name)).all()
    return [
        CategoryRead.model_validate(cat).model_copy(update={"product_count": n}) for cat, n in rows
    ]


def to_read(db: Session, category: Category) -> CategoryRead:
    n = db.scalar(
        select(func.count(Product.id)).where(
            Product.category_id == category.id, Product.is_active.is_(True)
        )
    )
    return CategoryRead.model_validate(category).model_copy(update={"product_count": n or 0})


def create(db: Session, data: CategoryCreate) -> Category:
    name = data.name.strip()
    _ensure_unique_name(db, name)
    category = Category(name=name, description=data.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update(db: Session, category_id: int, data: CategoryUpdate) -> Category:
    category = get(db, category_id)
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes and changes["name"] is not None:
        changes["name"] = changes["name"].strip()
        _ensure_unique_name(db, changes["name"], exclude_id=category.id)
    for field, value in changes.items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


def delete(db: Session, category_id: int, user: User) -> None:
    category = get(db, category_id)
    in_use = db.scalar(select(func.count(Product.id)).where(Product.category_id == category.id))
    if in_use:
        raise ConflictError(
            f"'{category.name}' still has {in_use} product(s). Move them to another category first."
        )
    audit_service.log(db, user, "delete", "category", category.id, {"name": category.name})
    db.delete(category)
    db.commit()
