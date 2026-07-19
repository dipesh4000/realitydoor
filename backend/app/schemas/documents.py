from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentRecord(BaseModel):
    id: UUID
    session_id: UUID
    name: str
    size_bytes: int
    mime_type: str
    document_type: str = "unknown"
    status: str = "uploaded"
    uploaded_at: datetime
    storage_path: str
    sha256: str
    safety_flags: list[str] = Field(default_factory=list)


class DocumentPublic(BaseModel):
    id: UUID
    name: str
    size: str
    size_bytes: int
    type: str
    status: str
    uploadedAt: str
    safety_flags: list[str]

    @classmethod
    def from_record(cls, record: DocumentRecord) -> "DocumentPublic":
        size_mb = record.size_bytes / 1024 / 1024
        return cls(
            id=record.id,
            name=record.name,
            size=f"{size_mb:.1f} MB",
            size_bytes=record.size_bytes,
            type=record.document_type,
            status=record.status,
            uploadedAt=record.uploaded_at.date().isoformat(),
            safety_flags=record.safety_flags,
        )


class ExtractedField(BaseModel):
    id: UUID
    document_id: UUID
    field_name: str
    raw_value: str | None = None
    normalized_value: Any = None
    confidence: float = Field(ge=0, le=1)
    status: str = "extracted"
    page: int | None = None
    bounding_box: list[float] | None = None
    source_text: str | None = None
    note: str | None = None


class DocumentUploadResponse(BaseModel):
    document: DocumentPublic


class DocumentListResponse(BaseModel):
    documents: list[DocumentPublic]


class FieldListResponse(BaseModel):
    fields: list[ExtractedField]


class FieldCorrectionRequest(BaseModel):
    value: Any


class SuccessResponse(BaseModel):
    success: bool = True
