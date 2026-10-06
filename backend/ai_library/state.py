from typing import Annotated, Any, TypedDict

import operator


class VisitDraftState(TypedDict, total=False):
    utterance: str
    clinic_id: str
    slots: dict[str, Any]
    patient: dict[str, Any] | None
    candidates: list[dict[str, Any]]
    history: list[dict[str, Any]]
    lines: list[dict[str, Any]]
    grand_total: float
    can_confirm: bool
    warnings: Annotated[list[str], operator.add]
    questions: Annotated[list[str], operator.add]
    path: Annotated[list[str], operator.add]
