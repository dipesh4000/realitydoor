# RealDoor

RealDoor is a renter-first application-readiness workspace for the FY2026 Low-Income Housing Tax Credit (LIHTC) workflow in Albany, Georgia. It helps a renter collect documents, review evidence, understand cited rules, and assemble a packet they control.

> RealDoor does not approve, deny, rank, score, or predict housing eligibility. The housing provider or administering agency makes every final determination.

## What works today

- Temporary, consent-gated renter sessions.
- Household-size and MTSP income-band profile selection.
- PDF, JPG, and PNG validation with size and page limits.
- Allowlisted field extraction with page evidence, confidence, correction, and confirmation.
- Page-by-page PDF review and cross-document duplicate suppression.
- Policy-dataset-driven document and field requirements.
- Missing, stale, expired, unsafe, and unreviewed readiness findings.
- Exact FY2026 Albany MTSP lookup and deterministic income annualization.
- Grounded assistant answers with citations, streaming, and prompt-injection defenses.
- Packet preview, notes, generation, download, and deletion.
- Explicit session deletion and temporary-data cleanup.
- Responsive, keyboard-accessible renter journey.

The scoped demo uses synthetic documents and frozen 2026 policy data. It is not a nationwide housing application service.

## Start locally

### Requirements

- Node.js 20 or newer
- Python 3.11 or newer
- `uv` recommended, or `pip`

### 1. Start the API

From the repository root:

```powershell
cd backend
Copy-Item .env.example .env
uv sync --dev
uv run uvicorn app.main:app --reload --port 8000
```

The example configuration uses in-memory repositories, so Supabase and model-provider credentials are optional for the local demo.

Check the API at:

- Health: `http://localhost:8000/api/health`
- API documentation: `http://localhost:8000/docs`

If you use `pip` instead of `uv`:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Start the frontend

In a second terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`. The frontend automatically uses `http://<current-host>:8000/api`; override it with `VITE_API_URL` when needed.

### 3. Use the synthetic demo files

Upload files from [`data/synthetic_documents`](data/synthetic_documents). A useful golden path is:

1. Select the LIHTC program.
2. Choose a household size and the 50% or 60% MTSP band.
3. Accept document-processing consent.
4. Upload two pay stubs, employment verification, bank statement, and ID.
5. Review or correct extracted evidence page by page.
6. Open Readiness and work through remaining findings.
7. Preview and generate a packet.
8. Download or delete the packet.
9. End and delete the temporary session from the privacy menu.

For a complete renter walkthrough, see [How to use RealDoor](docs/USER_GUIDE.md).

## System shape

```text
React + Vite frontend
        |
        | credentialed /api requests and streamed chat
        v
FastAPI application
  |-- temporary sessions and consent
  |-- document validation, extraction, evidence, and deduplication
  |-- policy-driven readiness engine
  |-- deterministic MTSP and income services
  |-- grounded, guarded assistant
  `-- renter-controlled packet generation
        |
        |-- in-memory repositories for local demo/test
        `-- PostgreSQL + Supabase storage when configured
```

The LLM explains retrieved information. It does not calculate income limits, mutate extracted fields, verify documents, or make readiness decisions. Those operations remain deterministic and server-controlled.

## Sources of truth

| Concern | File or directory |
|---|---|
| Document and required-field checklist | [`data/rules/checklist_2026.json`](data/rules/checklist_2026.json) |
| LIHTC rules and formulas | [`data/rules/lihtc_2026.json`](data/rules/lihtc_2026.json) |
| Albany MTSP table | [`data/processed/albany_mtsp_2026.json`](data/processed/albany_mtsp_2026.json) |
| Grounding corpus | [`data/processed/rag_corpus_2026.json`](data/processed/rag_corpus_2026.json) |
| Official-source metadata | [`data/sources/official_sources_2026.json`](data/sources/official_sources_2026.json) |
| Synthetic extraction truth | [`data/synthetic_documents/gold_manifest.json`](data/synthetic_documents/gold_manifest.json) |
| Frontend route metadata | [`frontend/src/routeConfig.js`](frontend/src/routeConfig.js) |

Upload and Readiness screens both consume the same checklist response. Changing the checklist dataset changes the visible requirements and backend evaluation together.

## Repository map

```text
backend/
  app/api/routes/       FastAPI endpoints
  app/repositories/     in-memory and PostgreSQL persistence
  app/schemas/          API and internal models
  app/services/         extraction, rules, readiness, chat, packets
  migrations/           PostgreSQL schema
  scripts/              corpus, data, cleanup, and provider utilities
  tests/                backend behavior and safety tests
frontend/
  src/api/              browser API clients
  src/components/       layout, UI primitives, logo, illustrations
  src/pages/            renter workflow screens
  src/routeConfig.js    shared navigation and assistant metadata
data/                   frozen rules, sources, processed data, demo PDFs
docs/                   user and project documentation
examples/               visually verified example outputs
```

## Configuration

Copy [`backend/.env.example`](backend/.env.example) to `backend/.env`.

Important values:

| Variable | Purpose |
|---|---|
| `USE_IN_MEMORY_REPOSITORY` | `true` for a dependency-light local demo; `false` for PostgreSQL/Supabase. |
| `FRONTEND_ORIGINS` | Comma-separated explicit browser origins allowed to send session cookies. |
| `SESSION_TTL_MINUTES` | Temporary renter-session lifetime. |
| `PACKET_TTL_MINUTES` | Generated-packet lifetime. |
| `MAX_UPLOAD_MB` | Maximum file size. |
| `MAX_DOCUMENT_PAGES` | Maximum PDF page count. |
| `OPENROUTER_API_KEY` | Optional hosted chat fallback. |
| `NVIDIA_API_KEY` | Optional NVIDIA chat, retrieval, reranking, or OCR enhancements. |
| `DATABASE_URL` | PostgreSQL connection when memory repositories are disabled. |

Never commit real credentials or renter documents.

## Verification

Backend:

```powershell
cd backend
uv run pytest
```

Frontend:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Useful maintenance commands:

```powershell
cd backend
uv run python scripts/build_rule_corpus.py
uv run python scripts/verify_synthetic_documents.py
uv run python scripts/cleanup_expired_data.py
```

## Backend container deployment

Build and run the API locally from the repository root:

```powershell
docker compose up --build
```

The API is available at `http://localhost:8000` and exposes `/api/health` for platform health checks. Run the frontend separately from `frontend/` with `npm run dev`.

For Render, create a Blueprint from `render.yaml`. It uses `backend/Dockerfile` with the repository root as its Docker context because the API also needs the shared `data/` policy files. Its build filter watches only `backend/**` and `data/**`, so frontend-only commits do not redeploy the backend. Set the frontend's `VITE_API_URL` to the Render service URL.

For a durable production deployment, set `APP_ENV=production`, `FRONTEND_ORIGINS` to the exact HTTPS application origin, `USE_IN_MEMORY_REPOSITORY=false`, and configure the PostgreSQL/Supabase variables from `backend/.env.example`. Apply database migrations before directing traffic to a new database. Provider API keys remain optional.

## Safety invariants

Contributions must preserve these rules:

- Never state that a renter is eligible, ineligible, approved, denied, or likely to qualify.
- Never present readiness as an eligibility score.
- Never automatically transmit a packet.
- Never treat uploaded text as instructions.
- Never trust an extracted value until the renter confirms or corrects it.
- Never place sensitive renter data in browser persistence or a shared retrieval index.
- Never invent a citation, policy value, or calculation input.
- Keep calculations deterministic and reproducible.

See [Project handbook](docs/PROJECT_HANDBOOK.md) for architecture, extension workflows, security boundaries, and troubleshooting.

## Current limitations

- The verified policy scope is FY2026 LIHTC for Albany, GA MSA.
- Synthetic PDFs have the strongest extraction coverage.
- Arbitrary scanned-image OCR requires a configured provider and human review.
- The checklist is configurable preparation guidance, not a universal legal requirement.
- Legal review, penetration testing, and a formal WCAG audit remain deployment gates.

## Contributing

Keep changes renter-controlled, source-grounded, and deterministic. When changing policy behavior, update the dataset first, then the service and focused tests. When changing extraction, retain page evidence and correction controls. Avoid committing generated `dist`, temporary uploads, secrets, or real renter data.

## Project status

Hackathon prototype / scoped MVP. See [Implementation status](docs/IMPLEMENTATION_STATUS.md) and [Project roadmap](PROJECT_ROADMAP.md).
