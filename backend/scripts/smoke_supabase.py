from __future__ import annotations

import os
from pathlib import Path


os.environ["USE_IN_MEMORY_REPOSITORY"] = "false"

from fastapi.testclient import TestClient

from app.api.dependencies import (
    get_database,
    get_document_repository,
    get_packet_repository,
    get_session_repository,
)
from app.core.config import get_settings
from app.main import create_app


ROOT = Path(__file__).resolve().parents[2]
PAY_STUB = ROOT / "data" / "synthetic_documents" / "maria_pay_stub_2026-07-03.pdf"


def main() -> None:
    get_settings.cache_clear()
    get_database.cache_clear()
    get_session_repository.cache_clear()
    get_document_repository.cache_clear()
    get_packet_repository.cache_clear()
    with TestClient(create_app()) as client:
        session = client.get("/api/session")
        session.raise_for_status()
        try:
            with PAY_STUB.open("rb") as stream:
                upload = client.post(
                    "/api/documents/upload",
                    files={"file": (PAY_STUB.name, stream, "application/pdf")},
                )
            upload.raise_for_status()
            document_id = upload.json()["document"]["id"]
            fields = client.get(f"/api/documents/{document_id}/fields")
            fields.raise_for_status()
            for field in fields.json()["fields"]:
                if field["field_name"] in {"gross_pay", "pay_frequency"}:
                    client.post(
                        f"/api/documents/{document_id}/fields/{field['id']}/confirm"
                    ).raise_for_status()

            readiness = client.get("/api/readiness")
            readiness.raise_for_status()
            assert readiness.json()["confirmed_income"]["annualized_income"] == 40040.0

            packet = client.post("/api/packets")
            packet.raise_for_status()
            downloaded = client.get(packet.json()["download_url"])
            downloaded.raise_for_status()
            assert downloaded.content.startswith(b"%PDF-")
            print("supabase session, document, fields, storage, readiness, and packet: ok")
        finally:
            deleted = client.delete("/api/session")
            deleted.raise_for_status()
            print("supabase cleanup: ok")


if __name__ == "__main__":
    main()
