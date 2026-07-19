from __future__ import annotations

import os
from pathlib import Path


os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("USE_IN_MEMORY_REPOSITORY", "true")

from fastapi.testclient import TestClient

from app.main import create_app


ROOT = Path(__file__).resolve().parents[2]
SYNTHETIC_DIR = ROOT / "data" / "synthetic_documents"
OUTPUT_PATH = ROOT / "tmp" / "RealDoor_Demo_Readiness_Packet.pdf"
DOCUMENTS = [
    "maria_pay_stub_2026-06-19.pdf",
    "maria_pay_stub_2026-07-03.pdf",
    "maria_employment_verification.pdf",
    "maria_bank_statement_outdated.pdf",
    "maria_state_id_expired.pdf",
]


def main() -> None:
    with TestClient(create_app()) as client:
        client.get("/api/session").raise_for_status()
        pay_document_id = None
        for filename in DOCUMENTS:
            path = SYNTHETIC_DIR / filename
            with path.open("rb") as stream:
                response = client.post(
                    "/api/documents/upload",
                    files={"file": (filename, stream, "application/pdf")},
                )
            response.raise_for_status()
            if filename == "maria_pay_stub_2026-07-03.pdf":
                pay_document_id = response.json()["document"]["id"]

        fields = client.get(f"/api/documents/{pay_document_id}/fields")
        fields.raise_for_status()
        for field in fields.json()["fields"]:
            if field["field_name"] in {"gross_pay", "pay_frequency"}:
                client.post(
                    f"/api/documents/{pay_document_id}/fields/{field['id']}/confirm"
                ).raise_for_status()

        packet = client.post("/api/packets")
        packet.raise_for_status()
        content = client.get(packet.json()["download_url"])
        content.raise_for_status()
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_bytes(content.content)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
