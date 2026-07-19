from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class Citation(BaseModel):
    source_id: str
    label: str
    page: int | None = None
    url: str | None = None


class RuleResponse(BaseModel):
    id: str
    title: str
    status: str
    category: str
    plain_english: str
    citations: list[Citation]
    formula: str
    effective_from: date


class RuleListResponse(BaseModel):
    rules: list[RuleResponse]
    categories: list[str]


class MtspLimitResponse(BaseModel):
    program: str
    fiscal_year: int
    area_name: str
    income_band: int
    household_size: int
    income_limit: int
    effective_from: date
    source_id: str
    source_title: str
    source_page: int
    disclaimer: str

