from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from app.schemas.income import (
    IncomeCalculationRequest,
    IncomeCalculationResponse,
    PayFrequency,
)


PAY_PERIODS: dict[PayFrequency, int] = {
    PayFrequency.weekly: 52,
    PayFrequency.biweekly: 26,
    PayFrequency.semimonthly: 24,
    PayFrequency.monthly: 12,
    PayFrequency.annual: 1,
}


def calculate_income(payload: IncomeCalculationRequest) -> IncomeCalculationResponse:
    periods = PAY_PERIODS[payload.pay_frequency]
    gross = Decimal(str(payload.gross_pay))
    annualized = (gross * periods).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    frequency = payload.pay_frequency.value
    return IncomeCalculationResponse(
        calculation_id=f"calc_{uuid4().hex}",
        method=f"{frequency}_gross_times_{periods}",
        inputs={"gross_pay": float(gross), "periods_per_year": periods},
        result=float(annualized),
        rule_id=f"INC-{frequency.upper()}-001",
        source_ids=[f"RULE_INC_{frequency.upper()}_2026"],
        disclaimer="The housing provider makes the final determination.",
    )

