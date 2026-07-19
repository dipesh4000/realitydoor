from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.rules import MtspLimitResponse, RuleListResponse, RuleResponse
from app.services.rules import get_rule, list_rules, lookup_mtsp_limit


rules_router = APIRouter(prefix="/rules", tags=["rules"])
limits_router = APIRouter(prefix="/limits", tags=["limits"])


@rules_router.get("", response_model=RuleListResponse)
async def rules(
    category: str | None = None,
    query: str | None = Query(default=None, max_length=200),
) -> RuleListResponse:
    return list_rules(category=category, query=query)


@rules_router.get("/{rule_id}", response_model=RuleResponse)
async def rule(rule_id: str) -> RuleResponse:
    result = get_rule(rule_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return result


@limits_router.get("/mtsp", response_model=MtspLimitResponse)
async def mtsp_limit(
    area: str = "Albany, GA MSA",
    fiscal_year: int = Query(default=2026, ge=2000, le=2100),
    income_band: int = Query(default=60, ge=20, le=80),
    household_size: int = Query(default=3, ge=1, le=8),
) -> MtspLimitResponse:
    result = lookup_mtsp_limit(
        area=area,
        fiscal_year=fiscal_year,
        income_band=income_band,
        household_size=household_size,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verified MTSP limit is loaded for that area, year, band, and household size",
        )
    return result

