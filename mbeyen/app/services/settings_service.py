from sqlalchemy.orm import Session

from app.core.config import settings as app_settings
from app.models import ShopSettings, User
from app.schemas.settings import ShopSettingsRead, ShopSettingsUpdate
from app.services import audit_service

SETTINGS_ID = 1


def get_or_create(db: Session) -> ShopSettings:
    row = db.get(ShopSettings, SETTINGS_ID)
    if row is None:
        row = ShopSettings(id=SETTINGS_ID, shop_name=app_settings.SHOP_NAME, receipt_note="Thank you for your business!")
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def read(db: Session) -> ShopSettingsRead:
    return ShopSettingsRead.model_validate(get_or_create(db)).model_copy(update={"currency": app_settings.CURRENCY})


def update(db: Session, data: ShopSettingsUpdate, user: User) -> ShopSettingsRead:
    row = get_or_create(db)
    changes = data.model_dump(exclude_unset=True)
    if changes.get("shop_name") is None:
        changes.pop("shop_name", None)
    for k, v in changes.items():
        if isinstance(v, str):
            v = v.strip() or None  # blank optional fields are cleared
        setattr(row, k, v)
    audit_service.log(db, user, "update", "settings", SETTINGS_ID, changes)
    db.commit()
    return read(db)
