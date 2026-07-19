from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def start_session(client):
    response = client.get("/api/session")
    assert response.status_code == 200
    assert client.post("/api/session/consent", json={"accepted": True}).status_code == 200


def test_synthetic_upload_evidence_and_correction(client):
    start_session(client)
    path = ROOT / "data" / "synthetic_documents" / "maria_pay_stub_2026-06-19.pdf"
    with path.open("rb") as stream:
        upload = client.post(
            "/api/documents/upload",
            files={"file": (path.name, stream, "application/pdf")},
        )
    assert upload.status_code == 201
    document = upload.json()["document"]
    assert document["type"] == "pay_stub"
    assert document["status"] == "scanned"

    response = client.get(f"/api/documents/{document['id']}/fields")
    assert response.status_code == 200
    fields = response.json()["fields"]
    gross = next(item for item in fields if item["field_name"] == "gross_pay")
    assert gross["normalized_value"] == 1540.0
    assert gross["bounding_box"]
    assert gross["source_text"] == "Gross pay $1,540.00"

    corrected = client.post(
        f"/api/documents/{document['id']}/fields/{gross['id']}/correct",
        json={"value": 1500},
    )
    assert corrected.status_code == 200
    updated = client.get(f"/api/documents/{document['id']}/fields").json()["fields"]
    gross_after = next(item for item in updated if item["field_name"] == "gross_pay")
    assert gross_after["status"] == "corrected"
    assert gross_after["normalized_value"] == 1500


def test_prompt_injection_is_flagged_not_obeyed(client):
    start_session(client)
    path = ROOT / "data" / "synthetic_documents" / "adversarial_pay_stub_prompt_injection.pdf"
    with path.open("rb") as stream:
        upload = client.post(
            "/api/documents/upload",
            files={"file": (path.name, stream, "application/pdf")},
        )
    assert upload.status_code == 201
    document = upload.json()["document"]
    assert document["status"] == "needs_review"
    assert "untrusted_document_instruction" in document["safety_flags"]


def test_file_signature_validation(client):
    start_session(client)
    upload = client.post(
        "/api/documents/upload",
        files={"file": ("fake.pdf", b"not a pdf", "application/pdf")},
    )
    assert upload.status_code == 415


def test_cross_session_document_isolation(client):
    start_session(client)
    path = ROOT / "data" / "synthetic_documents" / "maria_pay_stub_2026-06-19.pdf"
    with path.open("rb") as stream:
        upload = client.post(
            "/api/documents/upload",
            files={"file": (path.name, stream, "application/pdf")},
        )
    document_id = upload.json()["document"]["id"]

    client.cookies.clear()
    start_session(client)
    response = client.get(f"/api/documents/{document_id}/fields")
    assert response.status_code == 404
