"""Multi-tenancy: shops table, shop_id on all shop data, per-shop uniqueness

Existing data (from the single-shop version) becomes Shop 1, named from the
old shop_settings row. Safe on an empty database too.

Revision ID: c4f8a1d2e6b7
Revises: b7d2e4f1a9c3
Create Date: 2026-11-06 17:00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c4f8a1d2e6b7"
down_revision: Union[str, Sequence[str], None] = "b7d2e4f1a9c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TENANT_TABLES = [
    "categories",
    "expense_categories",
    "suppliers",
    "audit_logs",
    "expenses",
    "products",
    "purchases",
    "sales",
    "payments",
    "purchase_items",
    "sale_items",
    "stock_movements",
]
# (table, old unique constraint, old column, new constraint name)
UNIQUES = [
    ("categories", "uq_categories_name", "name", "uq_categories_shop_name"),
    ("expense_categories", "uq_expense_categories_name", "name", "uq_expense_categories_shop_name"),
    ("products", "uq_products_sku", "sku", "uq_products_shop_sku"),
    ("sales", "uq_sales_reference", "reference", "uq_sales_shop_reference"),
    ("purchases", "uq_purchases_reference", "reference", "uq_purchases_shop_reference"),
]
DEFAULT_SHOP_NAME = "M.Fenfaquee Enterprise"


def _has_any_data(conn) -> bool:
    for t in ["users", *TENANT_TABLES]:
        if conn.execute(sa.text(f'SELECT 1 FROM "{t}" LIMIT 1')).first():
            return True
    return False


def upgrade() -> None:
    conn = op.get_bind()
    is_pg = conn.dialect.name == "postgresql"

    op.create_table(
        "shops",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(length=60), nullable=True),
        sa.Column("receipt_note", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_shops")),
    )

    # ---- existing single-shop data becomes Shop 1
    shop_created = False
    if _has_any_data(conn):
        row = conn.execute(sa.text("SELECT shop_name, address, phone, receipt_note FROM shop_settings ORDER BY id LIMIT 1")).first()
        name, address, phone, note = row if row else (DEFAULT_SHOP_NAME, None, None, "Thank you for your business!")
        conn.execute(
            sa.text("INSERT INTO shops (id, name, address, phone, receipt_note, is_active) VALUES (1, :n, :a, :p, :r, :act)"),
            {"n": name or DEFAULT_SHOP_NAME, "a": address, "p": phone, "r": note, "act": True},
        )
        if is_pg:  # keep the id sequence ahead of the explicit id
            conn.execute(sa.text("SELECT setval(pg_get_serial_sequence('shops', 'id'), (SELECT MAX(id) FROM shops))"))
        shop_created = True

    # ---- shop_id on every shop-owned table
    for t in TENANT_TABLES:
        with op.batch_alter_table(t) as b:
            b.add_column(sa.Column("shop_id", sa.Integer(), nullable=True))
        if shop_created:
            conn.execute(sa.text(f'UPDATE "{t}" SET shop_id = 1'))
        with op.batch_alter_table(t) as b:
            b.alter_column("shop_id", existing_type=sa.Integer(), nullable=False)
            b.create_foreign_key(op.f(f"fk_{t}_shop_id_shops"), "shops", ["shop_id"], ["id"], ondelete="CASCADE")
            b.create_index(op.f(f"ix_{t}_shop_id"), ["shop_id"], unique=False)

    # ---- names / codes / references unique per shop instead of globally
    for t, old, col, new in UNIQUES:
        with op.batch_alter_table(t) as b:
            b.drop_constraint(old, type_="unique")
            b.create_unique_constraint(new, ["shop_id", col])

    # ---- users belong to a shop, have a role, may be platform admin
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("shop_id", sa.Integer(), nullable=True))
        b.add_column(sa.Column("role", sa.String(length=20), server_default="owner", nullable=False))
        b.add_column(sa.Column("is_superadmin", sa.Boolean(), server_default=sa.false(), nullable=False))
        b.create_foreign_key(op.f("fk_users_shop_id_shops"), "shops", ["shop_id"], ["id"], ondelete="CASCADE")
        b.create_index(op.f("ix_users_shop_id"), ["shop_id"], unique=False)
    if shop_created:
        conn.execute(sa.text("UPDATE users SET shop_id = 1"))

    # ---- shop details now live on the shop itself
    op.drop_table("shop_settings")

    if is_pg:  # same Supabase lockdown as every other table
        op.execute('ALTER TABLE "shops" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    """Back to single-shop. Only safe while there is just ONE shop (other shops' rows are deleted)."""
    conn = op.get_bind()
    op.create_table(
        "shop_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("shop_name", sa.String(length=150), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(length=60), nullable=True),
        sa.Column("receipt_note", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_shop_settings")),
    )
    first = conn.execute(sa.text("SELECT id, name, address, phone, receipt_note FROM shops ORDER BY id LIMIT 1")).first()
    if first:
        conn.execute(
            sa.text("INSERT INTO shop_settings (id, shop_name, address, phone, receipt_note) VALUES (1, :n, :a, :p, :r)"),
            {"n": first[1], "a": first[2], "p": first[3], "r": first[4]},
        )
        for t in reversed(TENANT_TABLES):
            conn.execute(sa.text(f'DELETE FROM "{t}" WHERE shop_id <> :s'), {"s": first[0]})
        conn.execute(sa.text("DELETE FROM users WHERE shop_id IS NOT NULL AND shop_id <> :s"), {"s": first[0]})

    with op.batch_alter_table("users") as b:
        b.drop_index(op.f("ix_users_shop_id"))
        b.drop_constraint(op.f("fk_users_shop_id_shops"), type_="foreignkey")
        b.drop_column("is_superadmin")
        b.drop_column("role")
        b.drop_column("shop_id")

    for t, old, col, new in UNIQUES:
        with op.batch_alter_table(t) as b:
            b.drop_constraint(new, type_="unique")
            b.create_unique_constraint(old, [col])

    for t in TENANT_TABLES:
        with op.batch_alter_table(t) as b:
            b.drop_index(op.f(f"ix_{t}_shop_id"))
            b.drop_constraint(op.f(f"fk_{t}_shop_id_shops"), type_="foreignkey")
            b.drop_column("shop_id")

    op.drop_table("shops")
