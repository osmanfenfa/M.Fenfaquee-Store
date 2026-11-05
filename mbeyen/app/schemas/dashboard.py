from datetime import date

from pydantic import BaseModel

from app.models import PaymentMethod
from app.schemas.common import MoneyOut, QuantityOut
from app.schemas.expense import ExpenseCategoryTotal
from app.schemas.inventory import InventorySummary
from app.schemas.sale import SaleSummaryRead


class Financials(BaseModel):
    """
    All figures come from recorded transactions in the period:
      revenue      = totals of completed (not voided) sales
      cogs         = cost of goods sold (unit cost at time of sale x quantity)
      gross_profit = revenue - cogs
      net_profit   = gross_profit - expenses
    """

    revenue: MoneyOut
    cogs: MoneyOut
    gross_profit: MoneyOut
    gross_margin_pct: float | None  # gross_profit / revenue x 100
    expenses: MoneyOut
    net_profit: MoneyOut
    sales_count: int
    average_sale: MoneyOut
    discounts_given: MoneyOut
    purchases_total: MoneyOut  # stock received in the period (cash-flow info, not a cost)


class TodaySnapshot(BaseModel):
    revenue: MoneyOut
    sales_count: int
    gross_profit: MoneyOut
    money_received: MoneyOut  # payments received today (incl. old credit sales)


class MethodTotal(BaseModel):
    method: PaymentMethod
    amount: MoneyOut


class Outstanding(BaseModel):
    total: MoneyOut
    count: int


class TrendPoint(BaseModel):
    period: date  # day, or first day of month when grouped monthly
    revenue: MoneyOut
    gross_profit: MoneyOut
    sales_count: int


class TopProduct(BaseModel):
    product_id: int
    name: str
    unit: str
    quantity: QuantityOut
    revenue: MoneyOut  # after line discounts
    gross_profit: MoneyOut


class LowStockItem(BaseModel):
    id: int
    name: str
    unit: str
    stock_quantity: QuantityOut
    reorder_level: QuantityOut


class Dashboard(BaseModel):
    date_from: date
    date_to: date
    trend_grouping: str  # "day" | "month"
    financials: Financials
    previous_financials: Financials  # same-length period just before, for % change
    today: TodaySnapshot
    money_in_by_method: list[MethodTotal]
    receivables: Outstanding  # customers owe the shop
    payables: Outstanding  # shop owes suppliers
    inventory: InventorySummary
    sales_trend: list[TrendPoint]
    top_products: list[TopProduct]
    expenses_by_category: list[ExpenseCategoryTotal]
    low_stock: list[LowStockItem]
    recent_sales: list[SaleSummaryRead]
