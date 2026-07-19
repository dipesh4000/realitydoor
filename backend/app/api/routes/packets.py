from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.responses import FileResponse

from app.api.dependencies import (
    get_document_repository,
    get_packet_repository,
    get_session_repository,
    get_storage_service,
)
from app.api.routes.documents import require_session
from app.core.config import Settings, get_settings
from app.repositories.documents import DocumentRepository
from app.repositories.packets import PacketRepository
from app.repositories.sessions import SessionRepository
from app.schemas.packets import PacketCreateRequest, PacketDeleteResponse, PacketPreviewDocument, PacketPreviewResponse, PacketResponse
from app.services.packets import generate_packet
from app.services.readiness import evaluate_readiness
from app.services.storage import StorageService


router = APIRouter(prefix="/packets", tags=["packets"])


@router.post("", response_model=PacketResponse, status_code=status.HTTP_201_CREATED)
async def create_packet(
    payload: PacketCreateRequest | None = None,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
    packets: PacketRepository = Depends(get_packet_repository),
    storage: StorageService = Depends(get_storage_service),
    settings: Settings = Depends(get_settings),
) -> PacketResponse:
    session_id = await require_session(raw_session_id, sessions)
    session = await sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    payload = payload or PacketCreateRequest()
    record = await generate_packet(
        session=session, documents=documents, packets=packets, storage=storage, settings=settings,
        notes=payload.notes,
        include_document_ids=set(payload.include_document_ids) if payload.include_document_ids is not None else None,
    )
    return PacketResponse(
        packet_id=record.id,
        created_at=record.created_at,
        expires_at=record.expires_at,
        download_url=f"/api/packets/{record.id}/download",
    )


@router.get("/preview", response_model=PacketPreviewResponse)
async def preview_packet(
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
) -> PacketPreviewResponse:
    session_id = await require_session(raw_session_id, sessions)
    session = await sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=401, detail="Session expired")
    readiness = await evaluate_readiness(session_id, documents)
    records = await documents.list_for_session(session_id)
    return PacketPreviewResponse(
        program=session.program,
        area=session.area,
        household_size=session.household_size,
        income_band=session.income_band,
        checklist_label=readiness.label,
        issues_count=readiness.issues_count,
        checks_passed=readiness.checks_passed,
        checks_total=readiness.checks_total,
        issues=readiness.issues,
        confirmed_income=readiness.confirmed_income,
        documents=[PacketPreviewDocument(id=item.id, name=item.name, document_type=item.document_type, status=item.status) for item in records],
        notice="Review notes and choose files before generating. RealDoor never sends a packet automatically.",
        source_note="HUD FY2026 HERA Income Limits Report, Albany, GA MSA table, page 43. Effective May 1, 2026. Income calculations use frozen, cited RealDoor rules.",
    )
@router.get("/{packet_id}/download")
async def download_packet(
    packet_id: UUID,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    packets: PacketRepository = Depends(get_packet_repository),
    storage: StorageService = Depends(get_storage_service),
):
    session_id = await require_session(raw_session_id, sessions)
    record = await packets.get(session_id, packet_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Packet not found")
    if record.expires_at < datetime.now(UTC):
        await packets.delete(session_id, packet_id)
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Packet expired")
    if record.storage_path.startswith("supabase://"):
        return Response(
            content=await storage.download(record.storage_path),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="RealDoor_Application_Readiness_Packet.pdf"'},
        )
    return FileResponse(
        record.storage_path,
        media_type="application/pdf",
        filename="RealDoor_Application_Readiness_Packet.pdf",
    )


@router.delete("/{packet_id}", response_model=PacketDeleteResponse)
async def delete_packet(
    packet_id: UUID,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    packets: PacketRepository = Depends(get_packet_repository),
    storage: StorageService = Depends(get_storage_service),
) -> PacketDeleteResponse:
    session_id = await require_session(raw_session_id, sessions)
    record = await packets.delete(session_id, packet_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Packet not found")
    await storage.delete(record.storage_path)
    return PacketDeleteResponse()
