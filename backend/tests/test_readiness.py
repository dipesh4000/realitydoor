from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def start_session(client):
    assert client.get("/api/session").status_code == 200
    assert client.post("/api/session/consent", json={"accepted": True}).status_code == 200


def upload_fixture(client, filename):
    path = ROOT / "data" / "synthetic_documents" / filename
    with path.open("rb") as stream:
        response = client.post(
            "/api/documents/upload",
            files={"file": (path.name, stream, "application/pdf")},
        )
    assert response.status_code == 201
    return response.json()["document"]


def test_empty_session_has_actionable_checklist_not_eligibility_score(client):
    start_session(client)
    response = client.get("/api/readiness")
    assert response.status_code == 200
    payload = response.json()
    assert payload["completion_percent"] == 0
    assert "score" not in payload
    assert payload["checks_total"] == 4
    assert payload["issues_count"] == 4
    assert all(issue["type"] == "missing_document" for issue in payload["issues"])
    assert "not an eligibility standard" in payload["notice"]


def test_readiness_flags_stale_expired_and_uses_confirmed_correction(client):
    start_session(client)
    pay_one = upload_fixture(client, "maria_pay_stub_2026-06-19.pdf")
    upload_fixture(client, "maria_pay_stub_2026-07-03.pdf")
    upload_fixture(client, "maria_employment_verification.pdf")
    upload_fixture(client, "maria_bank_statement_outdated.pdf")
    upload_fixture(client, "maria_state_id_expired.pdf")

    fields = client.get(f"/api/documents/{pay_one['id']}/fields").json()["fields"]
    gross = next(field for field in fields if field["field_name"] == "gross_pay")
    frequency = next(field for field in fields if field["field_name"] == "pay_frequency")
    assert client.post(
        f"/api/documents/{pay_one['id']}/fields/{gross['id']}/correct",
        json={"value": 1500},
    ).status_code == 200
    assert client.post(
        f"/api/documents/{pay_one['id']}/fields/{frequency['id']}/confirm"
    ).status_code == 200

    payload = client.get("/api/readiness").json()
    issue_types = {issue["type"] for issue in payload["issues"]}
    assert "stale_document" in issue_types
    assert "expired_document" in issue_types
    assert payload["confirmed_income"]["annualized_income"] == 39000.0
    assert payload["confirmed_income"]["rule_id"] == "INC-BIWEEKLY-001"


def test_session_delete_cascades_uploaded_documents(client):
    start_session(client)
    document = upload_fixture(client, "maria_pay_stub_2026-06-19.pdf")
    assert client.delete("/api/session").status_code == 200
    assert client.get(f"/api/documents/{document['id']}/fields").status_code == 401
