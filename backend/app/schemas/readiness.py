from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ReadinessIssue(BaseModel):
    id: str
    type: str
    severity: Literal["error", "warning", "info"]
    title: str
    description: str
    rule_ref: str | None = None
    action: str
    doc_type: str | None = None
    doc_id: str | None = None


class ConfirmedIncomeCalculation(BaseModel):
    method: str
    inputs: dict[str, Any]
    annualized_income: float
    rule_id: str
    source_ids: list[str]
    disclaimer: str = "The housing provider makes the final determination."


class ReadinessResponse(BaseModel):
    completion_percent: int = Field(ge=0, le=100)
    label: str
    issues_count: int
    issues: list[ReadinessIssue]
    checks_passed: int
    checks_total: int
    confirmed_income: ConfirmedIncomeCalculation | None = None
    checklist_id: str
    evaluated_on: str
    notice: str
    suggested_questions: list[str]
