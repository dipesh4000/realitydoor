from pypdf import PdfReader
from io import BytesIO


def test_packet_is_generated_downloadable_and_deletable(client):
    assert client.get("/api/session").status_code == 200
    created = client.post("/api/packets")
    assert created.status_code == 201
    payload = created.json()

    downloaded = client.get(payload["download_url"])
    assert downloaded.status_code == 200
    assert downloaded.content.startswith(b"%PDF-")
    text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(downloaded.content)).pages)
    assert "LIHTC Application-Readiness Packet" in text
    assert "does not approve, deny, score, rank" in text
    assert "HUD FY2026 HERA Income Limits Report" in text
    assert "Effective May 1, 2026" in text

    deleted = client.delete(f"/api/packets/{payload['packet_id']}")
    assert deleted.status_code == 200
    assert client.get(payload["download_url"]).status_code == 404
