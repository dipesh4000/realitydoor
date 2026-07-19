from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.readiness import ConfirmedIncomeCalculation, ReadinessIssue


class PacketRecord(BaseModel):
    id: UUID
    session_id: UUID
    storage_path: str
    created_at: datetime
    expires_at: datetime


class PacketResponse(BaseModel):
    packet_id: UUID
    created_at: datetime
    expires_at: datetime
    download_url: str


class PacketDeleteResponse(BaseModel):
    success: bool = True


class PacketCreateRequest(BaseModel):
    notes: str = Field(default="", max_length=1200)
    include_document_ids: list[UUID] | None = None


class PacketPreviewDocument(BaseModel):
    id: UUID
    name: str
    document_type: str
    status: str
    selected: bool = True


class PacketPreviewResponse(BaseModel):
    program: str
    area: str
    household_size: int
    income_band: int
    checklist_label: str
    issues_count: int
    checks_passed: int
    checks_total: int
    issues: list[ReadinessIssue]
    confirmed_income: ConfirmedIncomeCalculation | None = None
    documents: list[PacketPreviewDocument]
    notice: str
    source_note: str
