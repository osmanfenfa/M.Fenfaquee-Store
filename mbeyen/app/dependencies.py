from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.database.session import get_db
from app.database.tenancy import ALL_SHOPS, set_tenant
from app.models import User
from app.services.auth_service import shop_is_suspended

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

DbSession = Annotated[Session, Depends(get_db)]

SUSPENDED_MESSAGE = "This shop's account is suspended. Please contact Bu'kuma support."


def _authenticated_user(db: DbSession, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = decode_access_token(token)
    if user_id is None or not user_id.isdigit():
        raise credentials_error
    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise credentials_error
    return user


def get_current_user(db: DbSession, user: Annotated[User, Depends(_authenticated_user)]) -> User:
    """A shop user. From here on, every query on this session sees ONLY their shop."""
    if user.shop_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account isn't linked to a shop")
    if shop_is_suspended(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, SUSPENDED_MESSAGE)
    set_tenant(db, user.shop_id)
    return user


def get_superadmin(db: DbSession, user: Annotated[User, Depends(_authenticated_user)]) -> User:
    """Platform admin: may see all shops (admin endpoints only)."""
    if not user.is_superadmin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Platform admin access only")
    set_tenant(db, ALL_SHOPS)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
SuperAdmin = Annotated[User, Depends(get_superadmin)]
AnyUser = Annotated[User, Depends(_authenticated_user)]
