"""Render a Report as an A4 PDF (portrait, or landscape for wide tables)."""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.reports.templates.report_header import (
    BRAND,
    BRAND_LIGHT,
    INK,
    INK_MUTED,
    NUMERIC_KINDS,
    RULE,
    ZEBRA,
    format_cell,
    generated_label,
)
from app.schemas.reports import Report
from app.schemas.settings import ShopSettingsRead

_base = getSampleStyleSheet()
STYLES = {
    "shop": ParagraphStyle("shop", parent=_base["Normal"], fontName="Helvetica-Bold", fontSize=13, textColor=colors.HexColor(INK), leading=16),
    "shop_meta": ParagraphStyle("meta", parent=_base["Normal"], fontSize=8.5, textColor=colors.HexColor(INK_MUTED), leading=11),
    "title": ParagraphStyle("title", parent=_base["Normal"], fontName="Helvetica-Bold", fontSize=17, textColor=colors.HexColor(INK), leading=21, alignment=TA_RIGHT),
    "period": ParagraphStyle("period", parent=_base["Normal"], fontSize=9.5, textColor=colors.HexColor(BRAND), leading=12, alignment=TA_RIGHT),
    "h2": ParagraphStyle("h2", parent=_base["Normal"], fontName="Helvetica-Bold", fontSize=11, textColor=colors.HexColor(INK), spaceBefore=8, spaceAfter=4),
    "cell": ParagraphStyle("cell", parent=_base["Normal"], fontSize=8, leading=10, textColor=colors.HexColor(INK)),
    "cell_r": ParagraphStyle("cell_r", parent=_base["Normal"], fontSize=8, leading=10, alignment=TA_RIGHT, textColor=colors.HexColor(INK)),
    "head": ParagraphStyle("head", parent=_base["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white),
    "head_r": ParagraphStyle("head_r", parent=_base["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white, alignment=TA_RIGHT),
    "note": ParagraphStyle("note", parent=_base["Normal"], fontSize=7.5, leading=10, textColor=colors.HexColor(INK_MUTED), spaceBefore=3),
    "empty": ParagraphStyle("empty", parent=_base["Normal"], fontSize=8.5, textColor=colors.HexColor(INK_MUTED)),
}


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _header(report: Report, shop: ShopSettingsRead, width: float) -> Table:
    left = [Paragraph(_esc(shop.shop_name), STYLES["shop"])]
    meta = [m for m in (shop.address, f"Tel: {shop.phone}" if shop.phone else None) if m]
    if meta:
        left.append(Paragraph("<br/>".join(_esc(m).replace("\n", "<br/>") for m in meta), STYLES["shop_meta"]))
    right = [Paragraph(_esc(report.title), STYLES["title"]), Paragraph(_esc(report.period_label), STYLES["period"])]
    t = Table([[left, right]], colWidths=[width * 0.55, width * 0.45])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, 0), 1.5, colors.HexColor(BRAND)),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def _summary(report: Report, currency: str, width: float) -> Table:
    per_row = 4
    cells, row = [], []
    for item in report.summary:
        style = ParagraphStyle("s", parent=STYLES["cell"], fontSize=12 if item.emphasis else 10.5, fontName="Helvetica-Bold", leading=15)
        value = format_cell(item.value, item.kind, currency) if item.value is not None else "—"
        row.append([Paragraph(_esc(item.label), STYLES["shop_meta"]), Paragraph(_esc(value), style)])
        if len(row) == per_row:
            cells.append(row)
            row = []
    if row:
        cells.append(row + [""] * (per_row - len(row)))
    t = Table(cells, colWidths=[width / per_row] * per_row)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(BRAND_LIGHT)),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def _table(tbl, currency: str, width: float) -> list:
    flow: list = [Paragraph(_esc(tbl.title), STYLES["h2"])]
    if not tbl.rows:
        flow.append(Paragraph("Nothing to show for this period.", STYLES["empty"]))
        return flow

    numeric = [c.kind in NUMERIC_KINDS for c in tbl.columns]
    labels = [f"{c.label} ({currency})" if c.kind == "money" else c.label for c in tbl.columns]
    head = [Paragraph(_esc(lbl), STYLES["head_r" if n else "head"]) for lbl, n in zip(labels, numeric)]

    def texts(values) -> list[str]:
        # currency lives in the header, so cells stay narrow
        return [format_cell(v, c.kind, None) for v, c in zip(values, tbl.columns)]

    def row_cells(values, bold=False):
        out = []
        for text, n in zip(texts(values), numeric):
            text = _esc(text)
            out.append(Paragraph(f"<b>{text}</b>" if bold else text, STYLES["cell_r" if n else "cell"]))
        return out

    data = [head] + [row_cells(r) for r in tbl.rows]
    if tbl.totals:
        data.append(row_cells(tbl.totals, bold=True))

    # Width from content: longest cell per column (sampled), header words, clamped
    sample = [texts(r) for r in tbl.rows[:300]] + ([texts(tbl.totals)] if tbl.totals else [])
    weights = []
    for i, lbl in enumerate(labels):
        longest_word = max(len(w) for w in lbl.split())
        longest_cell = max([len(r[i]) for r in sample] or [0])
        weights.append(min(max(longest_cell, longest_word, 4) + 2, 40))
    total_w = sum(weights)
    t = Table(data, colWidths=[width * w / total_w for w in weights], repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(INK)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor(RULE)),
    ]
    for i in range(2, len(tbl.rows) + 1, 2):
        style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor(ZEBRA)))
    if tbl.totals:
        style += [
            ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor(INK)),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor(BRAND_LIGHT)),
        ]
    t.setStyle(TableStyle(style))
    flow.append(t)
    if tbl.note:
        flow.append(Paragraph(_esc(tbl.note), STYLES["note"]))
    return flow


def render_pdf(report: Report, shop: ShopSettingsRead) -> bytes:
    wide = any(len(t.columns) > 6 for t in report.tables)
    pagesize = landscape(A4) if wide else A4
    buf = BytesIO()
    margin = 14 * mm
    doc = SimpleDocTemplate(
        buf, pagesize=pagesize, leftMargin=margin, rightMargin=margin, topMargin=margin, bottomMargin=16 * mm,
        title=f"{report.title} — {report.period_label}", author=shop.shop_name, creator="Bu'kuma",
    )
    width = pagesize[0] - 2 * margin
    footer_text = f"{shop.shop_name} · {report.title} · {report.period_label} · {generated_label(report.generated_at)}"

    def on_page(canvas, doc_):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor(INK_MUTED))
        canvas.drawString(margin, 9 * mm, footer_text)
        canvas.drawRightString(pagesize[0] - margin, 9 * mm, f"Page {doc_.page}")
        canvas.restoreState()

    story: list = [_header(report, shop, width), Spacer(1, 6 * mm), _summary(report, shop.currency, width), Spacer(1, 4 * mm)]
    for tbl in report.tables:
        parts = _table(tbl, shop.currency, width)
        # keep short tables together with their heading
        story.append(KeepTogether(parts) if len(tbl.rows) < 25 else parts[0])
        if len(tbl.rows) >= 25:
            story.extend(parts[1:])
        story.append(Spacer(1, 4 * mm))
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()
