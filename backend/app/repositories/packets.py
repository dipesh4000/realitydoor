from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Protocol
from uuid import UUID

from app.schemas.packets import PacketRecord
from app.core.database import Database


class PacketRepository(Protocol):
    async def create(self, record: PacketRecord) -> PacketRecord: ...
    async def list_for_session(self, session_id: UUID) -> list[PacketRecord]: ...
    async def get(self, session_id: UUID, packet_id: UUID) -> PacketRecord | None: ...
    async def delete(self, session_id: UUID, packet_id: UUID) -> PacketRecord | None: ...
    async def delete_for_session(self, session_id: UUID) -> int: ...


class MemoryPacketRepository:
    def __init__(self) -> None:
        self._packets: dict[UUID, PacketRecord] = {}
        self._lock = asyncio.Lock()

    async def create(self, record: PacketRecord) -> PacketRecord:
        async with self._lock:
            self._packets[record.id] = record
        return record

    async def get(self, session_id: UUID, packet_id: UUID) -> PacketRecord | None:
        async with self._lock:
            record = self._packets.get(packet_id)
            return record if record and record.session_id == session_id else None

    async def list_for_session(self, session_id: UUID) -> list[PacketRecord]:
        async with self._lock:
            return [item for item in self._packets.values() if item.session_id == session_id]

    async def delete(self, session_id: UUID, packet_id: UUID) -> PacketRecord | None:
        async with self._lock:
            record = self._packets.get(packet_id)
            if record is None or record.session_id != session_id:
                return None
            self._packets.pop(packet_id, None)
        path = Path(record.storage_path)
        if path.exists():
            path.unlink()
        return record

    async def delete_for_session(self, session_id: UUID) -> int:
        async with self._lock:
            packet_ids = [item.id for item in self._packets.values() if item.session_id == session_id]
        deleted = 0
        for packet_id in packet_ids:
            if await self.delete(session_id, packet_id):
                deleted += 1
        return deleted


class PostgresPacketRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    async def create(self, record: PacketRecord) -> PacketRecord:
        pool = await self._database.pool()
        await pool.execute(
            """insert into public.packets
            (id, session_id, storage_path, generated_at, expires_at)
            values ($1,$2,$3,$4,$5)""",
            record.id, record.session_id, record.storage_path, record.created_at, record.expires_at,
        )
        return record

    async def get(self, session_id: UUID, packet_id: UUID) -> PacketRecord | None:
        pool = await self._database.pool()
        row = await pool.fetchrow(
            "select * from public.packets where session_id=$1 and id=$2", session_id, packet_id
        )
        if row is None:
            return None
        return PacketRecord(
            id=row["id"], session_id=row["session_id"], storage_path=row["storage_path"],
            created_at=row["generated_at"], expires_at=row["expires_at"],
        )

    async def list_for_session(self, session_id: UUID) -> list[PacketRecord]:
        pool = await self._database.pool()
        rows = await pool.fetch(
            "select * from public.packets where session_id=$1 order by generated_at desc",
            session_id,
        )
        return [PacketRecord(
            id=row["id"], session_id=row["session_id"], storage_path=row["storage_path"],
            created_at=row["generated_at"], expires_at=row["expires_at"],
        ) for row in rows]

    async def delete(self, session_id: UUID, packet_id: UUID) -> PacketRecord | None:
        record = await self.get(session_id, packet_id)
        if record is None:
            return None
        pool = await self._database.pool()
        await pool.execute("delete from public.packets where session_id=$1 and id=$2", session_id, packet_id)
        return record

    async def delete_for_session(self, session_id: UUID) -> int:
        pool = await self._database.pool()
        result = await pool.execute("delete from public.packets where session_id=$1", session_id)
        return int(result.rsplit(" ", 1)[-1])
