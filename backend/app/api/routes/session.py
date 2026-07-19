from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status

from app.api.dependencies import get_document_repository, get_packet_repository, get_session_repository, get_storage_service
from app.core.config import Settings, get_settings
from app.repositories.sessions import SessionRepository
from app.repositories.documents import DocumentRepository
from app.repositories.packets import PacketRepository
from app.services.storage import StorageService
from app.schemas.session import (
    ConsentRequest,
    DeleteSessionResponse,
    ProfileUpdateRequest,
    ProgramSelectionRequest,
    SessionResponse,
)


router = APIRouter(prefix="/session", tags=["session"])


def _set_session_cookie(response: Response, session_id: UUID, settings: Settings) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=str(session_id),
        max_age=settings.session_ttl_minutes * 60,
        httponly=True,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
        path="/",
    )


async def _resolve_session(
    raw_session_id: str | None,
    repository: SessionRepository,
):
    if raw_session_id:
        try:
            record = await repository.get(UUID(raw_session_id))
        except ValueError:
            record = None
        if record is not None:
            return record
    return await repository.create()


@router.get("", response_model=SessionResponse)
async def get_or_create_session(
    response: Response,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    repository: SessionRepository = Depends(get_session_repository),
    settings: Settings = Depends(get_settings),
) -> SessionResponse:
    record = await _resolve_session(raw_session_id, repository)
    _set_session_cookie(response, record.id, settings)
    return SessionResponse.from_record(record)


@router.post("/program", response_model=SessionResponse)
async def select_program(
    payload: ProgramSelectionRequest,
    response: Response,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    repository: SessionRepository = Depends(get_session_repository),
    settings: Settings = Depends(get_settings),
) -> SessionResponse:
    record = await _resolve_session(raw_session_id, repository)
    updated = await repository.update_program(record.id, payload)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _set_session_cookie(response, updated.id, settings)
    return SessionResponse.from_record(updated)


@router.patch("/profile", response_model=SessionResponse)
async def update_profile(
    payload: ProfileUpdateRequest,
    response: Response,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    repository: SessionRepository = Depends(get_session_repository),
    settings: Settings = Depends(get_settings),
) -> SessionResponse:
    record = await _resolve_session(raw_session_id, repository)
    updated = await repository.update_profile(record.id, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Session not found")
    _set_session_cookie(response, updated.id, settings)
    return SessionResponse.from_record(updated)


@router.post("/consent", response_model=SessionResponse)
async def record_consent(
    payload: ConsentRequest,
    response: Response,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    repository: SessionRepository = Depends(get_session_repository),
    settings: Settings = Depends(get_settings),
) -> SessionResponse:
    if not payload.accepted:
        raise HTTPException(status_code=422, detail="Consent must be accepted before documents are uploaded")
    record = await _resolve_session(raw_session_id, repository)
    updated = await repository.record_consent(record.id, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Session not found")
    _set_session_cookie(response, updated.id, settings)
    return SessionResponse.from_record(updated)


@router.delete("", response_model=DeleteSessionResponse)
async def delete_session(
    response: Response,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    repository: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
    packets: PacketRepository = Depends(get_packet_repository),
    storage: StorageService = Depends(get_storage_service),
    settings: Settings = Depends(get_settings),
) -> DeleteSessionResponse:
    if raw_session_id:
        try:
            session_id = UUID(raw_session_id)
            for document in await documents.list_for_session(session_id):
                await storage.delete(document.storage_path)
            for packet in await packets.list_for_session(session_id):
                await storage.delete(packet.storage_path)
            await documents.delete_for_session(session_id)
            await packets.delete_for_session(session_id)
            await repository.delete(session_id)
        except ValueError:
            pass
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        secure=settings.is_production,
        httponly=True,
        samesite="none" if settings.is_production else "lax",
    )
    return DeleteSessionResponse()
    ProfileUpdateRequest,
