# RealDoor Project Roadmap

## Current judged MVP

RealDoor is an evidence-first LIHTC application-readiness copilot for Albany, GA MSA, FY2026. It prepares renter materials and explains cited rules. It never approves, denies, scores, ranks, or predicts eligibility.

### Phase 1 — Scope and trusted data: complete

- Frozen demo scope: LIHTC, Albany, GA MSA, FY2026.
- Imported the HUD FY2026 HERA/MTSP table from page 43.
- Versioned 50% and 60% limits for household sizes 1–8.
- Stored source hashes, effective dates, citations, formulas, and abstention behavior.

### Phase 2 — Backend and durable persistence: complete

- FastAPI API with request IDs, CORS, secure session cookies, and session expiry.
- Supabase PostgreSQL migrations applied.
- Durable repositories for sessions, documents, extracted fields, field actions, and packets.
- Private Supabase Storage integration for renter documents and readiness packets.
- Session deletion removes database rows and storage objects.
- Isolated in-memory repository remains available for tests.

### Phase 3 — Synthetic document pipeline: complete

- Two pay stubs, benefits letter, employment verification, stale bank statement, expired ID, and adversarial prompt-injection PDF.
- PDF signature validation, filename sanitation, SHA-256 hashes, evidence text, page numbers, bounding boxes, confidence, and renter review actions.
- Embedded document instructions are treated as untrusted data and flagged.

### Phase 4 — Deterministic readiness: complete

- Configurable checklist findings for missing, stale, expired, unconfirmed, and unsafe evidence.
- Checklist completion is explicitly not an eligibility score.
- Only renter-confirmed or corrected values can enter calculations.
- Biweekly income annualization is deterministic: confirmed gross × 26.

### Phase 5 — Cost-controlled grounded assistant: complete

- Exact MTSP lookups and income math use zero model requests.
- A 52-chunk local hybrid term/vector-space retriever selects versioned, page-cited HUD context.
- NVIDIA is attempted first; empty/reasoning-only responses are discarded.
- OpenRouter `openrouter/free` is the only model fallback and reasoning is disabled for concise answers.
- Model output is screened for forbidden eligibility conclusions.
- Missing evidence produces an abstention rather than a guess.

### Phase 6 — Readiness packet: complete

- Two-page PDF with notices, findings, confirmed calculation, document inventory, provenance, and expiry.
- Packet create/download/delete APIs use private Supabase Storage.
- Page-by-page PDF rendering was visually verified.

### Phase 7 — Frontend integration and QA: complete

- Real API client with credentialed sessions.
- Program selection, multi-file upload, extraction review, corrections, readiness, chat, packet download, document deletion, and session deletion are wired.
- Seven distinct synthetic example scenarios plus the gold fixture set cover extraction, corrections, stale/expired evidence, missing fields, benefits, and prompt injection.
- Production Vite build and ESLint pass.
- Backend automated suite covers API, consent/profile, document isolation/evidence, retrieval, safety, readiness, and packet controls.

## Run locally

```powershell
cd backend
python -m pip install -r requirements.txt
python -m scripts.apply_migrations
python -m scripts.seed_reference_data
python -m uvicorn app.main:app --reload --port 8000
```

In another terminal:

```powershell
cd frontend/realdoor-app
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`. The API documentation is at `http://localhost:8000/docs`.

## Verification commands

```powershell
cd backend
python -m pytest
python -m scripts.smoke_supabase
python -m scripts.generate_demo_packet
python -m scripts.check_model_providers

cd ../frontend/realdoor-app
npm.cmd run lint
npm.cmd run build
npm.cmd audit --omit=dev
```

## Deployment checklist

1. Rotate every key that has ever been pasted into chat or logs.
2. Put only rotated secrets in the backend host; never use `VITE_` for secrets.
3. Set `APP_ENV=production`.
4. Set `FRONTEND_ORIGINS` to the exact deployed frontend origin; do not use `*` with credentialed sessions.
5. Keep `USE_IN_MEMORY_REPOSITORY=false`.
6. Confirm both Supabase buckets remain private.
7. Deploy the backend, then set frontend `VITE_API_URL=https://your-api.example/api` and deploy the Vite build.
8. Run the Supabase smoke test and refusal tests against staging before the demo.

## Post-submission stretch

- Add OCR for arbitrary image/PDF layouts beyond the deterministic demo extractor.
- Add hybrid PostgreSQL FTS + embeddings once a reliable free embedding provider is selected.
- Add background processing jobs and retry/dead-letter handling.
- Add property-specific checklist packs and administrator rule versioning.
- Add encrypted-at-rest field-level protection and retention automation for public production use.
