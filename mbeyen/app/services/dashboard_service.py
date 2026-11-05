"""
Dashboard figures, calculated from actual records only.
`financials()` is the single source of truth for revenue/profit and is
reused by the reports module.
"""

from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import BusinessRuleError
from app.models import (
    Expense,
    Payment,
    PaymentStatus,
    Product,
    Purchase,
    PurchaseStatus,
    Sale,
    SaleItem,
    SaleStatus,
)
from app.schemas.dashboard import (
    Dashboard,
    Financials,
    LowStockItem,
    MethodTotal,
    Outstanding,
    TodaySnapshot,
    TopProduct,
    TrendPoint,
)
from app.schemas.sale import SaleSummaryRead
from app.services import expense_service, inventory_service
from app.utils.calculations import money
from app.utils.dates import days_between, previous_period

ZERO = Decimal("0")
MAX_DAYS_DAILY_TREND = 92


def _completed_sales(date_from: date, date_to: date):
    return (
        Sale.status == SaleStatus.COMPLETED,
        Sale.sale_date >= date_from,
        Sale.sale_date <= date_to,
    )


def financials(db: Session, date_from: date, date_to: date) -> Financials:
    revenue, count, sale_discounts = db.execute(
        select(func.sum(Sale.total), func.count(Sale.id), func.sum(Sale.discount)).where(
            *_completed_sales(date_from, date_to)
        )
    ).one()
    cogs, line_discounts = db.execute(
        select(func.sum(SaleItem.unit_cost * SaleItem.quantity), func.sum(SaleItem.discount))
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(*_completed_sales(date_from, date_to))
    ).one()
    expenses = db.scalar(
        select(func.sum(Expense.amount)).where(
            Expense.expense_date >= date_from, Expense.expense_date <= date_to
        )
    )
    purchases = db.scalar(
        select(func.sum(Purchase.total)).where(
            Purchase.status == PurchaseStatus.RECEIVED,
            Purchase.purchase_date >= date_from,
            Purchase.purchase_date <= date_to,
        )
    )

    revenue, cogs, expenses = money(revenue or 0), money(cogs or 0), money(expenses or 0)
    gross = revenue - cogs
    return Financials(
        revenue=revenue,
        cogs=cogs,
        gross_profit=gross,
        gross_margin_pct=round(float(gross / revenue * 100), 1) if revenue else None,
        expenses=expenses,
        net_profit=gross - expenses,
        sales_count=count or 0,
        average_sale=money(revenue / count) if count else ZERO,
        discounts_given=money((sale_discounts or 0)) + money(line_discounts or 0),
        purchases_total=money(purchases or 0),
    )


def _trend(db: Session, date_from: date, date_to: date) -> tuple[str, list[TrendPoint]]:
    revenue_rows = db.execute(
        select(Sale.sale_date, func.sum(Sale.total), func.count(Sale.id))
        .where(*_completed_sales(date_from, date_to))
        .group_by(Sale.sale_date)
    ).all()
    cogs_rows = db.execute(
        select(Sale.sale_date, func.sum(SaleItem.unit_cost * SaleItem.quantity))
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(*_completed_sales(date_from, date_to))
        .group_by(Sale.sale_date)
    ).all()

    monthly = (date_to - date_from).days + 1 > MAX_DAYS_DAILY_TREND
    bucket = (lambda d: d.replace(day=1)) if monthly else (lambda d: d)

    buckets: dict[date, list] = {}
    for d in days_between(date_from, date_to):
        buckets.setdefault(bucket(d), [ZERO, ZERO, 0])  # revenue, cogs, count
    for d, rev, n in revenue_rows:
        b = buckets[bucket(d)]
        b[0] += money(rev or 0)
        b[2] += n
    for d, cogs in cogs_rows:
        buckets[bucket(d)][1] += money(cogs or 0)

    points = [
        TrendPoint(period=p, revenue=rev, gross_profit=rev - cogs, sales_count=n)
        for p, (rev, cogs, n) in sorted(buckets.items())
    ]
    return ("month" if monthly else "day"), points


def _top_products(db: Session, date_from: date, date_to: date, limit: int = 5) -> list[TopProduct]:
    revenue = func.sum(SaleItem.line_total)
    rows = db.execute(
        select(
            Product.id,
            Product.name,
            Product.unit,
            func.sum(SaleItem.quantity),
            revenue,
            func.sum(SaleItem.unit_cost * SaleItem.quantity),
        )
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(*_completed_sales(date_from, date_to))
        .group_by(Product.id, Product.name, Product.unit)
        .order_by(revenue.desc())
        .limit(limit)
    ).all()
    return [
        TopProduct(
            product_id=pid, name=name, unit=unit, quantity=Decimal(str(qty)),
            revenue=money(rev), gross_profit=money(rev) - money(cost),
        )
        for pid, name, unit, qty, rev, cost in rows
    ]


def _money_in(db: Session, date_from: date, date_to: date) -> list[MethodTotal]:
    rows = db.execute(
        select(Payment.method, func.sum(Payment.amount))
        .join(Sale, Payment.sale_id == Sale.id)
        .where(
            Sale.status == SaleStatus.COMPLETED,
            Payment.payment_date >= date_from,
            Payment.payment_date <= date_to,
        )
        .group_by(Payment.method)
    ).all()
    totals = defaultdict(lambda: ZERO, {m: money(a) for m, a in rows})
    return sorted(
        (MethodTotal(method=m, amount=a) for m, a in totals.items()),
        key=lambda t: t.amount,
        reverse=True,
    )


def receivables(db: Session) -> Outstanding:
    total, n = db.execute(
        select(func.sum(Sale.total - Sale.amount_paid), func.count(Sale.id)).where(
            Sale.status == SaleStatus.COMPLETED, Sale.payment_status != PaymentStatus.PAID
        )
    ).one()
    return Outstanding(total=money(total or 0), count=n or 0)


def payables(db: Session) -> Outstanding:
    total, n = db.execute(
        select(func.sum(Purchase.total - Purchase.amount_paid), func.count(Purchase.id)).where(
            Purchase.status != PurchaseStatus.CANCELLED, Purchase.payment_status != PaymentStatus.PAID
        )
    ).one()
    return Outstanding(total=money(total or 0), count=n or 0)


def _today(db: Session, today: date) -> TodaySnapshot:
    f = financials(db, today, today)
    received = db.scalar(
        select(func.sum(Payment.amount))
        .join(Sale, Payment.sale_id == Sale.id)
        .where(Sale.status == SaleStatus.COMPLETED, Payment.payment_date == today)
    )
    return TodaySnapshot(
        revenue=f.revenue, sales_count=f.sales_count, gross_profit=f.gross_profit,
        money_received=money(received or 0),
    )


def build(db: Session, date_from: date, date_to: date) -> Dashboard:
    if date_from > date_to:
        raise BusinessRuleError("date_from must be on or before date_to")
    if (date_to - date_from).days > 366 * 3:
        raise BusinessRuleError("Please choose a period of 3 years or less")

    prev_from, prev_to = previous_period(date_from, date_to)
    grouping, trend = _trend(db, date_from, date_to)
    recent = db.scalars(
        select(Sale).options(selectinload(Sale.items)).order_by(Sale.created_at.desc(), Sale.id.desc()).limit(5)
    ).all()

    return Dashboard(
        date_from=date_from,
        date_to=date_to,
        trend_grouping=grouping,
        financials=financials(db, date_from, date_to),
        previous_financials=financials(db, prev_from, prev_to),
        today=_today(db, date.today()),
        money_in_by_method=_money_in(db, date_from, date_to),
        receivables=receivables(db),
        payables=payables(db),
        inventory=inventory_service.summary(db),
        sales_trend=trend,
        top_products=_top_products(db, date_from, date_to),
        expenses_by_category=expense_service.summary(db, date_from, date_to).by_category,
        low_stock=[LowStockItem.model_validate(p, from_attributes=True)
                   for p in inventory_service.low_stock_products(db)[:5]],
        recent_sales=[SaleSummaryRead.model_validate(s) for s in recent],
    )
