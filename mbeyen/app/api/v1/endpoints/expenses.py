from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.dependencies import CurrentUser, DbSession
from app.models import PaymentMethod
from app.schemas.expense import (
    ExpenseCategoryCreate,
    ExpenseCategoryRead,
    ExpenseCreate,
    ExpenseRead,
    ExpenseSummary,
    ExpenseUpdate,
)
from app.services import expense_service
from app.utils.dates import month_to_date
from app.utils.pagination import Page, Pagination, build_page

router = APIRouter(prefix="/expenses", tags=["expenses"])


# ---------- categories (declared before /{expense_id}) ----------

@router.get("/categories", response_model=list[ExpenseCategoryRead])
def list_categories(db: DbSession, _: CurrentUser):
    return expense_service.list_categories(db)


@router.post("/categories", response_model=ExpenseCategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(data: ExpenseCategoryCreate, db: DbSession, _: CurrentUser):
    return expense_service.create_category(db, data)


@router.patch("/categories/{category_id}", response_model=ExpenseCategoryRead)
def rename_category(category_id: int, data: ExpenseCategoryCreate, db: DbSession, _: CurrentUser):
    return expense_service.rename_category(db, category_id, data)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: DbSession, _: CurrentUser):
    expense_service.delete_category(db, category_id)


# ---------- expenses ----------

@router.get("/summary", response_model=ExpenseSummary)
def expense_summary(db: DbSession, _: CurrentUser, date_from: date | None = None, date_to: date | None = None):
    """Totals by category. Defaults to the current month to date."""
    default_from, default_to = month_to_date()
    return expense_service.summary(db, date_from or default_from, date_to or default_to)


@router.get("", response_model=Page[ExpenseRead])
def list_expenses(
    db: DbSession,
    _: CurrentUser,
    pagination: Pagination,
    date_from: date | None = None,
    date_to: date | None = None,
    category_id: int | None = None,
    payment_method: PaymentMethod | None = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
):
    items, total = expense_service.list_expenses(
        db, pagination, date_from=date_from, date_to=date_to, category_id=category_id,
        payment_method=payment_method, search=search,
    )
    return build_page([ExpenseRead.model_validate(e) for e in items], total, pagination)


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(data: ExpenseCreate, db: DbSession, user: CurrentUser):
    return expense_service.create(db, data, user)


@router.get("/{expense_id}", response_model=ExpenseRead)
def get_expense(expense_id: int, db: DbSession, _: CurrentUser):
    return expense_service.get(db, expense_id)


@router.patch("/{expense_id}", response_model=ExpenseRead)
def update_expense(expense_id: int, data: ExpenseUpdate, db: DbSession, user: CurrentUser):
    return expense_service.update(db, expense_id, data, user)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, db: DbSession, user: CurrentUser):
    expense_service.delete(db, expense_id, user)
