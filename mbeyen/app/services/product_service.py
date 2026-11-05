from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Category, MovementType, Product, User
from app.schemas.product import ProductCreate, ProductUpdate
from app.services import audit_service, inventory_service
from app.utils.pagination import PageParams, paginate

AUDITED_FIELDS = ("name", "cost_price", "selling_price", "reorder_level", "is_active", "unit")


def _clean_sku(sku: str | None) -> str | None:
    sku = (sku or "").strip()
    return sku.upper() or None


def _check_unique(db: Session, name: str, sku: str | None, exclude_id: int | None = None) -> None:
    name_stmt = select(Product.id).where(func.lower(Product.name) == name.lower())
    if exclude_id is not None:
        name_stmt = name_stmt.where(Product.id != exclude_id)
    if db.scalar(name_stmt) is not None:
        raise ConflictError(f"A product named '{name}' already exists")
    if sku:
        sku_stmt = select(Product.id).where(Product.sku == sku)
        if exclude_id is not None:
            sku_stmt = sku_stmt.where(Product.id != exclude_id)
        if db.scalar(sku_stmt) is not None:
            raise ConflictError(f"SKU '{sku}' is already used by another product")


def _check_category(db: Session, category_id: int | None) -> None:
    if category_id is not None and db.get(Category, category_id) is None:
        raise NotFoundError(f"Category {category_id} not found")


def get(db: Session, product_id: int) -> Product:
    product = db.scalar(
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.id == product_id)
        .execution_options(populate_existing=True)  # refresh category after edits
    )
    if product is None:
        raise NotFoundError(f"Product {product_id} not found")
    return product


def list_products(
    db: Session,
    params: PageParams,
    *,
    search: str | None = None,
    category_id: int | None = None,
    low_stock: bool | None = None,
    is_active: bool | None = True,
    sort: str = "name",
) -> tuple[list[Product], int]:
    stmt = select(Product).options(joinedload(Product.category))
    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(Product.name).like(term), func.lower(Product.sku).like(term)))
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if low_stock is True:
        stmt = stmt.where(Product.stock_quantity <= Product.reorder_level)
    if is_active is not None:
        stmt = stmt.where(Product.is_active.is_(is_active))
    stmt = stmt.order_by(*SORTS.get(sort, SORTS["name"]), Product.id)
    return paginate(db, stmt, params)


SORTS = {
    "name": (Product.name,),
    "stock": (Product.stock_quantity, Product.name),  # emptiest first
    "price_desc": (Product.selling_price.desc(), Product.name),
    "newest": (Product.created_at.desc(),),
}


def create(db: Session, data: ProductCreate, user: User) -> Product:
    name = data.name.strip()
    sku = _clean_sku(data.sku)
    _check_unique(db, name, sku)
    _check_category(db, data.category_id)

    product = Product(
        name=name,
        sku=sku,
        description=data.description,
        category_id=data.category_id,
        unit=data.unit.strip().lower(),
        cost_price=data.cost_price,
        selling_price=data.selling_price,
        reorder_level=data.reorder_level,
    )
    db.add(product)
    db.flush()  # get product.id

    if data.opening_stock > 0:
        inventory_service.record_movement(
            db,
            product_id=product.id,
            quantity_change=data.opening_stock,
            movement_type=MovementType.OPENING,
            user=user,
            unit_cost=data.cost_price,
            reason="Opening stock",
        )
    db.commit()
    return get(db, product.id)


def update(db: Session, product_id: int, data: ProductUpdate, user: User) -> Product:
    product = get(db, product_id)
    changes = data.model_dump(exclude_unset=True)

    if "name" in changes:
        if changes["name"] is None:
            changes.pop("name")
        else:
            changes["name"] = changes["name"].strip()
    if "sku" in changes:
        changes["sku"] = _clean_sku(changes["sku"])
    if "unit" in changes and changes["unit"] is not None:
        changes["unit"] = changes["unit"].strip().lower()
    # Required numeric fields can't be cleared
    for field in ("cost_price", "selling_price", "reorder_level", "is_active", "unit"):
        if field in changes and changes[field] is None:
            changes.pop(field)

    _check_unique(db, changes.get("name", product.name), changes.get("sku", product.sku), product.id)
    if "category_id" in changes:
        _check_category(db, changes["category_id"])

    audit = {
        f: {"from": getattr(product, f), "to": v}
        for f, v in changes.items()
        if f in AUDITED_FIELDS and getattr(product, f) != v
    }
    for field, value in changes.items():
        setattr(product, field, value)
    if audit:
        audit_service.log(db, user, "update", "product", product.id, {k: str(v) for k, v in audit.items()})
    db.commit()
    return get(db, product.id)


def archive(db: Session, product_id: int, user: User) -> None:
    """
    Products are never hard-deleted: sales, purchases and stock history
    reference them. Archiving hides them from lists and new sales.
    """
    product = get(db, product_id)
    if not product.is_active:
        return
    product.is_active = False
    audit_service.log(db, user, "archive", "product", product.id, {"name": product.name})
    db.commit()
