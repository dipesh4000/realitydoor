from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator


ShortText = Annotated[str, Field(min_length=1, max_length=300)]


class ChatUIContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    route: str | None = Field(default=None, max_length=80, pattern=r"^/[a-z0-9/_-]*$")
    page_title: str | None = Field(default=None, max_length=120)
    step: int | None = Field(default=None, ge=0, le=5)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=2000)
    context: ChatUIContext | None = None

    @field_validator("message")
    @classmethod
    def clean_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message cannot be blank")
        return cleaned


class ChatSource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=120, pattern=r"^[A-Za-z0-9_.:-]+$")
    title: str = Field(min_length=1, max_length=240)
    page: int | None = Field(default=None, ge=1, le=10_000)
    url: HttpUrl | None = None


class ChatCalculation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1, max_length=100)
    expression: str = Field(min_length=1, max_length=240)
    result: str = Field(min_length=1, max_length=120)
    rule_id: str | None = Field(default=None, max_length=120, pattern=r"^[A-Za-z0-9_.:-]+$")


class ChatAnswer(BaseModel):
    """Provider-independent, renter-facing answer contract."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["answer", "clarification", "refusal", "unavailable"]
    title: str = Field(min_length=1, max_length=90)
    summary: str = Field(min_length=1, max_length=700)
    key_points: list[ShortText] = Field(default_factory=list, max_length=5)
    calculation: ChatCalculation | None = None
    missing_facts: list[ShortText] = Field(default_factory=list, max_length=5)
    next_steps: list[ShortText] = Field(default_factory=list, max_length=4)
    source_ids: list[str] = Field(default_factory=list, max_length=8)

    @field_validator("title", "summary")
    @classmethod
    def clean_text(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("key_points", "missing_facts", "next_steps")
    @classmethod
    def clean_list(cls, values: list[str]) -> list[str]:
        return [" ".join(value.split()) for value in values]

    @field_validator("source_ids")
    @classmethod
    def unique_source_ids(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values if value.strip()]
        if len(cleaned) != len(set(cleaned)):
            raise ValueError("source_ids must be unique")
        return cleaned

    @model_validator(mode="after")
    def validate_shape(self) -> "ChatAnswer":
        if self.type in {"refusal", "unavailable"} and self.calculation is not None:
            raise ValueError("Refusals and unavailable answers cannot contain calculations")
        return self

    def as_text(self) -> str:
        parts = [self.summary, *self.key_points]
        if self.calculation:
            parts.append(f"{self.calculation.label}: {self.calculation.expression} = {self.calculation.result}")
        if self.missing_facts:
            parts.append("Needed: " + "; ".join(self.missing_facts))
        if self.next_steps:
            parts.append("Next: " + "; ".join(self.next_steps))
        return "\n".join(parts)


class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer: ChatAnswer
    reply: str = ""
    sources: list[ChatSource] = Field(default_factory=list, max_length=8)
    route: Literal["deterministic", "nvidia", "openrouter", "refusal", "abstain"]
    model: str | None = Field(default=None, max_length=160)
    disclaimer: str = "RealDoor prepares application materials; it does not determine eligibility. The housing provider makes the final determination."

    @model_validator(mode="after")
    def render_compatibility_text(self) -> "ChatResponse":
        self.reply = self.answer.as_text()
        source_ids = {source.id for source in self.sources}
        if not set(self.answer.source_ids).issubset(source_ids):
            raise ValueError("Answer references a source that is not present in sources")
        return self


class ChatDeltaEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["delta"] = "delta"
    delta: str = Field(min_length=1, max_length=500)


class ChatCompleteEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["complete"] = "complete"
    answer: ChatAnswer
    sources: list[ChatSource] = Field(default_factory=list, max_length=8)
    route: Literal["deterministic", "nvidia", "openrouter", "refusal", "abstain"]
    model: str | None = None
    disclaimer: str
