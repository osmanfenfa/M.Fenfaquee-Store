from datetime import date, timedelta


def month_to_date(today: date | None = None) -> tuple[date, date]:
    today = today or date.today()
    return today.replace(day=1), today


def previous_period(date_from: date, date_to: date) -> tuple[date, date]:
    """The period of equal length immediately before [date_from, date_to]."""
    length = (date_to - date_from).days + 1
    prev_to = date_from - timedelta(days=1)
    return prev_to - timedelta(days=length - 1), prev_to


def days_between(date_from: date, date_to: date) -> list[date]:
    return [date_from + timedelta(days=i) for i in range((date_to - date_from).days + 1)]
