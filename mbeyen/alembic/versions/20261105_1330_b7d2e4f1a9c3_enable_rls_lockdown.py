"""Enable Row Level Security on all tables (Supabase lockdown)

Supabase exposes the `public` schema through its auto-generated Data API using
a publishable "anon" key. With RLS enabled and NO policies, that API can't
read or write anything. Bu'kuma's backend connects as the table owner,
which bypasses RLS, so the app is unaffected.

Revision ID: b7d2e4f1a9c3
Revises: ebc94e000a26
Create Date: 2026-11-05 13:30:00
"""
from typing import Sequence, Union

from alembic import op

revision: str = "b7d2e4f1a9c3"
down_revision: Union[str, Sequence[str], None] = "ebc94e000a26"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = [
    "alembic_version", "audit_logs", "categories", "expense_categories", "expenses", "payments",
    "products", "purchase_items", "purchases", "sale_items", "sales", "shop_settings",
    "stock_movements", "suppliers", "users",
]


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for t in TABLES:
        op.execute(f'ALTER TABLE "{t}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for t in TABLES:
        op.execute(f'ALTER TABLE "{t}" DISABLE ROW LEVEL SECURITY')
