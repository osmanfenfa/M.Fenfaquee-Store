"""
Operating expenses (rent, power, transport...). They don't touch stock, so
unlike sales/purchases they can be edited or deleted directly — every
change is written to the audit log.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Expense, ExpenseCategory, PaymentMethod, User
from app.schemas.expense import (
    ExpenseCategoryCreate,
    ExpenseCategoryRead,
    ExpenseCategoryTotal,
    ExpenseCreate,
    ExpenseSummary,
    ExpenseUpdate,
)
from app.services import audit_service
from app.utils.calculations import money
from app.utils.pagination import PageParams, paginate

# ---------- categories ----------


def _ensure_unique_category(db: Session, name: str, exclude_id: int | None = None) -> None:
    stmt = select(ExpenseCategory.id).where(func.lower(ExpenseCategory.name) == name.lower())
    if exclude_id is not None:
        stmt = stmt.where(ExpenseCategory.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise ConflictError(f"An expense category named '{name}' already exists")


def get_category(db: Session, category_id: int) -> ExpenseCategory:
    cat = db.get(ExpenseCategory, category_id)
    if cat is None:
        raise NotFoundError(f"Expense category {category_id} not found")
    return cat


def list_categories(db: Session) -> list[ExpenseCategoryRead]:
    count = (
        select(func.count(Expense.id))
        .where(Expense.category_id == ExpenseCategory.id)
        .correlate(ExpenseCategory)
        .scalar_subquery()
    )
    rows = db.execute(select(ExpenseCategory, count).order_by(ExpenseCategory.name)).all()
    return [
        ExpenseCategoryRead.model_validate(c).model_copy(update={"expense_count": n}) for c, n in rows
    ]


def create_category(db: Session, data: ExpenseCategoryCreate) -> ExpenseCategory:
    name = data.name.strip()
    _ensure_unique_category(db, name)
    cat = ExpenseCategory(name=name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def rename_category(db: Session, category_id: int, data: ExpenseCategoryCreate) -> ExpenseCategory:
    cat = get_category(db, category_id)
    name = data.name.strip()
    _ensure_unique_category(db, name, exclude_id=cat.id)
    cat.name = name
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, category_id: int) -> None:
    cat = get_category(db, category_id)
    used = db.scalar(select(func.count(Expense.id)).where(Expense.category_id == cat.id))
    if used:
        raise ConflictError(f"'{cat.name}' has {used} expense(s) and cannot be deleted")
    db.delete(cat)
    db.commit()


# ---------- expenses ----------


def get(db: Session, expense_id: int) -> Expense:
    expense = db.scalar(
        select(Expense)
        .options(joinedload(Expense.category))
        .where(Expense.id == expense_id)
        .execution_options(populate_existing=True)
    )
    if expense is None:
        raise NotFoundError(f"Expense {expense_id} not found")
    return expense


def list_expenses(
    db: Session,
    params: PageParams,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    category_id: int | None = None,
    payment_method: PaymentMethod | None = None,
    search: str | None = None,
) -> tuple[list[Expense], int]:
    stmt = select(Expense).options(joinedload(Expense.category))
    if date_from:
        stmt = stmt.where(Expense.expense_date >= date_from)
    if date_to:
        stmt = stmt.where(Expense.expense_date <= date_to)
    if category_id:
        stmt = stmt.where(Expense.category_id == category_id)
    if payment_method:
        stmt = stmt.where(Expense.payment_method == payment_method)
    if search:
        stmt = stmt.where(func.lower(Expense.description).like(f"%{search.strip().lower()}%"))
    stmt = stmt.order_by(Expense.expense_date.desc(), Expense.id.desc())
    return paginate(db, stmt, params)


def create(db: Session, data: ExpenseCreate, user: User) -> Expense:
    get_category(db, data.category_id)
    expense = Expense(
        category_id=data.category_id,
        expense_date=data.expense_date,
        amount=money(data.amount),
        description=data.description.strip(),
        payment_method=data.payment_method,
        reference=(data.reference or "").strip() or None,
        notes=data.notes,
        created_by_id=user.id,
    )
    db.add(expense)
    db.commit()
    return get(db, expense.id)


def update(db: Session, expense_id: int, data: ExpenseUpdate, user: User) -> Expense:
    expense = get(db, expense_id)
    changes = {
        k: v
        for k, v in data.model_dump(exclude_unset=True).items()
        # required fields can't be cleared
        if v is not None or k in ("reference", "notes")
    }
    if "category_id" in changes:
        get_category(db, changes["category_id"])
    if "description" in changes:
        changes["description"] = changes["description"].strip()

    audit = {k: f"{getattr(expense, k)} -> {v}" for k, v in changes.items() if getattr(expense, k) != v}
    for k, v in changes.items():
        setattr(expense, k, v)
    if audit:
        audit_service.log(db, user, "update", "expense", expense.id, audit)
    db.commit()
    return get(db, expense.id)


def delete(db: Session, expense_id: int, user: User) -> None:
    expense = get(db, expense_id)
    audit_service.log(
        db, user, "delete", "expense", expense.id,
        {"date": expense.expense_date, "amount": expense.amount, "description": expense.description,
         "category": expense.category.name},
    )
    db.delete(expense)
    db.commit()


def summary(db: Session, date_from: date, date_to: date) -> ExpenseSummary:
    rows = db.execute(
        select(ExpenseCategory.id, ExpenseCategory.name, func.sum(Expense.amount), func.count(Expense.id))
        .join(Expense, Expense.category_id == ExpenseCategory.id)
        .where(Expense.expense_date >= date_from, Expense.expense_date <= date_to)
        .group_by(ExpenseCategory.id, ExpenseCategory.name)
        .order_by(func.sum(Expense.amount).desc())
    ).all()
    by_category = [
        ExpenseCategoryTotal(category_id=cid, category_name=name, total=money(total), count=n)
        for cid, name, total, n in rows
    ]
    return ExpenseSummary(
        date_from=date_from,
        date_to=date_to,
        total=sum((c.total for c in by_category), Decimal("0")),
        count=sum(c.count for c in by_category),
        by_category=by_category,
    )
