from math import ceil
from typing import Annotated

from fastapi import Depends, Query
from pydantic import BaseModel
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session


class PageParams(BaseModel):
    page: int = 1
    page_size: int = 25


def page_params(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
) -> PageParams:
    return PageParams(page=page, page_size=page_size)


Pagination = Annotated[PageParams, Depends(page_params)]


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


def paginate(db: Session, stmt: Select, params: PageParams) -> tuple[list, int]:
    """Run `stmt` for one page. Returns (rows, total_count)."""
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = list(db.scalars(stmt.limit(params.page_size).offset((params.page - 1) * params.page_size)))
    return rows, total


def build_page[T](items: list[T], total: int, params: PageParams) -> Page[T]:
    return Page[T](
        items=items,
        total=total,
        page=params.page,
        page_size=params.page_size,
        pages=ceil(total / params.page_size) if total else 0,
    )
