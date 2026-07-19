from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    context: dict[str, Any] | None = None


class ChatSource(BaseModel):
    id: str
    title: str
    page: int | None = None
    url: str | None = None


class ChatResponse(BaseModel):
    reply: str
    sources: list[ChatSource]
    route: Literal["deterministic", "nvidia", "openrouter", "refusal", "abstain"]
    model: str | None = None
    disclaimer: str = "RealDoor prepares application materials; it does not determine eligibility. The housing provider makes the final determination."
