from __future__ import annotations

import io
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from pypdf import PdfReader
import pypdfium2 as pdfium

from app.api.dependencies import get_document_repository, get_session_repository, get_storage_service
from app.core.config import REPOSITORY_ROOT, Settings, get_settings
from app.repositories.documents import DocumentRepository
from app.repositories.sessions import SessionRepository
from app.schemas.documents import (
    DocumentListResponse,
    DocumentPublic,
    DocumentUploadResponse,
    FieldCorrectionRequest,
    FieldListResponse,
    SuccessResponse,
)
from app.services.documents import TRUSTED_FIELD_STATUSES, detect_mime, field_dedupe_key, process_upload, safe_filename, validate_field_correction
from app.services.storage import StorageService


router = APIRouter(prefix="/documents", tags=["documents"])


async def require_session(
    raw_session_id: str | None,
    sessions: SessionRepository,
) -> UUID:
    if not raw_session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session required")
    try:
        session_id = UUID(raw_session_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session") from exc
    if await sessions.get(session_id) is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    return session_id


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
    storage: StorageService = Depends(get_storage_service),
    settings: Settings = Depends(get_settings),
) -> DocumentUploadResponse:
    session_id = await require_session(raw_session_id, sessions)
    session = await sessions.get(session_id)
    if session is None or not session.consented_at:
        raise HTTPException(status_code=403, detail="Accept the privacy and document-processing consent before uploading")
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File is too large")
    detected_mime = detect_mime(data)
    if detected_mime not in {"application/pdf", "image/jpeg", "image/png"}:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported file type")
    if detected_mime == "application/pdf":
        try:
            pages = len(PdfReader(io.BytesIO(data)).pages)
        except Exception as exc:
            raise HTTPException(status_code=422, detail="The PDF is corrupt or password protected") from exc
        if pages > settings.max_document_pages:
            raise HTTPException(status_code=413, detail=f"PDF exceeds the {settings.max_document_pages}-page limit")

    filename = safe_filename(file.filename or "upload.bin")
    folder = REPOSITORY_ROOT / "tmp" / "documents" / str(session_id)
    folder.mkdir(parents=True, exist_ok=True)
    storage_path = folder / filename
    storage_path.write_bytes(data)
    record, fields = process_upload(
        session_id=session_id,
        filename=filename,
        data=data,
        mime_type=detected_mime,
        storage_path=storage_path,
    )
    # Move to an ID-prefixed path after the document ID is assigned.
    final_path = folder / f"{record.id}_{filename}"
    storage_path.replace(final_path)
    record = record.model_copy(update={"storage_path": str(final_path)})
    if not settings.use_in_memory_repository:
        remote_path = await storage.upload(
            settings.supabase_document_bucket,
            f"{session_id}/{record.id}_{filename}",
            data,
            detected_mime,
        )
        final_path.unlink()
        record = record.model_copy(update={"storage_path": remote_path})
    await documents.create(record, fields)
    return DocumentUploadResponse(document=DocumentPublic.from_record(record))


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
) -> DocumentListResponse:
    session_id = await require_session(raw_session_id, sessions)
    records = await documents.list_for_session(session_id)
    return DocumentListResponse(documents=[DocumentPublic.from_record(item) for item in records])


@router.get("/{document_id}/fields", response_model=FieldListResponse)
async def document_fields(
    document_id: UUID,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
    storage: StorageService = Depends(get_storage_service),
) -> FieldListResponse:
    session_id = await require_session(raw_session_id, sessions)
    record = await documents.get(session_id, document_id)
    fields = await documents.fields(session_id, document_id)
    if fields is None or record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    owners: dict[tuple[str, str], tuple[UUID, str]] = {}
    candidates = sorted(
        await documents.list_for_session(session_id),
        key=lambda candidate: candidate.uploaded_at,
    )
    for candidate in candidates:
        for field in await documents.fields(session_id, candidate.id) or []:
            key = field_dedupe_key(field)
            if key is None:
                continue
            current = owners.get(key)
            if current is None or (
                current[1] not in TRUSTED_FIELD_STATUSES
                and field.status in TRUSTED_FIELD_STATUSES
            ):
                owners[key] = (candidate.id, field.status)
    unique_fields = [
        field for field in fields
        if (key := field_dedupe_key(field)) is None or owners.get(key, (document_id, ""))[0] == document_id
    ]
    duplicates_omitted = len(fields) - len(unique_fields)
    page_count = 1
    if record.mime_type == "application/pdf":
        data = await storage.download(record.storage_path) if record.storage_path.startswith("supabase://") else Path(record.storage_path).read_bytes()
        try:
            page_count = max(1, len(PdfReader(io.BytesIO(data)).pages))
        except Exception as exc:
            raise HTTPException(status_code=422, detail="The PDF can no longer be read") from exc
    return FieldListResponse(fields=unique_fields, page_count=page_count, duplicates_omitted=duplicates_omitted)


@router.get("/{document_id}/content")
async def document_content(
    document_id: UUID,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
    storage: StorageService = Depends(get_storage_service),
):
    session_id = await require_session(raw_session_id, sessions)
    record = await documents.get(session_id, document_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if record.storage_path.startswith("supabase://"):
        return Response(
            content=await storage.download(record.storage_path),
            media_type=record.mime_type,
            headers={"Content-Disposition": f'inline; filename="{record.name}"'},
        )
    return FileResponse(record.storage_path, media_type=record.mime_type, filename=record.name)


@router.get("/{document_id}/pages/{page_number}.png")
async def document_page_image(
    document_id: UUID,
    page_number: int,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
    storage: StorageService = Depends(get_storage_service),
):
    session_id = await require_session(raw_session_id, sessions)
    record = await documents.get(session_id, document_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if record.mime_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Evidence rendering is currently available for PDF uploads")
    data = await storage.download(record.storage_path) if record.storage_path.startswith("supabase://") else Path(record.storage_path).read_bytes()
    pdf = pdfium.PdfDocument(data)
    if page_number < 1 or page_number > len(pdf):
        raise HTTPException(status_code=404, detail="Page not found")
    image = pdf[page_number - 1].render(scale=1.6).to_pil()
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    return Response(content=output.getvalue(), media_type="image/png", headers={"Cache-Control": "private, max-age=300"})


@router.post("/{document_id}/fields/{field_id}/confirm", response_model=SuccessResponse)
async def confirm_field(
    document_id: UUID,
    field_id: UUID,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
) -> SuccessResponse:
    session_id = await require_session(raw_session_id, sessions)
    field = await documents.mutate_field(session_id, document_id, field_id, status="confirmed")
    if field is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")
    return SuccessResponse()


@router.post("/{document_id}/fields/{field_id}/correct", response_model=SuccessResponse)
async def correct_field(
    document_id: UUID,
    field_id: UUID,
    payload: FieldCorrectionRequest,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
) -> SuccessResponse:
    session_id = await require_session(raw_session_id, sessions)
    fields = await documents.fields(session_id, document_id)
    current = next((field for field in fields or [] if field.id == field_id), None)
    if current is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")
    try:
        value = validate_field_correction(current.field_name, payload.value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    field = await documents.mutate_field(
        session_id, document_id, field_id, status="corrected", value=value
    )
    if field is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")
    return SuccessResponse()


@router.post("/{document_id}/fields/{field_id}/reject", response_model=SuccessResponse)
async def reject_field(
    document_id: UUID,
    field_id: UUID,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
) -> SuccessResponse:
    session_id = await require_session(raw_session_id, sessions)
    field = await documents.mutate_field(session_id, document_id, field_id, status="rejected")
    if field is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")
    return SuccessResponse()


@router.delete("/{document_id}", response_model=SuccessResponse)
async def delete_document(
    document_id: UUID,
    raw_session_id: str | None = Cookie(default=None, alias="realdoor_session"),
    sessions: SessionRepository = Depends(get_session_repository),
    documents: DocumentRepository = Depends(get_document_repository),
    storage: StorageService = Depends(get_storage_service),
) -> SuccessResponse:
    session_id = await require_session(raw_session_id, sessions)
    record = await documents.delete(session_id, document_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await storage.delete(record.storage_path)
    return SuccessResponse()
