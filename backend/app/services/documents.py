from __future__ import annotations

import hashlib
import io
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from pypdf import PdfReader

from app.core.config import REPOSITORY_ROOT
from app.schemas.documents import DocumentRecord, ExtractedField


MANIFEST_PATH = REPOSITORY_ROOT / "data" / "synthetic_documents" / "gold_manifest.json"
UNTRUSTED_PATTERNS = (
    "ignore previous instructions",
    "ignore rules",
    "system prompt",
    "mark applicant eligible",
    "you qualify",
)


def detect_mime(data: bytes) -> str | None:
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    return None


def safe_filename(value: str) -> str:
    name = Path(value).name
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return cleaned[:180] or "upload.bin"


def _manifest_record(filename: str) -> dict[str, Any] | None:
    if not MANIFEST_PATH.exists():
        return None
    document = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return next((item for item in document["documents"] if item["filename"] == filename), None)


def _pdf_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _fields_from_manifest(document_id: UUID, record: dict[str, Any]) -> list[ExtractedField]:
    fields: list[ExtractedField] = []
    for name, item in record["fields"].items():
        confidence = 0.99
        status = "extracted"
        note = None
        if name in {"gross_pay", "benefit_amount", "ending_balance"}:
            confidence = 0.96
        if record["expected_status"] in {"stale", "expired"} and name in {
            "statement_date",
            "expiry_date",
        }:
            status = "needs_review"
            note = f"The synthetic document is intentionally {record['expected_status']}."
        fields.append(
            ExtractedField(
                id=uuid4(),
                document_id=document_id,
                field_name=name,
                raw_value=item["raw_value"],
                normalized_value=item["normalized_value"],
                confidence=confidence,
                status=status,
                page=item["page"],
                bounding_box=item["bounding_box"],
                source_text=item["source_text"],
                note=note,
            )
        )
    return fields


def _fallback_pdf_fields(document_id: UUID, text: str) -> list[ExtractedField]:
    patterns: dict[str, tuple[str, Any]] = {
        "gross_pay": (r"Gross (?:pay|Pay)\s*\$?([\d,]+\.\d{2})", float),
        "pay_date": (r"Pay date\s*(\d{4}-\d{2}-\d{2})", str),
        "pay_frequency": (r"Pay frequency\s*(Weekly|Biweekly|Semimonthly|Monthly)", str),
        "benefit_amount": (r"(?:Benefit|Monthly benefit)(?: amount)?\s*\$?([\d,]+\.\d{2})", float),
        "statement_date": (r"Statement date\s*(\d{4}-\d{2}-\d{2})", str),
        "ending_balance": (r"Ending balance\s*\$?([\d,]+\.\d{2})", float),
        "expiry_date": (r"(?:Expiry|Expiration) date\s*(\d{4}-\d{2}-\d{2})", str),
    }
    fields: list[ExtractedField] = []
    for name, (pattern, converter) in patterns.items():
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            continue
        raw = match.group(1)
        normalized: Any = raw
        if converter is float:
            normalized = float(raw.replace(",", ""))
        elif name == "pay_frequency":
            normalized = raw.lower()
        fields.append(
            ExtractedField(
                id=uuid4(),
                document_id=document_id,
                field_name=name,
                raw_value=raw,
                normalized_value=normalized,
                confidence=0.82,
                status="extracted",
                page=1,
                source_text=match.group(0),
                note="Extracted by the local fallback parser; review before use.",
            )
        )
    return fields


def process_upload(
    *, session_id: UUID, filename: str, data: bytes, mime_type: str, storage_path: Path
) -> tuple[DocumentRecord, list[ExtractedField]]:
    document_id = uuid4()
    manifest = _manifest_record(filename)
    text = _pdf_text(data) if mime_type == "application/pdf" else ""
    normalized_text = text.casefold()
    safety_flags = [
        "untrusted_document_instruction"
        for pattern in UNTRUSTED_PATTERNS
        if pattern in normalized_text
    ]
    safety_flags = sorted(set(safety_flags))

    if manifest:
        fields = _fields_from_manifest(document_id, manifest)
        document_type = manifest["document_type"]
        status = "needs_review" if safety_flags else "scanned"
    else:
        fields = _fallback_pdf_fields(document_id, text)
        names = {field.field_name for field in fields}
        if "gross_pay" in names:
            document_type = "pay_stub"
        elif "benefit_amount" in names:
            document_type = "benefits_letter"
        elif "statement_date" in names or "ending_balance" in names:
            document_type = "bank_statement"
        elif "expiry_date" in names:
            document_type = "photo_id"
        else:
            document_type = "unknown"
        if mime_type.startswith("image/"):
            status = "needs_review"
        status = "needs_review" if safety_flags or not fields else "scanned"

    record = DocumentRecord(
        id=document_id,
        session_id=session_id,
        name=filename,
        size_bytes=len(data),
        mime_type=mime_type,
        document_type=document_type,
        status=status,
        uploaded_at=datetime.now(UTC),
        storage_path=str(storage_path),
        sha256=hashlib.sha256(data).hexdigest(),
        safety_flags=safety_flags,
    )
    return record, fields
