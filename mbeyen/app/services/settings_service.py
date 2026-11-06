from sqlalchemy.orm import Session

from app.core.config import settings as app_settings
from app.core.exceptions import NotFoundError
from app.database.tenancy import get_tenant
from app.models import Shop, User
from app.schemas.settings import ShopSettingsRead, ShopSettingsUpdate
from app.services import audit_service


def current_shop(db: Session) -> Shop:
    """The logged-in user's shop (set on the session by the auth dependency)."""
    shop_id = get_tenant(db)
    shop = db.get(Shop, shop_id) if isinstance(shop_id, int) else None
    if shop is None:
        raise NotFoundError("No shop selected")
    return shop


def read(db: Session) -> ShopSettingsRead:
    shop = current_shop(db)
    return ShopSettingsRead(
        shop_name=shop.name,
        address=shop.address,
        phone=shop.phone,
        receipt_note=shop.receipt_note,
        currency=app_settings.CURRENCY,
    )


def update(db: Session, data: ShopSettingsUpdate, user: User) -> ShopSettingsRead:
    shop = current_shop(db)
    changes = data.model_dump(exclude_unset=True)
    if not (changes.get("shop_name") or "").strip():
        changes.pop("shop_name", None)
    for k, v in changes.items():
        if isinstance(v, str):
            v = v.strip() or None  # blank optional fields are cleared
        setattr(shop, "name" if k == "shop_name" else k, v)
    audit_service.log(db, user, "update", "settings", shop.id, changes)
    db.commit()
    return read(db)
