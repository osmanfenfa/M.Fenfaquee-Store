"""Import every model here so SQLAlchemy relationships resolve and Alembic sees all tables."""

from app.models.audit_log import AuditLog
from app.models.category import Category
from app.models.expense import Expense
from app.models.expense_category import ExpenseCategory
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.product import Product
from app.models.purchase import Purchase, PurchaseStatus
from app.models.purchase_item import PurchaseItem
from app.models.sale import Sale, SaleStatus
from app.models.sale_item import SaleItem
from app.models.shop import Shop
from app.models.stock_movement import MovementType, StockMovement
from app.models.supplier import Supplier
from app.models.user import User

__all__ = [
    "AuditLog",
    "Category",
    "Expense",
    "ExpenseCategory",
    "MovementType",
    "Payment",
    "PaymentMethod",
    "PaymentStatus",
    "Product",
    "Purchase",
    "PurchaseItem",
    "PurchaseStatus",
    "Sale",
    "SaleItem",
    "SaleStatus",
    "Shop",
    "StockMovement",
    "Supplier",
    "User",
]

# Isolation safety net: loading another shop's row raises (see app.database.tenancy)
from app.database.tenancy import TenantMixin, register_load_guard  # noqa: E402

for _model in (Category, Expense, ExpenseCategory, Payment, Product, Purchase, PurchaseItem, Sale, SaleItem, StockMovement, Supplier, AuditLog):
    assert issubclass(_model, TenantMixin)
    register_load_guard(_model)
