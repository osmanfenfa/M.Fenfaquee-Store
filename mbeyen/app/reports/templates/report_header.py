"""Shared formatting for report outputs (PDF and Excel)."""

from datetime import date, datetime

from app.schemas.reports import Kind

# Leopard palette, print-friendly
INK = "#2b201b"  # espresso
INK_MUTED = "#715f55"
BRAND = "#c17429"  # ochre
BRAND_LIGHT = "#fbf3e8"
RULE = "#e7e5e4"
ZEBRA = "#faf9f7"

NUMERIC_KINDS: set[Kind] = {"money", "qty", "int", "pct"}


def format_cell(value, kind: Kind, currency: str | None = "NLe") -> str:
    """Human-readable text for a cell. Pass currency=None inside tables (the header carries it)."""
    if value is None:
        return ""
    if kind == "money":
        v = float(value)
        prefix = f"{currency} " if currency else ""
        return f"-{prefix}{abs(v):,.2f}" if v < 0 else f"{prefix}{v:,.2f}"
    if kind == "qty":
        v = float(value)
        return f"{v:,.3f}".rstrip("0").rstrip(".")
    if kind == "int":
        return f"{int(value):,}"
    if kind == "pct":
        return f"{float(value):.1f}%"
    if kind == "date" and isinstance(value, str) and len(value) == 10:
        d = date.fromisoformat(value)
        return f"{d.day} {d:%b %Y}"
    return str(value)


def generated_label(dt: datetime) -> str:
    local = dt.astimezone()
    return f"Generated {local.day} {local:%b %Y, %H:%M}"


def filename(report_type: str, period_label: str, ext: str) -> str:
    safe = "".join(c if c.isalnum() else "-" for c in period_label).strip("-")
    while "--" in safe:
        safe = safe.replace("--", "-")
    return f"bukuma-{report_type}-{safe}.{ext}".lower()
