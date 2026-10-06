import os
from typing import Literal

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from middleware import AppError


class LineSlot(BaseModel):
    name: str
    qty: int = Field(ge=1)


class VisitSlots(BaseModel):
    name: str | None = None
    phone: str | None = None
    age: int | None = Field(default=None, ge=0, le=120)
    gender: Literal["male", "female", "other"] | None = None
    condition: str | None = None
    payment_method: Literal["cash", "upi"] | None = None
    lines: list[LineSlot] = Field(default_factory=list)


def grok() -> ChatOpenAI:
    key = os.getenv("XAI_API_KEY") or os.getenv("GROK_API_KEY")
    if not key:
        raise AppError("XAI_API_KEY is not set", 500)
    return ChatOpenAI(
        model=os.getenv("XAI_MODEL") or "grok-3-mini",
        api_key=key,
        base_url="https://api.x.ai/v1",
        temperature=0,
    )


def extract_slots(utterance: str) -> dict:
    llm = grok().with_structured_output(VisitSlots)
    parsed: VisitSlots = llm.invoke(
        [
            (
                "system",
                "Extract a clinic visit from the doctor's or receptionist's note. "
                "Use only what is stated. payment_method is cash or upi. "
                "gender is male, female, or other. qty is a positive integer. "
                "Do not invent medicines or a phone number.",
            ),
            ("human", utterance),
        ]
    )
    return parsed.model_dump()
