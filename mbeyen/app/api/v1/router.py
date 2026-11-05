from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    categories,
    dashboard,
    expenses,
    inventory,
    products,
    purchases,
    reports,
    sales,
    settings,
    suppliers,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(categories.router)
api_router.include_router(products.router)
api_router.include_router(inventory.router)
api_router.include_router(sales.router)
api_router.include_router(suppliers.router)
api_router.include_router(purchases.router)
api_router.include_router(expenses.router)
api_router.include_router(settings.router)
api_router.include_router(reports.router)

# All modules registered.
# (payments are handled under /sales/{id}/payments and /purchases/{id}/payments)
