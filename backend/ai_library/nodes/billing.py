from ai_library.state import VisitDraftState
from lib import is_valid_phone, normalize_phone


def billing(state: VisitDraftState) -> dict:
    lines = state.get("lines") or []
    matched = [ln for ln in lines if ln.get("medicineId") and ln.get("ok")]
    grand = round(sum(ln["lineTotal"] for ln in matched) * 100) / 100
    slots = state.get("slots") or {}
    patient = state.get("patient") or {}
    phone = normalize_phone(slots.get("phone") or patient.get("phone") or "")
    name = (slots.get("name") or patient.get("name") or "").strip()
    pay = slots.get("payment_method")
    can = (
        bool(name)
        and is_valid_phone(phone)
        and pay in ("cash", "upi")
        and bool(lines)
        and len(matched) == len(lines)
    )
    return {"grand_total": grand, "can_confirm": can, "path": ["billing"]}
