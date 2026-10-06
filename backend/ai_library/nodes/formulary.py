"""
Spoken medicine names to catalog items, matches by exact name, partial name, overlap.
Then fills with price, quantity, stock, and check if we can sell that qty.
Anything unclear or low stock is shown as warning.
"""

import re

from ai_library.state import VisitDraftState
from ai_library.tools import list_medicines


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def match_medicine(spoken: str, catalog: list[dict]) -> tuple[dict | None, list[dict]]:
    needle = _norm(spoken)
    if not needle:
        return None, []
    exact = [m for m in catalog if _norm(m["name"]) == needle]
    if len(exact) == 1:
        return exact[0], []
    contained = [
        m
        for m in catalog
        if needle in _norm(m["name"]) or _norm(m["name"]) in needle
    ]
    if len(contained) == 1:
        return contained[0], []
    tokens = set(needle.split())
    scored: list[tuple[int, dict]] = []
    for m in catalog:
        overlap = len(tokens & set(_norm(m["name"]).split()))
        if overlap:
            scored.append((overlap, m))
    scored.sort(key=lambda x: -x[0])
    if scored:
        top = [m for s, m in scored if s == scored[0][0]]
        if len(top) == 1:
            return top[0], []
        return None, top[:5]
    return None, contained[:5]


def formulary(state: VisitDraftState) -> dict:
    catalog = list_medicines(state["clinic_id"])
    lines: list[dict] = []
    warnings: list[str] = []
    questions: list[str] = []
    for item in (state.get("slots") or {}).get("lines") or []:
        qty = int(item["qty"])
        match, alts = match_medicine(item["name"], catalog)
        if not match:
            hint = ", ".join(a["name"] for a in alts) if alts else "no close catalog names"
            warnings.append(f"No unique match for '{item['name']}' ({hint}).")
            questions.append(f"Which catalog medicine is '{item['name']}'?")
            lines.append(
                {
                    "medicineId": None,
                    "name": item["name"],
                    "qty": qty,
                    "unitPrice": 0,
                    "lineTotal": 0,
                    "stockQty": None,
                    "ok": False,
                }
            )
            continue
        price = float(match["price"])
        stock = int(match["stockQty"])
        ok = stock >= qty
        if not ok:
            warnings.append(
                f"Not enough stock for {match['name']} (have {stock}, need {qty})"
            )
        lines.append(
            {
                "medicineId": match["id"],
                "name": match["name"],
                "qty": qty,
                "unitPrice": price,
                "lineTotal": round(price * qty * 100) / 100,
                "stockQty": stock,
                "ok": ok,
            }
        )
    return {
        "lines": lines,
        "warnings": warnings,
        "questions": questions,
        "path": ["formulary"],
    }
