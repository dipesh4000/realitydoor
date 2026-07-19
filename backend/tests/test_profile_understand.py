from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_consent_profile_and_packet_preview(client):
    assert client.get("/api/session").status_code == 200
    blocked = client.post(
        "/api/documents/upload",
        files={"file": ("sample.pdf", b"%PDF-invalid", "application/pdf")},
    )
    assert blocked.status_code == 403
    assert client.patch("/api/session/profile", json={"household_size": 4, "income_band": 50}).status_code == 200
    assert client.post("/api/session/consent", json={"accepted": True}).status_code == 200
    path = ROOT / "examples" / "01_complete_profile" / "pay_stub_biweekly.pdf"
    with path.open("rb") as stream:
        upload = client.post("/api/documents/upload", files={"file": (path.name, stream, "application/pdf")})
    assert upload.status_code == 201
    preview = client.get("/api/packets/preview")
    assert preview.status_code == 200
    packet_preview = preview.json()
    assert packet_preview["documents"][0]["name"] == path.name
    assert packet_preview["checks_total"] == 4
    assert packet_preview["issues"]
    assert "HUD FY2026" in packet_preview["source_note"]


def test_evidence_page_renders_for_synthetic_manifest_document(client):
    client.get("/api/session")
    client.post("/api/session/consent", json={"accepted": True})
    path = ROOT / "data" / "synthetic_documents" / "maria_pay_stub_2026-06-19.pdf"
    with path.open("rb") as stream:
        document = client.post("/api/documents/upload", files={"file": (path.name, stream, "application/pdf")}).json()["document"]
    image = client.get(f"/api/documents/{document['id']}/pages/1.png")
    assert image.status_code == 200
    assert image.headers["content-type"] == "image/png"
    assert image.content.startswith(b"\x89PNG")
