from fastapi import APIRouter, status

from app.dependencies import CurrentUser, DbSession
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(db: DbSession, _: CurrentUser):
    return category_service.list_with_counts(db)


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, db: DbSession, _: CurrentUser):
    return category_service.to_read(db, category_service.create(db, data))


@router.get("/{category_id}", response_model=CategoryRead)
def get_category(category_id: int, db: DbSession, _: CurrentUser):
    return category_service.to_read(db, category_service.get(db, category_id))


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(category_id: int, data: CategoryUpdate, db: DbSession, _: CurrentUser):
    return category_service.to_read(db, category_service.update(db, category_id, data))


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: DbSession, user: CurrentUser):
    category_service.delete(db, category_id, user)
