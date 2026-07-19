from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from uuid import UUID

from app.core.config import REPOSITORY_ROOT
from app.repositories.documents import DocumentRepository
from app.schemas.documents import DocumentRecord, ExtractedField
from app.schemas.income import IncomeCalculationRequest, PayFrequency
from app.schemas.readiness import (
    ConfirmedIncomeCalculation,
    ReadinessIssue,
    ReadinessResponse,
)
from app.services.income import calculate_income


CHECKLIST_PATH = REPOSITORY_ROOT / "data" / "rules" / "checklist_2026.json"
TRUSTED_FIELD_STATUSES = {"confirmed", "corrected"}


def load_checklist(path: Path = CHECKLIST_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _parse_date(value) -> date | None:
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def _field_map(fields: list[ExtractedField]) -> dict[str, ExtractedField]:
    return {field.field_name: field for field in fields if field.status != "rejected"}


def _confirmed_income(
    documents_and_fields: list[tuple[DocumentRecord, list[ExtractedField]]],
) -> ConfirmedIncomeCalculation | None:
    for document, fields in documents_and_fields:
        if document.document_type not in {"pay_stub", "employment_verification"}:
            continue
        values = _field_map(fields)
        gross = values.get("gross_pay")
        frequency = values.get("pay_frequency")
        if not gross or not frequency:
            continue
        if gross.status not in TRUSTED_FIELD_STATUSES or frequency.status not in TRUSTED_FIELD_STATUSES:
            continue
        try:
            payload = IncomeCalculationRequest(
                gross_pay=gross.normalized_value,
                pay_frequency=PayFrequency(str(frequency.normalized_value).lower()),
            )
        except (TypeError, ValueError):
            continue
        result = calculate_income(payload)
        return ConfirmedIncomeCalculation(
            method=result.method,
            inputs=result.inputs,
            annualized_income=result.result,
            rule_id=result.rule_id,
            source_ids=result.source_ids,
            disclaimer=result.disclaimer,
        )
    return None


async def evaluate_readiness(
    session_id: UUID,
    repository: DocumentRepository,
    *,
    evaluated_on: date | None = None,
) -> ReadinessResponse:
    today = evaluated_on or date.today()
    checklist = load_checklist()
    documents = await repository.list_for_session(session_id)
    document_fields: list[tuple[DocumentRecord, list[ExtractedField]]] = []
    for document in documents:
        fields = await repository.fields(session_id, document.id) or []
        document_fields.append((document, fields))

    issues: list[ReadinessIssue] = []
    passed = 0
    for item in checklist["items"]:
        matching = [pair for pair in document_fields if pair[0].document_type == item["document_type"]]
        if len(matching) < item["minimum_count"]:
            missing = item["minimum_count"] - len(matching)
            issues.append(
                ReadinessIssue(
                    id=f"missing-{item['id']}",
                    type="missing_document",
                    severity="error",
                    title=f"Missing: {item['label']}",
                    description=f"Add {missing} more document(s) for this demo checklist item.",
                    rule_ref=item["citation"],
                    action="Upload",
                    doc_type=item["document_type"],
                )
            )
            continue

        item_passed = True
        for document, fields in matching:
            values = _field_map(fields)
            date_field = item.get("date_field")
            if date_field and item.get("max_age_days") is not None:
                document_date = _parse_date(values.get(date_field).normalized_value) if values.get(date_field) else None
                if document_date is None or (today - document_date).days > item["max_age_days"]:
                    item_passed = False
                    issues.append(
                        ReadinessIssue(
                            id=f"stale-{document.id}",
                            type="stale_document",
                            severity="warning",
                            title=f"Update: {item['label']}",
                            description=f"This document is older than the demo checklist's {item['max_age_days']}-day window.",
                            rule_ref=item["citation"],
                            action="Replace",
                            doc_type=item["document_type"],
                            doc_id=str(document.id),
                        )
                    )
            expiry_field = item.get("expiry_field")
            if expiry_field:
                expiry_date = _parse_date(values.get(expiry_field).normalized_value) if values.get(expiry_field) else None
                if expiry_date is None or expiry_date < today:
                    item_passed = False
                    issues.append(
                        ReadinessIssue(
                            id=f"expired-{document.id}",
                            type="expired_document",
                            severity="warning",
                            title=f"Expired: {item['label']}",
                            description="Replace this item with a current document before assembling the packet.",
                            rule_ref=item["citation"],
                            action="Replace",
                            doc_type=item["document_type"],
                            doc_id=str(document.id),
                        )
                    )
        if item_passed:
            passed += 1

    unsafe_documents = [document for document in documents if document.safety_flags]
    for document in unsafe_documents:
        issues.append(
            ReadinessIssue(
                id=f"unsafe-{document.id}",
                type="untrusted_document_instruction",
                severity="error",
                title="Untrusted instruction detected in document",
                description="RealDoor ignored instruction-like text embedded in this upload. Review or remove the file.",
                action="Review",
                doc_type=document.document_type,
                doc_id=str(document.id),
            )
        )

    income = _confirmed_income(document_fields)
    if any(document.document_type in {"pay_stub", "employment_verification"} for document in documents) and income is None:
        issues.append(
            ReadinessIssue(
                id="confirm-income-fields",
                type="unconfirmed_fields",
                severity="info",
                title="Confirm income fields",
                description="Review and confirm both gross pay and pay frequency before RealDoor annualizes income.",
                rule_ref="INC-BIWEEKLY-001",
                action="Review fields",
            )
        )

    total = len(checklist["items"])
    completion = round((passed / total) * 100) if total else 100
    if not issues:
        label = "Checklist complete"
    elif completion >= 75:
        label = "Review recommended"
    else:
        label = "Action needed"
    return ReadinessResponse(
        completion_percent=completion,
        label=label,
        issues_count=len(issues),
        issues=issues,
        checks_passed=passed,
        checks_total=total,
        confirmed_income=income,
        checklist_id=checklist["id"],
        evaluated_on=today.isoformat(),
        notice=checklist["notice"],
        suggested_questions=[
            "What should I upload next?",
            "Why is this checklist item shown?",
            "How was the income calculation produced?",
        ],
    )
