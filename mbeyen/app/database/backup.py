"""
Copy every table to CSV files (read-only — changes nothing in the database).

Run from the mbeyen folder:
    python -m app.database.backup
Creates  backups/<date-time>/<table>.csv  using DATABASE_URL from .env.
"""

import csv
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url

from app.core.config import settings


def main() -> None:
    url = make_url(settings.DATABASE_URL)
    print(f"Backing up database on {url.host or 'local file'} ...")
    engine = create_engine(settings.DATABASE_URL)
    folder = Path("backups") / datetime.now().strftime("%Y-%m-%d_%H%M%S")
    folder.mkdir(parents=True, exist_ok=True)
    total = 0
    with engine.connect() as conn:
        for table in sorted(inspect(conn).get_table_names()):
            result = conn.execute(text(f'SELECT * FROM "{table}"'))
            rows = result.fetchall()
            with open(folder / f"{table}.csv", "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(result.keys())
                writer.writerows(rows)
            print(f"  {table:<22} {len(rows):>6} rows")
            total += len(rows)
    print(f"Done: {total} rows saved in {folder.resolve()}")


if __name__ == "__main__":
    main()
