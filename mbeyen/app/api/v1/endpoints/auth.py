from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.security import create_access_token
from app.dependencies import SUSPENDED_MESSAGE, AnyUser, CurrentUser, DbSession
from app.schemas.auth import PasswordChange, Token, UserRead, UserUpdate
from app.schemas.shop import SignupRequest
from app.services import auth_service, shop_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_for(user_id: int) -> Token:
    return Token(access_token=create_access_token(user_id), expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)


@router.post("/login", response_model=Token)
def login(db: DbSession, form: Annotated[OAuth2PasswordRequestForm, Depends()]) -> Token:
    """Log in with username + password (form-encoded, OAuth2 standard)."""
    user = auth_service.authenticate(db, form.username, form.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if auth_service.shop_is_suspended(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, SUSPENDED_MESSAGE)
    return _token_for(user.id)


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(data: SignupRequest, db: DbSession) -> Token:
    """Create a new shop and its owner account, and log straight in."""
    if not settings.ALLOW_SIGNUP:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "New shop sign-ups are currently closed")
    user = shop_service.create_shop_with_owner(db, data)
    return _token_for(user.id)


@router.get("/me", response_model=UserRead)
def read_me(user: AnyUser) -> UserRead:
    return UserRead.model_validate(user)


@router.patch("/me", response_model=UserRead)
def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession) -> UserRead:
    user.full_name = payload.full_name.strip()
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: PasswordChange, user: AnyUser, db: DbSession) -> None:
    if not auth_service.change_password(db, user, payload.current_password, payload.new_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
