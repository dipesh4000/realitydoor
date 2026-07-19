from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import date
from pathlib import Path

import asyncpg

from app.core.config import REPOSITORY_ROOT, get_settings
from app.core.database import normalize_postgres_dsn


RULES_PATH = REPOSITORY_ROOT / "data" / "rules" / "lihtc_2026.json"
LIMITS_PATH = REPOSITORY_ROOT / "data" / "processed" / "albany_mtsp_2026.json"
CHECKLIST_PATH = REPOSITORY_ROOT / "data" / "rules" / "checklist_2026.json"


def as_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


async def connect():
    settings = get_settings()
    last_error = None
    for dsn in dict.fromkeys(
        value for value in (settings.database_url, settings.direct_database_url) if value
    ):
        try:
            return await asyncpg.connect(
                normalize_postgres_dsn(dsn), statement_cache_size=0
            )
        except (OSError, asyncpg.PostgresError) as exc:
            last_error = exc
    raise RuntimeError("Could not connect to the configured Supabase database") from last_error


async def seed() -> None:
    rules_document = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    limits_document = json.loads(LIMITS_PATH.read_text(encoding="utf-8"))
    checklist = json.loads(CHECKLIST_PATH.read_text(encoding="utf-8"))
    rules_sha = hashlib.sha256(RULES_PATH.read_bytes()).hexdigest()
    sources = {
        rules_document["source"]["id"]: rules_document["source"],
        limits_document["source"]["id"]: limits_document["source"],
        "REALDOOR_FROZEN_RULES_2026": {
            "id": "REALDOOR_FROZEN_RULES_2026",
            "title": "RealDoor frozen calculation rules 2026",
            "publisher": "RealDoor",
            "canonical_url": "https://realdoor.local/rules/2026",
            "local_path": "data/rules/lihtc_2026.json",
            "sha256": rules_sha,
            "effective_from": "2026-01-01",
        },
    }
    connection = await connect()
    try:
        async with connection.transaction():
            for source in sources.values():
                await connection.execute(
                    """insert into public.official_sources
                    (id,title,publisher,canonical_url,program,fiscal_year,effective_from,sha256,local_path,metadata)
                    values ($1,$2,$3,$4,'LIHTC',2026,$5,$6,$7,$8::jsonb)
                    on conflict (id) do update set title=excluded.title, publisher=excluded.publisher,
                    canonical_url=excluded.canonical_url, effective_from=excluded.effective_from,
                    sha256=excluded.sha256, local_path=excluded.local_path, metadata=excluded.metadata""",
                    source["id"], source["title"], source["publisher"],
                    source["canonical_url"], as_date(source.get("effective_from")), source["sha256"],
                    source.get("local_path"), json.dumps({"page": source.get("page")}),
                )

            limit_source = limits_document["source"]
            for band, values in limits_document["limits"].items():
                for household_size, income_limit in enumerate(values, start=1):
                    await connection.execute(
                        """insert into public.mtsp_limits
                        (source_id,fiscal_year,area_name,income_band,household_size,income_limit,effective_from)
                        values ($1,$2,$3,$4,$5,$6,$7)
                        on conflict (fiscal_year,area_name,income_band,household_size,limit_type)
                        do update set source_id=excluded.source_id, income_limit=excluded.income_limit,
                        effective_from=excluded.effective_from""",
                        limit_source["id"], limits_document["fiscal_year"],
                        limits_document["area_name"], int(band), household_size,
                        income_limit, as_date(limit_source["effective_from"]),
                    )

            for rule in rules_document["rules"]:
                source_id = rule["citations"][0]["source_id"]
                await connection.execute(
                    """insert into public.rules
                    (id,source_id,title,category,program,fiscal_year,effective_from,plain_english,deterministic_spec,active)
                    values ($1,$2,$3,$4,'LIHTC',2026,$5,$6,$7::jsonb,true)
                    on conflict (id) do update set source_id=excluded.source_id,title=excluded.title,
                    category=excluded.category,effective_from=excluded.effective_from,
                    plain_english=excluded.plain_english,deterministic_spec=excluded.deterministic_spec,active=true""",
                    rule["id"], source_id, rule["title"], rule["category"],
                    as_date(rule["effective_from"]), rule["plain_english"],
                    json.dumps({"formula": rule["formula"]}),
                )
                content = f"{rule['title']}\n{rule['plain_english']}\nFormula: {rule['formula']}"
                citation = rule["citations"][0]
                await connection.execute(
                    """insert into public.rule_chunks
                    (rule_id,source_id,page_number,section_reference,content,metadata)
                    select $1,$2,$3,$4,$5,$6::jsonb
                    where not exists (select 1 from public.rule_chunks where rule_id=$1 and content=$5)""",
                    rule["id"], source_id, citation.get("page"), citation["label"],
                    content, json.dumps({"effective_from": rule["effective_from"]}),
                )

            for item in checklist["items"]:
                await connection.execute(
                    """insert into public.checklist_requirements
                    (id,program,fiscal_year,document_type,minimum_count,max_age_days,applies_when,source_ids)
                    values ($1,'LIHTC',2026,$2,$3,$4,$5::jsonb,$6::jsonb)
                    on conflict (id) do update set document_type=excluded.document_type,
                    minimum_count=excluded.minimum_count,max_age_days=excluded.max_age_days,
                    applies_when=excluded.applies_when,source_ids=excluded.source_ids""",
                    item["id"], item["document_type"], item["minimum_count"],
                    item.get("max_age_days"),
                    json.dumps({"date_field": item.get("date_field"), "expiry_field": item.get("expiry_field")}),
                    json.dumps([item["citation"]]),
                )
        print("seeded official sources, Albany MTSP limits, rules, chunks, and checklist")
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(seed())
