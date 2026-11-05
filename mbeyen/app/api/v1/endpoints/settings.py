from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.schemas.settings import ShopSettingsRead, ShopSettingsUpdate
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/shop", response_model=ShopSettingsRead)
def get_shop_settings(db: DbSession, _: CurrentUser):
    """Shop details shown on receipts and reports."""
    return settings_service.read(db)


@router.patch("/shop", response_model=ShopSettingsRead)
def update_shop_settings(data: ShopSettingsUpdate, db: DbSession, user: CurrentUser):
    return settings_service.update(db, data, user)
