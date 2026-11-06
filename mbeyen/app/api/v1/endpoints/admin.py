from fastapi import APIRouter

from app.dependencies import DbSession, SuperAdmin
from app.schemas.shop import AdminShopRead, AdminShopUpdate
from app.services import shop_service

router = APIRouter(prefix="/admin", tags=["platform admin"])


@router.get("/shops", response_model=list[AdminShopRead])
def list_shops(db: DbSession, _: SuperAdmin):
    """Every shop on the platform, newest first, with simple activity figures."""
    return shop_service.list_shops(db)


@router.patch("/shops/{shop_id}", response_model=AdminShopRead)
def update_shop(shop_id: int, data: AdminShopUpdate, db: DbSession, admin: SuperAdmin):
    """Suspend or re-activate a shop. Suspended shops can't log in; their data is kept."""
    return shop_service.set_shop_active(db, shop_id, data.is_active, admin)
