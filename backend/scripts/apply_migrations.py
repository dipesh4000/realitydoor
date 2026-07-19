from __future__ import annotations

import asyncio
from pathlib import Path

import asyncpg

from app.core.config import get_settings
from app.core.database import normalize_postgres_dsn


MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"


async def apply() -> None:
    settings = get_settings()
    candidates = [dsn for dsn in (settings.direct_database_url, settings.database_url) if dsn]
    if not candidates:
        raise RuntimeError("DIRECT_DATABASE_URL or DATABASE_URL is required")
    connection = None
    last_error = None
    for dsn in dict.fromkeys(candidates):
        try:
            connection = await asyncpg.connect(
                normalize_postgres_dsn(dsn), statement_cache_size=0
            )
            break
        except (OSError, asyncpg.PostgresError) as exc:
            last_error = exc
    if connection is None:
        raise RuntimeError("Could not connect using the configured Supabase database URLs") from last_error
    try:
        for path in sorted(MIGRATIONS.glob("*.sql")):
            async with connection.transaction():
                await connection.execute(path.read_text(encoding="utf-8"))
            print(f"applied {path.name}")
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(apply())
