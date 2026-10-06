from ai_library.llm import extract_slots
from ai_library.state import VisitDraftState


def intake(state: VisitDraftState) -> dict:
    slots = extract_slots(state["utterance"])
    questions: list[str] = []
    if not (slots.get("name") or "").strip() and not slots.get("phone"):
        questions.append("Who is the patient (name or 10-digit phone)?")
    if not slots.get("lines"):
        questions.append("Which medicines and quantities?")
    if slots.get("payment_method") not in ("cash", "upi"):
        questions.append("Cash or UPI?")
    return {"slots": slots, "questions": questions, "path": ["intake"]}
