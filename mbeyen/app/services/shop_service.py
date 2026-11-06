"""Creating shops (sign-up) and the platform-admin view of all shops."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.database.tenancy import ALL_SHOPS, get_tenant, set_tenant
from app.models import ExpenseCategory, Product, Sale, SaleStatus, Shop, User
from app.schemas.shop import AdminShopRead, SignupRequest

DEFAULT_EXPENSE_CATEGORIES = [
    "Rent",
    "Electricity",
    "Water",
    "Transport",
    "Salaries",
    "Repairs & Maintenance",
    "Phone & Internet",
    "Taxes & Licences",
    "Other",
]
DEFAULT_RECEIPT_NOTE = "Thank you for your business!"


def normalize_username(username: str) -> str:
    return username.strip().lower()


def username_taken(db: Session, username: str) -> bool:
    return db.scalar(select(func.count()).select_from(User).where(func.lower(User.username) == normalize_username(username))) > 0


def seed_expense_categories(db: Session) -> int:
    """Add the default expense categories to the CURRENT shop (skips existing names)."""
    existing = {n.lower() for n in db.scalars(select(ExpenseCategory.name))}
    new = [ExpenseCategory(name=n) for n in DEFAULT_EXPENSE_CATEGORIES if n.lower() not in existing]
    db.add_all(new)
    return len(new)


def create_shop_with_owner(db: Session, data: SignupRequest) -> User:
    """Sign-up: a new shop, its owner account and default expense categories, in one transaction."""
    if username_taken(db, data.username):
        raise ConflictError("That username is already taken — please choose another")

    shop = Shop(
        name=data.shop_name.strip(),
        phone=(data.phone or "").strip() or None,
        address=(data.address or "").strip() or None,
        receipt_note=DEFAULT_RECEIPT_NOTE,
    )
    db.add(shop)
    db.flush()  # get shop.id

    owner = User(
        username=normalize_username(data.username),
        full_name=data.full_name.strip(),
        password_hash=hash_password(data.password),
        shop_id=shop.id,
        role="owner",
    )
    db.add(owner)

    previous = get_tenant(db)
    set_tenant(db, shop.id)  # defaults are created INSIDE the new shop
    try:
        seed_expense_categories(db)
        db.commit()
    finally:
        set_tenant(db, previous)
    db.refresh(owner)
    return owner


# ---------------------------------------------------------------- platform admin


def _admin_row(db: Session, shop: Shop) -> AdminShopRead:
    owner = db.scalar(select(User).where(User.shop_id == shop.id, User.role == "owner").order_by(User.id).limit(1))
    previous = get_tenant(db)
    set_tenant(db, ALL_SHOPS)
    try:
        products = db.scalar(select(func.count(Product.id)).where(Product.shop_id == shop.id))
        sales = db.scalar(
            select(func.count(Sale.id)).where(Sale.shop_id == shop.id, Sale.status == SaleStatus.COMPLETED)
        )
        last_sale = db.scalar(select(func.max(Sale.sale_date)).where(Sale.shop_id == shop.id))
    finally:
        set_tenant(db, previous)
    users = db.scalar(select(func.count(User.id)).where(User.shop_id == shop.id))
    return AdminShopRead(
        id=shop.id,
        name=shop.name,
        phone=shop.phone,
        is_active=shop.is_active,
        created_at=shop.created_at,
        owner_name=owner.full_name if owner else None,
        owner_username=owner.username if owner else None,
        user_count=users,
        product_count=products,
        sale_count=sales,
        last_sale_date=last_sale,
    )


def list_shops(db: Session) -> list[AdminShopRead]:
    return [_admin_row(db, s) for s in db.scalars(select(Shop).order_by(Shop.created_at.desc(), Shop.id.desc()))]


def set_shop_active(db: Session, shop_id: int, active: bool, admin: User) -> AdminShopRead:
    shop = db.get(Shop, shop_id)
    if shop is None:
        raise NotFoundError(f"Shop {shop_id} not found")
    if not active and admin.shop_id == shop.id:
        raise ConflictError("You can't suspend your own shop")
    shop.is_active = active
    db.commit()
    return _admin_row(db, shop)
