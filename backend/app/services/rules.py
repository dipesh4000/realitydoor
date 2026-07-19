from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.core.config import REPOSITORY_ROOT
from app.schemas.rules import MtspLimitResponse, RuleListResponse, RuleResponse


RULES_PATH = REPOSITORY_ROOT / "data" / "rules" / "lihtc_2026.json"
LIMITS_PATH = REPOSITORY_ROOT / "data" / "processed" / "albany_mtsp_2026.json"


@lru_cache
def _rules_document() -> dict:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


@lru_cache
def _limits_document() -> dict:
    return json.loads(LIMITS_PATH.read_text(encoding="utf-8"))


def list_rules(category: str | None = None, query: str | None = None) -> RuleListResponse:
    records = [RuleResponse.model_validate(item) for item in _rules_document()["rules"]]
    categories = ["All Rules", *sorted({item.category for item in records})]
    if category and category != "All Rules":
        records = [item for item in records if item.category == category]
    if query:
        needle = query.casefold()
        records = [
            item
            for item in records
            if needle in item.title.casefold() or needle in item.plain_english.casefold()
        ]
    return RuleListResponse(rules=records, categories=categories)


def get_rule(rule_id: str) -> RuleResponse | None:
    for item in _rules_document()["rules"]:
        if item["id"] == rule_id:
            return RuleResponse.model_validate(item)
    return None


def lookup_mtsp_limit(
    *, area: str, fiscal_year: int, income_band: int, household_size: int
) -> MtspLimitResponse | None:
    document = _limits_document()
    if fiscal_year != document["fiscal_year"] or area.casefold() != document["area_name"].casefold():
        return None
    band_values = document["limits"].get(str(income_band))
    if band_values is None or not 1 <= household_size <= len(band_values):
        return None
    source = document["source"]
    return MtspLimitResponse(
        program=document["program"],
        fiscal_year=fiscal_year,
        area_name=document["area_name"],
        income_band=income_band,
        household_size=household_size,
        income_limit=band_values[household_size - 1],
        effective_from=source["effective_from"],
        source_id=source["id"],
        source_title=source["title"],
        source_page=source["page"],
        disclaimer="The housing provider makes the final determination.",
    )

