from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Protocol
from uuid import UUID, uuid4

from app.schemas.session import ConsentRequest, ProfileUpdateRequest, ProgramSelectionRequest, SessionRecord
from app.core.database import Database


class SessionRepository(Protocol):
    async def create(self) -> SessionRecord: ...
    async def get(self, session_id: UUID) -> SessionRecord | None: ...
    async def update_program(
        self, session_id: UUID, selection: ProgramSelectionRequest
    ) -> SessionRecord | None: ...
    async def update_profile(self, session_id: UUID, profile: ProfileUpdateRequest) -> SessionRecord | None: ...
    async def record_consent(self, session_id: UUID, consent: ConsentRequest) -> SessionRecord | None: ...
    async def delete(self, session_id: UUID) -> bool: ...


class MemorySessionRepository:
    """Ephemeral repository used for tests and before Supabase migrations run."""

    def __init__(self, ttl_minutes: int = 60) -> None:
        self._ttl = timedelta(minutes=ttl_minutes)
        self._records: dict[UUID, SessionRecord] = {}
        self._lock = asyncio.Lock()

    async def create(self) -> SessionRecord:
        now = datetime.now(UTC)
        record = SessionRecord(
            id=uuid4(),
            created_at=now,
            last_seen_at=now,
            expires_at=now + self._ttl,
        )
        async with self._lock:
            self._records[record.id] = record
        return record

    async def get(self, session_id: UUID) -> SessionRecord | None:
        now = datetime.now(UTC)
        async with self._lock:
            record = self._records.get(session_id)
            if record is None:
                return None
            if record.expires_at <= now:
                self._records.pop(session_id, None)
                return None
            record = record.model_copy(
                update={"last_seen_at": now, "expires_at": now + self._ttl}
            )
            self._records[session_id] = record
            return record

    async def update_program(
        self, session_id: UUID, selection: ProgramSelectionRequest
    ) -> SessionRecord | None:
        async with self._lock:
            record = self._records.get(session_id)
            if record is None:
                return None
            record = record.model_copy(
                update={
                    "program": selection.program,
                    "area": selection.area,
                    "year": selection.year,
                    "program_selected": True,
                    "last_seen_at": datetime.now(UTC),
                }
            )
            self._records[session_id] = record
            return record

    async def delete(self, session_id: UUID) -> bool:
        async with self._lock:
            return self._records.pop(session_id, None) is not None

    async def update_profile(self, session_id: UUID, profile: ProfileUpdateRequest) -> SessionRecord | None:
        async with self._lock:
            record = self._records.get(session_id)
            if record is None:
                return None
            record = record.model_copy(update={"household_size": profile.household_size, "income_band": profile.income_band, "last_seen_at": datetime.now(UTC)})
            self._records[session_id] = record
            return record

    async def record_consent(self, session_id: UUID, consent: ConsentRequest) -> SessionRecord | None:
        if not consent.accepted:
            return None
        async with self._lock:
            record = self._records.get(session_id)
            if record is None:
                return None
            record = record.model_copy(update={"consent_version": consent.consent_version, "consented_at": datetime.now(UTC), "last_seen_at": datetime.now(UTC)})
            self._records[session_id] = record
            return record


def _session_from_row(row) -> SessionRecord:
    return SessionRecord(
        id=row["id"],
        created_at=row["created_at"],
        last_seen_at=row["last_seen_at"],
        expires_at=row["expires_at"],
        program=row["program"],
        area=row["area_name"],
        year=row["fiscal_year"],
        program_selected=row.get("program_selected", False),
        household_size=row.get("household_size", 3),
        income_band=row.get("income_band", 60),
        consent_version=row.get("consent_version"),
        consented_at=row.get("consented_at"),
    )


class PostgresSessionRepository:
    def __init__(self, database: Database, ttl_minutes: int = 60) -> None:
        self._database = database
        self._ttl = timedelta(minutes=ttl_minutes)

    async def create(self) -> SessionRecord:
        now = datetime.now(UTC)
        pool = await self._database.pool()
        row = await pool.fetchrow(
            """insert into public.renter_sessions (expires_at)
               values ($1) returning *""",
            now + self._ttl,
        )
        return _session_from_row(row)

    async def get(self, session_id: UUID) -> SessionRecord | None:
        now = datetime.now(UTC)
        pool = await self._database.pool()
        row = await pool.fetchrow(
            """update public.renter_sessions
               set last_seen_at = $2, expires_at = $3
               where id = $1 and deleted_at is null and expires_at > $2
               returning *""",
            session_id,
            now,
            now + self._ttl,
        )
        return _session_from_row(row) if row else None

    async def update_program(
        self, session_id: UUID, selection: ProgramSelectionRequest
    ) -> SessionRecord | None:
        pool = await self._database.pool()
        row = await pool.fetchrow(
            """update public.renter_sessions
               set program = $2, area_name = $3, fiscal_year = $4, program_selected = true, last_seen_at = now()
               where id = $1 and deleted_at is null returning *""",
            session_id,
            selection.program,
            selection.area,
            selection.year,
        )
        return _session_from_row(row) if row else None

    async def delete(self, session_id: UUID) -> bool:
        pool = await self._database.pool()
        result = await pool.execute(
            "delete from public.renter_sessions where id = $1", session_id
        )
        return result == "DELETE 1"

    async def update_profile(self, session_id: UUID, profile: ProfileUpdateRequest) -> SessionRecord | None:
        pool = await self._database.pool()
        row = await pool.fetchrow(
            """update public.renter_sessions set household_size = $2, income_band = $3, last_seen_at = now()
               where id = $1 and deleted_at is null returning *""",
            session_id, profile.household_size, profile.income_band,
        )
        return _session_from_row(row) if row else None

    async def record_consent(self, session_id: UUID, consent: ConsentRequest) -> SessionRecord | None:
        if not consent.accepted:
            return None
        pool = await self._database.pool()
        async with pool.acquire() as connection, connection.transaction():
            row = await connection.fetchrow(
                """update public.renter_sessions set consent_version = $2, consented_at = now(), last_seen_at = now()
                   where id = $1 and deleted_at is null returning *""",
                session_id, consent.consent_version,
            )
            if row:
                await connection.execute(
                    """insert into public.consent_events (session_id, consent_version, accepted)
                       values ($1, $2, true)""",
                    session_id, consent.consent_version,
                )
        return _session_from_row(row) if row else None
