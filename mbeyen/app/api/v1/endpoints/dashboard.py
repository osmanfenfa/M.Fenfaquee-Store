from datetime import date

from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.schemas.dashboard import Dashboard
from app.services import dashboard_service
from app.utils.dates import month_to_date

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=Dashboard)
def get_dashboard(db: DbSession, _: CurrentUser, date_from: date | None = None, date_to: date | None = None):
    """Everything the dashboard needs in one call. Defaults to this month to date."""
    default_from, default_to = month_to_date()
    return dashboard_service.build(db, date_from or default_from, date_to or default_to)
