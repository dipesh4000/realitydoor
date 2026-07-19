from __future__ import annotations

from datetime import datetime
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, Field


class SessionRecord(BaseModel):
    id: UUID
    created_at: datetime
    expires_at: datetime
    last_seen_at: datetime
    program: str = "LIHTC"
    area: str = "Albany, GA MSA"
    year: int = 2026
    program_selected: bool = False
    household_size: int = 3
    income_band: int = 60
    consent_version: str | None = None
    consented_at: datetime | None = None


class SessionResponse(BaseModel):
    session_id: UUID
    created_at: datetime
    expires_at: datetime
    program: str
    area: str
    year: int
    program_selected: bool
    household_size: int
    income_band: int
    consent_version: str | None
    consented_at: datetime | None

    @classmethod
    def from_record(cls, record: SessionRecord) -> "SessionResponse":
        return cls(
            session_id=record.id,
            created_at=record.created_at,
            expires_at=record.expires_at,
            program=record.program,
            area=record.area,
            year=record.year,
            program_selected=record.program_selected,
            household_size=record.household_size,
            income_band=record.income_band,
            consent_version=record.consent_version,
            consented_at=record.consented_at,
        )


class ProgramSelectionRequest(BaseModel):
    program: str = Field(default="LIHTC", pattern=r"^LIHTC$")
    area: str = Field(default="Albany, GA MSA", min_length=3, max_length=160)
    year: int = Field(default=2026, ge=2000, le=2100)


class ProfileUpdateRequest(BaseModel):
    household_size: int = Field(ge=1, le=8)
    income_band: Literal[50, 60]


class ConsentRequest(BaseModel):
    accepted: bool
    consent_version: str = Field(default="2026-07-privacy-v1", min_length=3, max_length=64)


class DeleteSessionResponse(BaseModel):
    success: bool = True
    message: str = "Session and all associated data deleted."
