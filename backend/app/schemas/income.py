from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class PayFrequency(StrEnum):
    weekly = "weekly"
    biweekly = "biweekly"
    semimonthly = "semimonthly"
    monthly = "monthly"
    annual = "annual"


class IncomeCalculationRequest(BaseModel):
    gross_pay: float = Field(ge=0, le=10_000_000)
    pay_frequency: PayFrequency


class IncomeCalculationResponse(BaseModel):
    calculation_id: str
    method: str
    inputs: dict[str, Any]
    result: float
    rule_id: str
    source_ids: list[str]
    disclaimer: str

