from ai_library.state import VisitDraftState
from ai_library.tools import find_patients
from lib import is_valid_phone, normalize_phone


def identity(state: VisitDraftState) -> dict:
    slots = state.get("slots") or {}
    phone = normalize_phone(slots.get("phone") or "")
    name = (slots.get("name") or "").strip()
    found = find_patients(state["clinic_id"], phone or None, name or None)
    questions: list[str] = []
    warnings: list[str] = []
    patient = None
    candidates: list[dict] = []
    if is_valid_phone(phone):
        if found:
            patient = found[0]
        else:
            warnings.append("No patient with this phone; confirm will create one.")
    elif name:
        if len(found) == 1:
            patient = found[0]
        elif len(found) > 1:
            candidates = found
            questions.append("Multiple patients match that name; give a 10-digit phone.")
        else:
            questions.append("No matching patient; give a 10-digit phone to create one.")
    return {
        "patient": patient,
        "candidates": candidates,
        "questions": questions,
        "warnings": warnings,
        "path": ["identity"],
    }
