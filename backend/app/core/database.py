from __future__ import annotations

from urllib.parse import quote, urlsplit, urlunsplit

import asyncpg


def normalize_postgres_dsn(value: str) -> str:
    """Encode credentials without ever logging or mutating the configured secret."""
    parsed = urlsplit(value)
    if not parsed.hostname:
        raise ValueError("Invalid PostgreSQL URL")
    auth = ""
    if parsed.username is not None:
        auth = quote(parsed.username, safe="")
        if parsed.password is not None:
            auth += f":{quote(parsed.password, safe='')}"
        auth += "@"
    host = parsed.hostname
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    netloc = f"{auth}{host}"
    if parsed.port:
        netloc += f":{parsed.port}"
    return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))


class Database:
    def __init__(self, dsn: str) -> None:
        self._dsn = normalize_postgres_dsn(dsn)
        self._pool: asyncpg.Pool | None = None

    async def pool(self) -> asyncpg.Pool:
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                self._dsn,
                min_size=1,
                max_size=5,
                statement_cache_size=0,
            )
        return self._pool

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
