"""
Builds the four reports from actual records. Revenue/profit figures reuse
dashboard_service.financials() so reports and dashboard always agree.
"""

from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BusinessRuleError
from app.models import (
    Category,
    Expense,
    ExpenseCategory,
    PaymentStatus,
    Product,
    Purchase,
    PurchaseStatus,
    Sale,
    SaleItem,
    SaleStatus,
    Supplier,
)
from app.schemas.reports import Column, Report, ReportTable, ReportType, SummaryItem
from app.services import dashboard_service, inventory_service
from app.utils.calculations import money

MAX_RANGE_DAYS = 366 * 3


def _f(v) -> float:
    """Money/quantity to a JSON-friendly float, rounded to cents."""
    return float(money(v or 0))


def _q(v) -> float:
    return float(Decimal(str(v or 0)).normalize())


def _d(d: date) -> str:
    return f"{d.day} {d:%b %Y}"


def _period(date_from: date, date_to: date) -> str:
    return _d(date_from) if date_from == date_to else f"{_d(date_from)} – {_d(date_to)}"


def _check_range(date_from: date, date_to: date) -> None:
    if date_from > date_to:
        raise BusinessRuleError("The start date must be on or before the end date")
    if (date_to - date_from).days > MAX_RANGE_DAYS:
        raise BusinessRuleError("Please choose a period of 3 years or less")


def _completed(date_from: date, date_to: date):
    return (Sale.status == SaleStatus.COMPLETED, Sale.sale_date >= date_from, Sale.sale_date <= date_to)


# ---------------------------------------------------------------- sales


def sales_report(db: Session, date_from: date, date_to: date) -> Report:
    _check_range(date_from, date_to)
    fin = dashboard_service.financials(db, date_from, date_to)

    day_rev = db.execute(
        select(Sale.sale_date, func.count(Sale.id), func.sum(Sale.total), func.sum(Sale.discount))
        .where(*_completed(date_from, date_to))
        .group_by(Sale.sale_date)
    ).all()
    day_cogs = dict(
        db.execute(
            select(Sale.sale_date, func.sum(SaleItem.unit_cost * SaleItem.quantity))
            .join(Sale, SaleItem.sale_id == Sale.id)
            .where(*_completed(date_from, date_to))
            .group_by(Sale.sale_date)
        ).all()
    )
    by_day = []
    for d, n, rev, _disc in sorted(day_rev):
        rev, cogs = money(rev or 0), money(day_cogs.get(d) or 0)
        by_day.append([d.isoformat(), n, float(rev), float(cogs), float(rev - cogs)])

    revenue = func.sum(SaleItem.line_total)
    prod_rows = db.execute(
        select(
            Product.name,
            Category.name,
            Product.unit,
            func.sum(SaleItem.quantity),
            revenue,
            func.sum(SaleItem.unit_cost * SaleItem.quantity),
        )
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .outerjoin(Category, Product.category_id == Category.id)
        .where(*_completed(date_from, date_to))
        .group_by(Product.id, Product.name, Category.name, Product.unit)
        .order_by(revenue.desc())
    ).all()
    by_product = []
    for name, cat, unit, qty, rev, cogs in prod_rows:
        rev, cogs = money(rev), money(cogs)
        margin = float((rev - cogs) / rev * 100) if rev else None
        by_product.append([name, cat or "—", unit, _q(qty), float(rev), float(cogs), float(rev - cogs), round(margin, 1) if margin is not None else None])

    line_revenue = sum((r[4] for r in by_product), 0.0)
    sale_level_discount = round(line_revenue - float(fin.revenue), 2)

    return Report(
        type=ReportType.SALES,
        title="Sales report",
        period_label=_period(date_from, date_to),
        date_from=date_from,
        date_to=date_to,
        generated_at=datetime.now(UTC),
        summary=[
            SummaryItem(label="Revenue", value=_f(fin.revenue), emphasis=True),
            SummaryItem(label="Number of sales", value=fin.sales_count, kind="int"),
            SummaryItem(label="Average sale", value=_f(fin.average_sale)),
            SummaryItem(label="Cost of goods sold", value=_f(fin.cogs)),
            SummaryItem(label="Gross profit", value=_f(fin.gross_profit), emphasis=True),
            SummaryItem(label="Gross margin", value=fin.gross_margin_pct, kind="pct"),
            SummaryItem(label="Discounts given", value=_f(fin.discounts_given)),
        ],
        tables=[
            ReportTable(
                title="Sales by day",
                columns=[
                    Column(key="date", label="Date", kind="date"),
                    Column(key="count", label="Sales", kind="int"),
                    Column(key="revenue", label="Revenue", kind="money"),
                    Column(key="cogs", label="Cost of goods", kind="money"),
                    Column(key="profit", label="Gross profit", kind="money"),
                ],
                rows=by_day,
                totals=["Total", fin.sales_count, _f(fin.revenue), _f(fin.cogs), _f(fin.gross_profit)],
            ),
            ReportTable(
                title="Sales by product",
                columns=[
                    Column(key="product", label="Product"),
                    Column(key="category", label="Category"),
                    Column(key="unit", label="Unit"),
                    Column(key="qty", label="Qty sold", kind="qty"),
                    Column(key="revenue", label="Revenue", kind="money"),
                    Column(key="cogs", label="Cost of goods", kind="money"),
                    Column(key="profit", label="Gross profit", kind="money"),
                    Column(key="margin", label="Margin", kind="pct"),
                ],
                rows=by_product,
                totals=[
                    "Total", None, None, None,
                    round(line_revenue, 2), _f(fin.cogs), round(line_revenue - float(fin.cogs), 2), None,
                ],
                note=(
                    f"Product revenue is after line discounts. Discounts on whole sales "
                    f"(NLe {sale_level_discount:,.2f}) are not split across products."
                    if sale_level_discount > 0 else None
                ),
            ),
        ],
    )


# ---------------------------------------------------------------- profit & loss


def profit_loss_report(db: Session, date_from: date, date_to: date) -> Report:
    _check_range(date_from, date_to)
    fin = dashboard_service.financials(db, date_from, date_to)
    exp_rows = db.execute(
        select(ExpenseCategory.name, func.sum(Expense.amount))
        .join(Expense, Expense.category_id == ExpenseCategory.id)
        .where(Expense.expense_date >= date_from, Expense.expense_date <= date_to)
        .group_by(ExpenseCategory.name)
        .order_by(func.sum(Expense.amount).desc())
    ).all()

    rev = float(fin.revenue)

    def pct(v: float) -> float | None:
        return round(v / rev * 100, 1) if rev else None

    rows: list[list] = [
        ["Sales revenue", rev, pct(rev)],
        ["Less: cost of goods sold", -_f(fin.cogs), pct(-_f(fin.cogs))],
        ["Gross profit", _f(fin.gross_profit), pct(_f(fin.gross_profit))],
        ["Operating expenses", None, None],
    ]
    for name, amount in exp_rows:
        rows.append([f"    {name}", -_f(amount), pct(-_f(amount))])
    rows.append(["Total expenses", -_f(fin.expenses), pct(-_f(fin.expenses))])

    return Report(
        type=ReportType.PROFIT_LOSS,
        title="Profit & loss",
        period_label=_period(date_from, date_to),
        date_from=date_from,
        date_to=date_to,
        generated_at=datetime.now(UTC),
        summary=[
            SummaryItem(label="Revenue", value=rev),
            SummaryItem(label="Gross profit", value=_f(fin.gross_profit)),
            SummaryItem(label="Expenses", value=_f(fin.expenses)),
            SummaryItem(label="Net profit", value=_f(fin.net_profit), emphasis=True),
        ],
        tables=[
            ReportTable(
                title="Statement",
                columns=[
                    Column(key="item", label="Item"),
                    Column(key="amount", label="Amount", kind="money"),
                    Column(key="pct", label="% of revenue", kind="pct"),
                ],
                rows=rows,
                totals=["Net profit", _f(fin.net_profit), pct(_f(fin.net_profit))],
                note=(
                    f"Based on {fin.sales_count} completed sales (voided sales excluded). "
                    f"Cost of goods uses each product's cost at the time of sale. "
                    f"Stock purchased in the period (NLe {float(fin.purchases_total):,.2f}) is not an expense — "
                    f"it becomes cost of goods when sold."
                ),
            )
        ],
    )


# ---------------------------------------------------------------- stock


def stock_report(db: Session) -> Report:
    inv = inventory_service.summary(db)
    products = db.scalars(
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.is_active.is_(True))
        .order_by(case((Product.category_id.is_(None), 1), else_=0), Product.category_id, Product.name)
    ).all()
    rows = []
    for p in products:
        status = "Out of stock" if p.stock_quantity <= 0 else "Low" if p.is_low_stock else "OK"
        rows.append([
            p.name, p.sku or "", p.category_name or "—", p.unit, _q(p.stock_quantity), _q(p.reorder_level),
            _f(p.cost_price), _f(p.stock_value), _f(p.selling_price), _f(p.stock_quantity * p.selling_price), status,
        ])
    today = date.today()
    return Report(
        type=ReportType.STOCK,
        title="Stock report",
        period_label=f"As of {_d(today)}",
        date_from=None,
        date_to=today,
        generated_at=datetime.now(UTC),
        summary=[
            SummaryItem(label="Active products", value=inv.active_products, kind="int"),
            SummaryItem(label="Low stock", value=inv.low_stock_count, kind="int"),
            SummaryItem(label="Out of stock", value=inv.out_of_stock_count, kind="int"),
            SummaryItem(label="Stock value at cost", value=_f(inv.stock_value_cost), emphasis=True),
            SummaryItem(label="Stock value at selling price", value=_f(inv.stock_value_retail)),
        ],
        tables=[
            ReportTable(
                title="Stock on hand",
                columns=[
                    Column(key="product", label="Product"),
                    Column(key="sku", label="SKU"),
                    Column(key="category", label="Category"),
                    Column(key="unit", label="Unit"),
                    Column(key="qty", label="In stock", kind="qty"),
                    Column(key="reorder", label="Reorder at", kind="qty"),
                    Column(key="cost", label="Avg cost", kind="money"),
                    Column(key="value_cost", label="Value (cost)", kind="money"),
                    Column(key="price", label="Price", kind="money"),
                    Column(key="value_retail", label="Value (price)", kind="money"),
                    Column(key="status", label="Status"),
                ],
                rows=rows,
                totals=["Total", None, None, None, None, None, None, _f(inv.stock_value_cost), None, _f(inv.stock_value_retail), None],
            )
        ],
    )


# ---------------------------------------------------------------- money owed


def money_owed_report(db: Session) -> Report:
    today = date.today()
    sales = db.scalars(
        select(Sale)
        .where(Sale.status == SaleStatus.COMPLETED, Sale.payment_status != PaymentStatus.PAID)
        .order_by(Sale.sale_date, Sale.id)
    ).all()
    purchases = db.execute(
        select(Purchase, Supplier.name)
        .outerjoin(Supplier, Purchase.supplier_id == Supplier.id)
        .where(Purchase.status != PurchaseStatus.CANCELLED, Purchase.payment_status != PaymentStatus.PAID)
        .order_by(Purchase.purchase_date, Purchase.id)
    ).all()

    recv_rows = [
        [s.reference, s.sale_date.isoformat(), s.customer_name or "—", _f(s.total), _f(s.amount_paid), _f(s.balance_due), (today - s.sale_date).days]
        for s in sales
    ]
    pay_rows = [
        [p.reference, p.purchase_date.isoformat(), name or "—", p.supplier_invoice_no or "", _f(p.total), _f(p.amount_paid), _f(p.balance_due), (today - p.purchase_date).days]
        for p, name in purchases
    ]
    recv_total = round(sum(r[5] for r in recv_rows), 2)
    pay_total = round(sum(r[6] for r in pay_rows), 2)

    return Report(
        type=ReportType.MONEY_OWED,
        title="Money owed",
        period_label=f"As of {_d(today)}",
        date_from=None,
        date_to=today,
        generated_at=datetime.now(UTC),
        summary=[
            SummaryItem(label="Customers owe you", value=recv_total, emphasis=True),
            SummaryItem(label="Unpaid sales", value=len(recv_rows), kind="int"),
            SummaryItem(label="You owe suppliers", value=pay_total, emphasis=True),
            SummaryItem(label="Unpaid purchases", value=len(pay_rows), kind="int"),
        ],
        tables=[
            ReportTable(
                title="Customers who owe you",
                columns=[
                    Column(key="ref", label="Sale"),
                    Column(key="date", label="Date", kind="date"),
                    Column(key="customer", label="Customer"),
                    Column(key="total", label="Total", kind="money"),
                    Column(key="paid", label="Paid", kind="money"),
                    Column(key="balance", label="Balance", kind="money"),
                    Column(key="days", label="Days owed", kind="int"),
                ],
                rows=recv_rows,
                totals=["Total", None, None, None, None, recv_total, None],
            ),
            ReportTable(
                title="Suppliers you owe",
                columns=[
                    Column(key="ref", label="Purchase"),
                    Column(key="date", label="Date", kind="date"),
                    Column(key="supplier", label="Supplier"),
                    Column(key="invoice", label="Invoice"),
                    Column(key="total", label="Total", kind="money"),
                    Column(key="paid", label="Paid", kind="money"),
                    Column(key="balance", label="Balance", kind="money"),
                    Column(key="days", label="Days owed", kind="int"),
                ],
                rows=pay_rows,
                totals=["Total", None, None, None, None, None, pay_total, None],
            ),
        ],
    )


def build(db: Session, report_type: ReportType, date_from: date, date_to: date) -> Report:
    match report_type:
        case ReportType.SALES:
            return sales_report(db, date_from, date_to)
        case ReportType.PROFIT_LOSS:
            return profit_loss_report(db, date_from, date_to)
        case ReportType.STOCK:
            return stock_report(db)
        case ReportType.MONEY_OWED:
            return money_owed_report(db)
