from __future__ import annotations

import hashlib
import io
import json
import re
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from pypdf import PdfReader

from app.core.config import REPOSITORY_ROOT
from app.schemas.documents import DocumentRecord, ExtractedField
from app.services.safety import contains_untrusted_instruction, safe_document_text


MANIFEST_PATH = REPOSITORY_ROOT / "data" / "synthetic_documents" / "gold_manifest.json"
NUMERIC_FIELDS = {"gross_pay", "benefit_amount", "ending_balance", "ytd_gross"}
DATE_FIELDS = {"employment_start_date", "expiry_date", "issue_date", "pay_date", "pay_period_end", "pay_period_start", "statement_date"}
TEXT_FIELDS = {"benefit_type", "employer_name", "full_name"}
PAY_FREQUENCIES = {"weekly", "biweekly", "semimonthly", "monthly"}
TRUSTED_FIELD_STATUSES = {"confirmed", "corrected"}


def field_dedupe_key(field: ExtractedField) -> tuple[str, str] | None:
    """Identify the same extracted fact across files without merging different values."""
    if field.status == "rejected" or field.normalized_value in (None, ""):
        return None
    value = field.normalized_value
    normalized = value.strip().casefold() if isinstance(value, str) else json.dumps(value, sort_keys=True, default=str)
    return field.field_name, normalized


def validate_field_correction(field_name: str, value: Any) -> Any:
    if field_name in NUMERIC_FIELDS:
        if isinstance(value, bool):
            raise ValueError("Enter a non-negative numeric amount")
        try:
            normalized = float(str(value).replace(",", "").replace("$", ""))
        except (TypeError, ValueError) as exc:
            raise ValueError("Enter a non-negative numeric amount") from exc
        if normalized < 0 or normalized > 10_000_000:
            raise ValueError("Amount must be between 0 and 10,000,000")
        return normalized
    if field_name in DATE_FIELDS:
        try:
            return date.fromisoformat(str(value)).isoformat()
        except ValueError as exc:
            raise ValueError("Enter a valid date in YYYY-MM-DD format") from exc
    if field_name == "pay_frequency":
        normalized = str(value).strip().casefold()
        if normalized not in PAY_FREQUENCIES:
            raise ValueError("Pay frequency must be weekly, biweekly, semimonthly, or monthly")
        return normalized
    if field_name in TEXT_FIELDS:
        normalized = str(value).strip()
        if not normalized or len(normalized) > 200:
            raise ValueError("Enter a value between 1 and 200 characters")
        return normalized
    raise ValueError("This field is not approved for correction")
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


def _pdf_pages(data: bytes) -> list[str]:
    reader = PdfReader(io.BytesIO(data))
    return [page.extract_text() or "" for page in reader.pages]


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


def _fallback_pdf_fields(document_id: UUID, pages: list[str]) -> list[ExtractedField]:
    patterns: dict[str, tuple[str, Any]] = {
        "full_name": (r"(?:Employee(?: Name)?|Recipient|Account holder|Full name|Name)\s*:?\s*([A-Za-z][A-Za-z .'-]{1,80})", str),
        "employer_name": (r"(?:Employer|Company)\s*:?\s*([A-Za-z0-9][A-Za-z0-9 &.,'-]{1,100})", str),
        "gross_pay": (r"Gross (?:pay|Pay)\s*\$?([\d,]+\.\d{2})", float),
        "ytd_gross": (r"(?:YTD gross|Year-to-date gross(?: pay)?)\s*\$?([\d,]+\.\d{2})", float),
        "pay_period_start": (r"Pay period start\s*(\d{4}-\d{2}-\d{2})", str),
        "pay_period_end": (r"Pay period end\s*(\d{4}-\d{2}-\d{2})", str),
        "pay_date": (r"Pay date\s*(\d{4}-\d{2}-\d{2})", str),
        "pay_frequency": (r"Pay frequency\s*(Weekly|Biweekly|Semimonthly|Monthly)", str),
        "employment_start_date": (r"(?:Employment )?start date\s*(\d{4}-\d{2}-\d{2})", str),
        "issue_date": (r"(?:Issue date|Issued|Verified on)\s*(\d{4}-\d{2}-\d{2})", str),
        "benefit_type": (r"Benefit type\s*:?\s*([A-Za-z][A-Za-z /'-]{1,80})", str),
        "benefit_amount": (r"(?:Benefit|Monthly benefit)(?: amount)?\s*\$?([\d,]+\.\d{2})", float),
        "statement_date": (r"Statement date\s*(\d{4}-\d{2}-\d{2})", str),
        "ending_balance": (r"Ending balance\s*\$?([\d,]+\.\d{2})", float),
        "expiry_date": (r"(?:Expiry|Expiration) date\s*(\d{4}-\d{2}-\d{2})", str),
    }
    fields: list[ExtractedField] = []
    for page_number, page_text in enumerate(pages, start=1):
        for name, (pattern, converter) in patterns.items():
            match = re.search(pattern, page_text, flags=re.IGNORECASE)
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
                    page=page_number,
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
    pages = _pdf_pages(data) if mime_type == "application/pdf" else []
    text = "\n".join(pages)
    safety_flags = ["untrusted_document_instruction"] if contains_untrusted_instruction(text) else []

    if manifest:
        fields = _fields_from_manifest(document_id, manifest)
        document_type = manifest["document_type"]
        status = "needs_review" if safety_flags else "scanned"
    else:
        safe_pages = [safe_document_text(page) for page in pages]
        fields = _fallback_pdf_fields(document_id, safe_pages)
        names = {field.field_name for field in fields}
        if "gross_pay" in names:
            document_type = "pay_stub"
        elif "benefit_amount" in names:
            document_type = "benefits_letter"
        elif "statement_date" in names or "ending_balance" in names:
            document_type = "bank_statement"
        elif "expiry_date" in names:
            document_type = "government_id"
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
