from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User


def get_user_by_username(db: Session, username: str) -> User | None:
    # Usernames are case-insensitive for login
    return db.scalar(select(User).where(func.lower(User.username) == username.strip().lower()))


def authenticate(db: Session, username: str, password: str) -> User | None:
    user = get_user_by_username(db, username)
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def owner_exists(db: Session) -> bool:
    return db.scalar(select(func.count()).select_from(User)) > 0


def create_owner(db: Session, username: str, full_name: str, password: str) -> User:
    """Create the single shop owner account. Refuses if an account already exists."""
    if owner_exists(db):
        raise ValueError("An owner account already exists.")
    user = User(
        username=username.strip().lower(),
        full_name=full_name.strip(),
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> bool:
    if not verify_password(current_password, user.password_hash):
        return False
    user.password_hash = hash_password(new_password)
    db.commit()
    return True
