"""Delete expired renter sessions and their private document/packet objects."""
from __future__ import annotations

import asyncio

from app.api.dependencies import get_document_repository, get_packet_repository, get_session_repository, get_storage_service
from app.core.database import Database
from app.api.dependencies import get_database


async def main() -> None:
    database: Database = get_database()
    pool = await database.pool()
    session_ids = await pool.fetch("select id from public.renter_sessions where expires_at <= now() or deleted_at is not null")
    sessions, documents, packets, storage = get_session_repository(), get_document_repository(), get_packet_repository(), get_storage_service()
    deleted = 0
    for row in session_ids:
        session_id = row["id"]
        for item in await documents.list_for_session(session_id):
            await storage.delete(item.storage_path)
        for item in await packets.list_for_session(session_id):
            await storage.delete(item.storage_path)
        await documents.delete_for_session(session_id)
        await packets.delete_for_session(session_id)
        if await sessions.delete(session_id):
            deleted += 1
    await database.close()
    print(f"Deleted {deleted} expired session(s) and associated objects")


if __name__ == "__main__":
    asyncio.run(main())
