from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Protocol
from uuid import UUID

from app.schemas.documents import DocumentRecord, ExtractedField
from app.core.database import Database


class DocumentRepository(Protocol):
    async def create(self, record: DocumentRecord, fields: list[ExtractedField]) -> DocumentRecord: ...
    async def list_for_session(self, session_id: UUID) -> list[DocumentRecord]: ...
    async def get(self, session_id: UUID, document_id: UUID) -> DocumentRecord | None: ...
    async def fields(self, session_id: UUID, document_id: UUID) -> list[ExtractedField] | None: ...
    async def mutate_field(self, session_id: UUID, document_id: UUID, field_id: UUID, *, status: str, value=None) -> ExtractedField | None: ...
    async def delete(self, session_id: UUID, document_id: UUID) -> DocumentRecord | None: ...
    async def delete_for_session(self, session_id: UUID) -> int: ...


class MemoryDocumentRepository:
    def __init__(self) -> None:
        self._documents: dict[UUID, DocumentRecord] = {}
        self._fields: dict[UUID, list[ExtractedField]] = {}
        self._lock = asyncio.Lock()

    async def create(
        self, record: DocumentRecord, fields: list[ExtractedField]
    ) -> DocumentRecord:
        async with self._lock:
            self._documents[record.id] = record
            self._fields[record.id] = fields
        return record

    async def list_for_session(self, session_id: UUID) -> list[DocumentRecord]:
        async with self._lock:
            return sorted(
                [item for item in self._documents.values() if item.session_id == session_id],
                key=lambda item: item.uploaded_at,
                reverse=True,
            )

    async def get(self, session_id: UUID, document_id: UUID) -> DocumentRecord | None:
        async with self._lock:
            record = self._documents.get(document_id)
            return record if record and record.session_id == session_id else None

    async def fields(self, session_id: UUID, document_id: UUID) -> list[ExtractedField] | None:
        async with self._lock:
            record = self._documents.get(document_id)
            if record is None or record.session_id != session_id:
                return None
            return list(self._fields.get(document_id, []))

    async def mutate_field(
        self,
        session_id: UUID,
        document_id: UUID,
        field_id: UUID,
        *,
        status: str,
        value=None,
    ) -> ExtractedField | None:
        async with self._lock:
            record = self._documents.get(document_id)
            if record is None or record.session_id != session_id:
                return None
            fields = self._fields.get(document_id, [])
            for index, field in enumerate(fields):
                if field.id == field_id:
                    update = {"status": status}
                    if status == "corrected":
                        update["normalized_value"] = value
                    changed = field.model_copy(update=update)
                    fields[index] = changed
                    return changed
            return None

    async def delete(self, session_id: UUID, document_id: UUID) -> DocumentRecord | None:
        async with self._lock:
            record = self._documents.get(document_id)
            if record is None or record.session_id != session_id:
                return None
            self._documents.pop(document_id, None)
            self._fields.pop(document_id, None)
        path = Path(record.storage_path)
        if path.exists():
            path.unlink()
        return record

    async def delete_for_session(self, session_id: UUID) -> int:
        documents = await self.list_for_session(session_id)
        deleted = 0
        for document in documents:
            if await self.delete(session_id, document.id):
                deleted += 1
        return deleted


def _document_from_row(row) -> DocumentRecord:
    safety_flags = row["safety_flags"]
    if isinstance(safety_flags, str):
        safety_flags = json.loads(safety_flags)
    return DocumentRecord(
        id=row["id"], session_id=row["session_id"], name=row["original_name"],
        size_bytes=row["size_bytes"], mime_type=row["mime_type"],
        document_type=row["document_type"], status=row["status"],
        uploaded_at=row["uploaded_at"], storage_path=row["storage_path"],
        sha256=row["sha256"], safety_flags=list(safety_flags or []),
    )


def _field_from_row(row) -> ExtractedField:
    return ExtractedField(
        id=row["id"], document_id=row["document_id"], field_name=row["field_name"],
        raw_value=row["raw_value"], normalized_value=json.loads(row["normalized_value"]),
        confidence=float(row["confidence"]), status=row["status"],
        page=row["page_number"], bounding_box=json.loads(row["bounding_box"]) if row["bounding_box"] else None,
        source_text=row["source_text"], note=row["note"],
    )


class PostgresDocumentRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    async def create(self, record: DocumentRecord, fields: list[ExtractedField]) -> DocumentRecord:
        pool = await self._database.pool()
        async with pool.acquire() as connection:
            async with connection.transaction():
                await connection.execute(
                    """insert into public.documents
                    (id, session_id, original_name, storage_path, mime_type, size_bytes, sha256,
                     document_type, status, uploaded_at, processed_at, safety_flags)
                    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),$11::jsonb)""",
                    record.id, record.session_id, record.name, record.storage_path,
                    record.mime_type, record.size_bytes, record.sha256, record.document_type,
                    record.status, record.uploaded_at, json.dumps(record.safety_flags),
                )
                await connection.executemany(
                    """insert into public.extracted_fields
                    (id, document_id, field_name, raw_value, normalized_value, confidence,
                     page_number, bounding_box, source_text, status, note)
                    values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9,$10,$11)""",
                    [(
                        field.id, field.document_id, field.field_name, field.raw_value,
                        json.dumps(field.normalized_value), field.confidence, field.page,
                        json.dumps(field.bounding_box) if field.bounding_box else None,
                        field.source_text, field.status, field.note,
                    ) for field in fields],
                )
        return record

    async def list_for_session(self, session_id: UUID) -> list[DocumentRecord]:
        pool = await self._database.pool()
        rows = await pool.fetch(
            "select * from public.documents where session_id=$1 order by uploaded_at desc", session_id
        )
        return [_document_from_row(row) for row in rows]

    async def get(self, session_id: UUID, document_id: UUID) -> DocumentRecord | None:
        pool = await self._database.pool()
        row = await pool.fetchrow(
            "select * from public.documents where session_id=$1 and id=$2", session_id, document_id
        )
        return _document_from_row(row) if row else None

    async def fields(self, session_id: UUID, document_id: UUID) -> list[ExtractedField] | None:
        if await self.get(session_id, document_id) is None:
            return None
        pool = await self._database.pool()
        rows = await pool.fetch(
            "select * from public.extracted_fields where document_id=$1 order by created_at, id",
            document_id,
        )
        return [_field_from_row(row) for row in rows]

    async def mutate_field(self, session_id: UUID, document_id: UUID, field_id: UUID, *, status: str, value=None) -> ExtractedField | None:
        pool = await self._database.pool()
        async with pool.acquire() as connection:
            async with connection.transaction():
                current = await connection.fetchrow(
                    """select f.* from public.extracted_fields f join public.documents d on d.id=f.document_id
                    where d.session_id=$1 and d.id=$2 and f.id=$3""",
                    session_id, document_id, field_id,
                )
                if current is None:
                    return None
                new_value = value if status == "corrected" else json.loads(current["normalized_value"])
                row = await connection.fetchrow(
                    """update public.extracted_fields set status=$2, normalized_value=$3::jsonb
                    where id=$1 returning *""",
                    field_id, status, json.dumps(new_value),
                )
                await connection.execute(
                    """insert into public.field_actions
                    (field_id, session_id, action, previous_value, new_value)
                    values ($1,$2,$3,$4::jsonb,$5::jsonb)""",
                    field_id, session_id, status, current["normalized_value"], json.dumps(new_value),
                )
        return _field_from_row(row)

    async def delete(self, session_id: UUID, document_id: UUID) -> DocumentRecord | None:
        record = await self.get(session_id, document_id)
        if record is None:
            return None
        pool = await self._database.pool()
        await pool.execute("delete from public.documents where session_id=$1 and id=$2", session_id, document_id)
        return record

    async def delete_for_session(self, session_id: UUID) -> int:
        pool = await self._database.pool()
        result = await pool.execute("delete from public.documents where session_id=$1", session_id)
        return int(result.rsplit(" ", 1)[-1])
