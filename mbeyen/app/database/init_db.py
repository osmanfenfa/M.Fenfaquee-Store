"""
Command-line setup tasks. Run from the mbeyen folder:

    python -m app.database.init_db                 # create a shop + its owner (same as the sign-up page)
    python -m app.database.init_db admin <username>  # make an existing user the platform admin
"""

import sys
from getpass import getpass

from sqlalchemy import func, select

from app.database.session import SessionLocal
from app.models import User
from app.schemas.shop import SignupRequest
from app.services import shop_service


def create_shop() -> None:
    print("Create a shop and its owner account\n")
    shop_name = input("Shop name: ").strip()
    full_name = input("Owner's full name: ").strip()
    username = input("Owner's username: ").strip()
    while True:
        password = getpass("Password (min 8 characters): ")
        if len(password) < 8:
            print("Password too short.")
            continue
        if password != getpass("Confirm password: "):
            print("Passwords do not match.")
            continue
        break
    with SessionLocal() as db:
        user = shop_service.create_shop_with_owner(
            db, SignupRequest(shop_name=shop_name, full_name=full_name, username=username, password=password)
        )
        print(f"Shop '{user.shop.name}' created with owner '{user.username}'. You can now log in.")


def make_admin(username: str) -> None:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(func.lower(User.username) == username.strip().lower()))
        if user is None:
            raise SystemExit(f"No user called '{username}'.")
        user.is_superadmin = True
        db.commit()
        print(f"'{user.username}' is now the platform admin. Log out and in again to see the Admin page.")


def main() -> None:
    args = sys.argv[1:]
    if args[:1] == ["admin"] and len(args) == 2:
        make_admin(args[1])
    elif not args:
        create_shop()
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
