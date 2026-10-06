from langgraph.graph import END, START, StateGraph

from ai_library.nodes import billing, formulary, identity, intake, memory
from ai_library.state import VisitDraftState
from lib import normalize_phone


def build_graph():
    g = StateGraph(VisitDraftState)
    g.add_node("intake", intake)
    g.add_node("identity", identity)
    g.add_node("memory", memory)
    g.add_node("formulary", formulary)
    g.add_node("billing", billing)
    
    g.add_edge(START, "intake")
    g.add_edge("intake", "identity")
    g.add_edge("identity", "memory")
    g.add_edge("identity", "formulary")
    g.add_edge("memory", "billing")
    g.add_edge("formulary", "billing")
    g.add_edge("billing", END)
    return g.compile()


_graph = None


def run_visit_draft(utterance: str, clinic_id: str) -> dict:
    global _graph
    if _graph is None:
        _graph = build_graph()
    state = _graph.invoke({"utterance": utterance, "clinic_id": clinic_id})
    slots = state.get("slots") or {}
    patient = state.get("patient")
    phone = normalize_phone(slots.get("phone") or (patient or {}).get("phone") or "")
    name = (slots.get("name") or (patient or {}).get("name") or "").strip()
    age = slots.get("age")
    if age is None and patient:
        age = patient.get("age")
    gender = slots.get("gender") or (patient or {}).get("gender")
    return {
        "draft": {
            "name": name,
            "phone": phone,
            "age": age,
            "gender": gender,
            "condition": slots.get("condition"),
            "paymentMethod": slots.get("payment_method"),
            "lines": [
                {
                    "medicineId": ln.get("medicineId"),
                    "name": ln.get("name"),
                    "qty": ln.get("qty"),
                    "unitPrice": ln.get("unitPrice"),
                    "lineTotal": ln.get("lineTotal"),
                    "stockQty": ln.get("stockQty"),
                    "ok": ln.get("ok"),
                }
                for ln in state.get("lines") or []
            ],
            "grandTotal": state.get("grand_total") or 0,
        },
        "patient": patient,
        "candidates": state.get("candidates") or [],
        "history": state.get("history") or [],
        "warnings": state.get("warnings") or [],
        "questions": state.get("questions") or [],
        "path": state.get("path") or [],
        "canConfirm": bool(state.get("can_confirm")),
    }
