from ai_library.state import VisitDraftState
from ai_library.tools import visit_history


def memory(state: VisitDraftState) -> dict:
    patient = state.get("patient")
    if not patient:
        return {"history": [], "path": ["memory"]}
    history = visit_history(state["clinic_id"], patient["id"])
    warnings: list[str] = []
    cond = ((state.get("slots") or {}).get("condition") or "").strip().lower()
    if cond:
        for visit in history:
            prev = (visit.get("condition") or "").lower()
            if prev and (cond in prev or prev in cond):
                warnings.append(f"Repeat condition vs {visit.get('paidAt')}: {visit.get('condition')}")
                break
    return {"history": history, "warnings": warnings, "path": ["memory"]}
