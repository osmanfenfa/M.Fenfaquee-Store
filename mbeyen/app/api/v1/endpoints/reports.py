from datetime import date

from fastapi import APIRouter, Response

from app.dependencies import CurrentUser, DbSession
from app.reports.excel_generator import render_excel
from app.reports.pdf_generator import render_pdf
from app.reports.templates.report_header import filename
from app.schemas.reports import Report, ReportType
from app.services import report_service, settings_service
from app.utils.dates import month_to_date

router = APIRouter(prefix="/reports", tags=["reports"])


def _build(db, report_type: ReportType, date_from: date | None, date_to: date | None) -> Report:
    default_from, default_to = month_to_date()
    return report_service.build(db, report_type, date_from or default_from, date_to or default_to)


@router.get("/{report_type}", response_model=Report)
def preview_report(report_type: ReportType, db: DbSession, _: CurrentUser, date_from: date | None = None, date_to: date | None = None):
    """Report data for the on-screen preview. Dates default to this month (ignored for stock / money owed)."""
    return _build(db, report_type, date_from, date_to)


@router.get("/{report_type}/pdf")
def download_pdf(report_type: ReportType, db: DbSession, _: CurrentUser, date_from: date | None = None, date_to: date | None = None):
    report = _build(db, report_type, date_from, date_to)
    content = render_pdf(report, settings_service.read(db))
    return Response(
        content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename(report_type, report.period_label, "pdf")}"'},
    )


@router.get("/{report_type}/excel")
def download_excel(report_type: ReportType, db: DbSession, _: CurrentUser, date_from: date | None = None, date_to: date | None = None):
    report = _build(db, report_type, date_from, date_to)
    content = render_excel(report, settings_service.read(db))
    return Response(
        content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename(report_type, report.period_label, "xlsx")}"'},
    )
