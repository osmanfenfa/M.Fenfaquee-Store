"""
One-time setup: create the shop owner account and default expense categories.

Run from the mbeyen folder after migrations:
    python -m app.database.init_db
"""

from getpass import getpass

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models import ExpenseCategory
from app.services import auth_service

DEFAULT_EXPENSE_CATEGORIES = [
    "Rent",
    "Electricity",
    "Water",
    "Transport",
    "Salaries",
    "Repairs & Maintenance",
    "Phone & Internet",
    "Taxes & Licences",
    "Other",
]


def seed_expense_categories(db) -> int:
    existing = set(db.scalars(select(ExpenseCategory.name)))
    new = [ExpenseCategory(name=n) for n in DEFAULT_EXPENSE_CATEGORIES if n not in existing]
    db.add_all(new)
    db.commit()
    return len(new)


def main() -> None:
    with SessionLocal() as db:
        added = seed_expense_categories(db)
        print(f"Expense categories added: {added}")

        if auth_service.owner_exists(db):
            print("Owner account already exists — nothing else to do.")
            return

        print("\nCreate the shop owner account")
        username = input("Username: ").strip()
        full_name = input("Full name: ").strip()
        while True:
            password = getpass("Password (min 8 characters): ")
            if len(password) < 8:
                print("Password too short.")
                continue
            if password != getpass("Confirm password: "):
                print("Passwords do not match.")
                continue
            break

        user = auth_service.create_owner(db, username, full_name, password)
        print(f"Owner '{user.username}' created. You can now log in.")


if __name__ == "__main__":
    main()
