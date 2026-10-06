from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from middleware import AppError, require_auth
from routes.visits import VisitBody, create_visit

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_auth)])


class DraftBody(BaseModel):
    utterance: str = ""


@router.post("/visit-draft")
def visit_draft(body: DraftBody, request: Request):
    print("visit_draft", body.utterance)
    utterance = (body.utterance or "").strip()
    if not utterance:
        raise HTTPException(status_code=400, detail="Utterance required")
    try:
        from ai_library import run_visit_draft

        result = run_visit_draft(utterance, request.state.user["clinicId"])
    except AppError as err:
        raise HTTPException(status_code=err.status, detail=err.message) from None
    return JSONResponse(content=jsonable_encoder(result))


@router.post("/visit-draft/confirm")
def confirm_visit_draft(body: VisitBody, request: Request):
    return create_visit(body, request)
