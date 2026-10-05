from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))


def ist_day(date: datetime | None = None) -> str:
    if date is None:
        date = datetime.now(timezone.utc)
    elif date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    return date.astimezone(IST).strftime("%Y-%m-%d")


def ist_day_range(date_str: str) -> dict[str, datetime]:
    start = datetime.fromisoformat(f"{date_str}T00:00:00+05:30")
    end = start + timedelta(days=1)
    return {"start": start, "end": end}
