"""Render a Report as an Excel workbook: a Summary sheet plus one sheet per table."""

from datetime import date
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.reports.templates.report_header import BRAND, BRAND_LIGHT, INK, INK_MUTED, generated_label
from app.schemas.reports import Kind, Report
from app.schemas.settings import ShopSettingsRead

FMT: dict[Kind, str] = {
    "money": '#,##0.00;[Red]-#,##0.00',
    "qty": "#,##0.###",
    "int": "#,##0",
    "pct": '0.0"%"',
    "date": "d mmm yyyy",
    "text": "@",
}

HEAD_FILL = PatternFill("solid", fgColor=INK.lstrip("#"))
TOTAL_FILL = PatternFill("solid", fgColor=BRAND_LIGHT.lstrip("#"))
HEAD_FONT = Font(bold=True, color="FFFFFF")
TITLE_FONT = Font(bold=True, size=14, color=INK.lstrip("#"))
MUTED_FONT = Font(size=9, color=INK_MUTED.lstrip("#"))
BRAND_FONT = Font(size=10, color=BRAND.lstrip("#"))
TOTAL_BORDER = Border(top=Side(style="thin", color=INK.lstrip("#")))


def _sheet_title(title: str, used: set[str]) -> str:
    base = "".join(c for c in title if c not in r'[]:*?/\\')[:31] or "Sheet"
    name, i = base, 2
    while name in used:
        name = f"{base[:28]} {i}"
        i += 1
    used.add(name)
    return name


def _value(v, kind: Kind):
    if kind == "date" and isinstance(v, str) and len(v) == 10:
        return date.fromisoformat(v)
    return v


def _label(col_label: str, kind: Kind, currency: str) -> str:
    return f"{col_label} ({currency})" if kind == "money" else col_label


def _header_block(ws, report: Report, shop: ShopSettingsRead, title: str) -> int:
    ws["A1"] = shop.shop_name
    ws["A1"].font = TITLE_FONT
    ws["A2"] = f"{title} — {report.period_label}"
    ws["A2"].font = BRAND_FONT
    ws["A3"] = generated_label(report.generated_at)
    ws["A3"].font = MUTED_FONT
    return 5  # first row of content


def render_excel(report: Report, shop: ShopSettingsRead) -> bytes:
    wb = Workbook()
    used: set[str] = set()
    cur = shop.currency

    # ---- Summary sheet
    ws = wb.active
    ws.title = _sheet_title("Summary", used)
    r = _header_block(ws, report, shop, report.title)
    for item in report.summary:
        ws.cell(row=r, column=1, value=item.label).font = Font(bold=item.emphasis)
        c = ws.cell(row=r, column=2, value=item.value)
        c.number_format = FMT[item.kind]
        c.font = Font(bold=item.emphasis)
        if item.kind == "money":
            ws.cell(row=r, column=3, value=cur).font = MUTED_FONT
        r += 1
    ws.column_dimensions["A"].width = 32
    ws.column_dimensions["B"].width = 18

    # ---- One sheet per table
    for tbl in report.tables:
        ws = wb.create_sheet(_sheet_title(tbl.title, used))
        start = _header_block(ws, report, shop, tbl.title)
        for ci, col in enumerate(tbl.columns, start=1):
            cell = ws.cell(row=start, column=ci, value=_label(col.label, col.kind, cur))
            cell.fill, cell.font = HEAD_FILL, HEAD_FONT
            cell.alignment = Alignment(horizontal="right" if col.kind not in ("text", "date") else "left", vertical="center")
        for ri, row in enumerate(tbl.rows, start=start + 1):
            for ci, (v, col) in enumerate(zip(row, tbl.columns), start=1):
                cell = ws.cell(row=ri, column=ci, value=_value(v, col.kind))
                if col.kind != "text":
                    cell.number_format = FMT[col.kind]
        last = start + len(tbl.rows)
        if tbl.totals and tbl.rows:
            tr = last + 1
            for ci, (v, col) in enumerate(zip(tbl.totals, tbl.columns), start=1):
                cell = ws.cell(row=tr, column=ci, value=_value(v, col.kind))
                cell.font, cell.fill, cell.border = Font(bold=True), TOTAL_FILL, TOTAL_BORDER
                if col.kind != "text":
                    cell.number_format = FMT[col.kind]
            last = tr
        if not tbl.rows:
            ws.cell(row=start + 1, column=1, value="Nothing to show for this period.").font = MUTED_FONT
        if tbl.note:
            ws.cell(row=last + 2, column=1, value=tbl.note).font = MUTED_FONT

        ws.freeze_panes = ws.cell(row=start + 1, column=1)
        if tbl.rows:
            ws.auto_filter.ref = f"A{start}:{get_column_letter(len(tbl.columns))}{start + len(tbl.rows)}"
        # Column widths from content
        for ci, col in enumerate(tbl.columns, start=1):
            longest = max([len(_label(col.label, col.kind, cur))] + [len(str(r[ci - 1] or "")) for r in tbl.rows[:500]])
            ws.column_dimensions[get_column_letter(ci)].width = min(max(longest + 3, 10), 45)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
