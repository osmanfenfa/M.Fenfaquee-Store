"""
Multi-tenancy: each shop's data is walled off from every other shop.

Every shop-owned model inherits `TenantMixin` (a `shop_id` column). The
current shop is stored on the database session (`set_tenant`) as soon as the
logged-in user is known, and three hooks then enforce isolation centrally,
so no individual query can forget it:

1. Reads, bulk updates and deletes get `WHERE shop_id = <current shop>`
   added automatically (including counts, sums and joins).
2. New rows are stamped with the current shop when saved.
3. Safety net: loading a row that belongs to another shop raises an error.

With no shop set, queries on shop data return nothing ("fail closed").
Platform-admin code uses `ALL_SHOPS` to see every shop on purpose.
"""

from sqlalchemy import ForeignKey, event, false
from sqlalchemy.orm import (
    Mapped,
    ORMExecuteState,
    Session,
    declared_attr,
    mapped_column,
    with_loader_criteria,
)

TENANT_KEY = "tenant_shop_id"
ALL_SHOPS = "__all_shops__"


class TenantViolation(RuntimeError):
    """Raised if code tries to read or write another shop's data."""


class TenantMixin:
    @declared_attr
    def shop_id(cls) -> Mapped[int]:
        return mapped_column(ForeignKey("shops.id", ondelete="CASCADE"), index=True, nullable=False)


def set_tenant(session: Session, shop_id: int | str | None) -> None:
    session.info[TENANT_KEY] = shop_id


def get_tenant(session: Session) -> int | str | None:
    return session.info.get(TENANT_KEY)


@event.listens_for(Session, "do_orm_execute")
def _scope_to_current_shop(state: ORMExecuteState) -> None:
    if not (state.is_select or state.is_update or state.is_delete):
        return
    # Lazy/column loads inherit the criteria from the statement that loaded the parent
    if state.is_column_load or state.is_relationship_load:
        return
    tenant = get_tenant(state.session)
    if tenant == ALL_SHOPS:
        return
    if isinstance(tenant, int):
        criteria = lambda cls: cls.shop_id == tenant  # noqa: E731
    else:
        criteria = lambda cls: false()  # noqa: E731  (no shop known: see nothing)
    state.statement = state.statement.options(with_loader_criteria(TenantMixin, criteria, include_aliases=True))


@event.listens_for(Session, "before_flush")
def _stamp_new_rows(session: Session, _flush_context, _instances) -> None:
    tenant = get_tenant(session)
    for obj in session.new:
        if not isinstance(obj, TenantMixin):
            continue
        if obj.shop_id is None:
            if not isinstance(tenant, int):
                raise TenantViolation(f"Cannot save {type(obj).__name__}: no shop is selected")
            obj.shop_id = tenant
        elif isinstance(tenant, int) and obj.shop_id != tenant:
            raise TenantViolation(f"Cannot save {type(obj).__name__} into another shop")


def _check_loaded(target: TenantMixin, context) -> None:
    tenant = get_tenant(context.session)
    if isinstance(tenant, int) and target.shop_id != tenant:
        raise TenantViolation(f"{type(target).__name__} {getattr(target, 'id', '?')} belongs to another shop")


def register_load_guard(cls: type) -> None:
    """Called for every tenant model (see app.models) — the last line of defence."""
    event.listen(cls, "load", _check_loaded)
