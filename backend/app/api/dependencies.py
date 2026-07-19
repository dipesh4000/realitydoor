from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings
from app.core.database import Database
from app.repositories.sessions import MemorySessionRepository, PostgresSessionRepository, SessionRepository
from app.repositories.documents import DocumentRepository, MemoryDocumentRepository, PostgresDocumentRepository
from app.repositories.packets import MemoryPacketRepository, PacketRepository, PostgresPacketRepository
from app.services.storage import StorageService


@lru_cache
def get_database() -> Database:
    settings = get_settings()
    dsn = settings.database_url or settings.direct_database_url
    if not dsn:
        raise RuntimeError("DATABASE_URL is required when memory repositories are disabled")
    return Database(dsn)


@lru_cache
def get_session_repository() -> SessionRepository:
    settings = get_settings()
    if settings.use_in_memory_repository:
        return MemorySessionRepository(ttl_minutes=settings.session_ttl_minutes)
    return PostgresSessionRepository(get_database(), ttl_minutes=settings.session_ttl_minutes)


@lru_cache
def get_document_repository() -> DocumentRepository:
    if get_settings().use_in_memory_repository:
        return MemoryDocumentRepository()
    return PostgresDocumentRepository(get_database())


@lru_cache
def get_packet_repository() -> PacketRepository:
    if get_settings().use_in_memory_repository:
        return MemoryPacketRepository()
    return PostgresPacketRepository(get_database())


@lru_cache
def get_storage_service() -> StorageService:
    return StorageService(get_settings())
