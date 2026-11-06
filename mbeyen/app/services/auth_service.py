from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User


def get_user_by_username(db: Session, username: str) -> User | None:
    # Usernames are case-insensitive for login, and unique across all shops
    return db.scalar(select(User).where(func.lower(User.username) == username.strip().lower()))


def authenticate(db: Session, username: str, password: str) -> User | None:
    user = get_user_by_username(db, username)
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def shop_is_suspended(user: User) -> bool:
    return user.shop is not None and not user.shop.is_active


def change_password(db: Session, user: User, current_password: str, new_password: str) -> bool:
    if not verify_password(current_password, user.password_hash):
        return False
    user.password_hash = hash_password(new_password)
    db.commit()
    return True
