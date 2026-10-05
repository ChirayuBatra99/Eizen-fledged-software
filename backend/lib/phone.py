import re
from typing import Any


def normalize_phone(raw: Any) -> str:
    if not raw:
        return ""
    digits = re.sub(r"\D", "", str(raw))
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    if len(digits) == 11 and digits.startswith("0"):
        return digits[1:]
    return digits


def is_valid_phone(phone: str) -> bool:
    return bool(re.fullmatch(r"\d{10}", phone or ""))
