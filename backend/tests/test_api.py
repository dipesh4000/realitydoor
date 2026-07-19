def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.headers["X-Request-ID"]


def test_docs_openapi_and_configured_origin_middleware(client):
    origin = "http://localhost:5173"
    docs = client.get("/docs", headers={"Origin": origin})
    assert docs.status_code == 200
    assert docs.headers["access-control-allow-origin"] == origin
    assert docs.headers["access-control-allow-credentials"] == "true"
    assert docs.headers["access-control-expose-headers"] == "X-Request-ID"

    schema = client.get("/openapi.json", headers={"Origin": origin})
    assert schema.status_code == 200
    assert "/api/session" in schema.json()["paths"]

    preflight = client.options(
        "/api/session",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type,x-request-id",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == origin
    assert "authorization" in preflight.headers["access-control-allow-headers"].lower()

    untrusted = client.get("/api/session", headers={"Origin": "https://untrusted.example"})
    assert "access-control-allow-origin" not in untrusted.headers


def test_session_lifecycle(client):
    created = client.get("/api/session")
    assert created.status_code == 200
    payload = created.json()
    assert payload["program"] == "LIHTC"
    assert payload["program_selected"] is False
    assert payload["area"] == "Albany, GA MSA"
    assert payload["year"] == 2026
    assert client.cookies.get("realdoor_session")

    selected = client.post(
        "/api/session/program",
        json={"program": "LIHTC", "area": "Albany, GA MSA", "year": 2026},
    )
    assert selected.status_code == 200
    assert selected.json()["session_id"] == payload["session_id"]
    assert selected.json()["program_selected"] is True

    deleted = client.delete("/api/session")
    assert deleted.status_code == 200
    assert deleted.json()["success"] is True


def test_biweekly_income_is_deterministic(client):
    response = client.post(
        "/api/income/calculate",
        json={"gross_pay": 1540, "pay_frequency": "biweekly"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["result"] == 40040.0
    assert payload["inputs"]["periods_per_year"] == 26
    assert payload["rule_id"] == "INC-BIWEEKLY-001"
    assert "final determination" in payload["disclaimer"]


def test_invalid_income_is_rejected(client):
    response = client.post(
        "/api/income/calculate",
        json={"gross_pay": -1, "pay_frequency": "biweekly"},
    )
    assert response.status_code == 422


def test_exact_albany_mtsp_lookup(client):
    response = client.get(
        "/api/limits/mtsp",
        params={
            "area": "Albany, GA MSA",
            "fiscal_year": 2026,
            "income_band": 60,
            "household_size": 3,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["income_limit"] == 41580
    assert payload["source_page"] == 43
    assert payload["effective_from"] == "2026-05-01"


def test_unverified_limit_abstains(client):
    response = client.get(
        "/api/limits/mtsp",
        params={"area": "Unloaded Area", "fiscal_year": 2026},
    )
    assert response.status_code == 404


def test_rules_are_versioned_and_cited(client):
    response = client.get("/api/rules", params={"category": "Income Limits"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["rules"]
    assert all(rule["citations"] for rule in payload["rules"])
    assert all(rule["effective_from"] for rule in payload["rules"])

    complete_library = client.get("/api/rules").json()
    assert len(complete_library["rules"]) >= 9
    assert {"Program Structure", "Rent Calculations", "Occupancy"}.issubset(complete_library["categories"])
