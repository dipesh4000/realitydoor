from __future__ import annotations

from fastapi import APIRouter

from app.schemas.income import IncomeCalculationRequest, IncomeCalculationResponse
from app.services.income import calculate_income


router = APIRouter(prefix="/income", tags=["income"])


@router.post("/calculate", response_model=IncomeCalculationResponse)
async def calculate(payload: IncomeCalculationRequest) -> IncomeCalculationResponse:
    return calculate_income(payload)

