"""
One generic report shape, rendered three ways: on-screen preview (JSON),
PDF and Excel. Each report = summary figures + one or more tables.
"""

from datetime import date, datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel

Kind = Literal["text", "money", "qty", "int", "date", "pct"]
Cell = str | int | float | None


class ReportType(StrEnum):
    SALES = "sales"
    PROFIT_LOSS = "profit-loss"
    STOCK = "stock"
    MONEY_OWED = "money-owed"


class SummaryItem(BaseModel):
    label: str
    value: Cell
    kind: Kind = "money"
    emphasis: bool = False  # e.g. net profit


class Column(BaseModel):
    key: str
    label: str
    kind: Kind = "text"


class ReportTable(BaseModel):
    title: str
    columns: list[Column]
    rows: list[list[Cell]]
    totals: list[Cell] | None = None  # same length as columns; None cells left blank
    note: str | None = None


class Report(BaseModel):
    type: ReportType
    title: str
    period_label: str  # "1 Nov 2026 – 5 Nov 2026" or "As of 5 Nov 2026"
    date_from: date | None
    date_to: date | None
    generated_at: datetime
    summary: list[SummaryItem]
    tables: list[ReportTable]
