# RealDoor project handbook

This is the practical guide for developers, designers, reviewers, judges, policy maintainers, and operators working with RealDoor. Start with the section that matches your role.

## Who should read what

| Role | Start here |
|---|---|
| Renter or demo participant | [User guide](USER_GUIDE.md) |
| Judge or product reviewer | Product contract, golden demo, current limitations |
| Frontend developer | Frontend flow, shared API contracts, accessibility |
| Backend developer | Request lifecycle, services, persistence, verification |
| Policy or data maintainer | Sources of truth and dataset update workflow |
| Security reviewer | Trust boundaries, prompt-injection controls, session deletion |
| Operator | Configuration, durable mode, cleanup, troubleshooting |

## Product contract

RealDoor helps a renter prepare an application packet. It may explain official guidance, retrieve an exact published threshold, extract document evidence, calculate annualized income deterministically, and identify preparation gaps.

It must never:

- decide or predict eligibility;
- approve, deny, rank, or score a renter;
- present checklist completion as an eligibility score;
- automatically submit or transmit a packet;
- obey instructions contained in an upload;
- silently trust model-generated numbers, citations, or field mutations;
- store sensitive renter information in browser persistence or shared retrieval data.

These are system invariants, not optional interface copy.

## Supported scope

- Program: LIHTC application preparation.
- Geography: Albany, GA MSA.
- Policy year: FY2026.
- Profile: household sizes supported by the structured table and 50%/60% MTSP bands.
- Documents: strongest support for the included synthetic PDFs; arbitrary images require human review or configured OCR.
- Persistence: in-memory local mode or PostgreSQL/Supabase durable mode.

## Golden demo

Use the synthetic documents in `data/synthetic_documents`:

1. Start a session and select LIHTC.
2. Set a three-person household and 60% band.
3. Accept consent.
4. Upload both pay stubs, employment verification, the outdated bank statement, and expired ID.
5. Demonstrate page evidence, correction, confirmation, and duplicate suppression.
6. Show the stale bank statement and expired ID in Readiness.
7. Show the exact MTSP source and deterministic income formula.
8. Ask the assistant a grounded policy question.
9. Upload the adversarial pay stub and show that embedded instructions are ignored.
10. Preview, generate, and download a packet.
11. Delete the packet and terminate the session.

Never improvise a qualification conclusion during the demo.

## Architecture

### Frontend

The React application lives directly in `frontend/`.

- `src/App.jsx`: lazy routes and application shell.
- `src/routeConfig.js`: route titles, journey steps, navigation, and assistant context.
- `src/api/`: Axios contracts and streamed chat client.
- `src/components/ui/`: reusable UI primitives.
- `src/components/layout/`: resizable/collapsible navigation and assistant.
- `src/pages/`: program, profile, upload, extraction, readiness, documents, rules, and packet pages.
- `src/index.css`: semantic tokens, component styles, responsive rules, and focus behavior.

The browser uses an HttpOnly session cookie. It does not persist renter documents or extracted values in `localStorage`.

### Backend

The FastAPI application is in `backend/app/`.

- `api/routes/`: HTTP boundaries and authorization checks.
- `schemas/`: validated request and response models.
- `repositories/`: in-memory and PostgreSQL implementations.
- `services/documents.py`: file detection, extraction, normalization, and duplicate identity.
- `services/readiness.py`: checklist evaluation and deterministic confirmed-income selection.
- `services/rules.py`: structured rules and MTSP lookup.
- `services/chat.py`: retrieval, provider fallback, response guards, and citations.
- `services/safety.py`: untrusted-instruction detection and document-text neutralization.
- `services/packets.py`: preview and PDF generation.
- `core/config.py`: environment parsing and safety constraints.

### Request lifecycle

```text
Browser opens application
  -> GET /api/session creates or resumes temporary session
  -> program/profile/consent updates session
  -> upload validates bytes and stores temporary file
  -> extractor emits allowlisted fields with page evidence
  -> renter confirms or corrects fields
  -> readiness evaluates dataset requirements
  -> assistant explains retrieved trusted context
  -> packet service creates only on explicit request
  -> renter downloads/deletes packet or deletes session
```

## Sources of truth

### Checklist requirements

`data/rules/checklist_2026.json` defines:

- document type and label;
- minimum document count;
- freshness or expiration field;
- maximum age where applicable;
- every required extracted field;
- the checklist citation.

The backend includes these requirements in `/api/readiness`. Upload and Readiness render that response. Do not add a second hardcoded frontend checklist.

### Rules and formulas

`data/rules/lihtc_2026.json` contains the versioned rule records and deterministic formula metadata used by the rules experience.

### Structured MTSP values

`data/processed/albany_mtsp_2026.json` is used for exact lookup. Numeric thresholds must not be generated by the chat model or extracted from free-form prose at response time.

### Retrieval corpus and sources

- `data/processed/rag_corpus_2026.json`: grounded retrieval chunks.
- `data/sources/official_sources_2026.json`: titles, pages, URLs, dates, and hashes.

The backend renders citations only for known retrieved source IDs.

### Synthetic truth

`data/synthetic_documents/gold_manifest.json` maps demo filenames to expected document classifications, extracted values, pages, source text, and bounding boxes.

## Document processing behavior

### Validation

The API checks actual file signatures rather than trusting extensions, enforces size and page limits, and rejects unsupported, corrupt, or password-protected PDFs.

### Extraction

Known synthetic filenames use the gold manifest. Other text PDFs use a conservative local fallback parser for approved renter, employment, income, banking, benefit, and identity fields. Scanned images remain review-first unless OCR is configured.

Every field carries:

- raw and normalized values;
- confidence and review status;
- document and page identity;
- source text;
- optional bounding box and note.

### Duplicate suppression

The same field name and normalized value is reviewed once across documents. Different values remain separate. Ownership is deterministic:

1. prefer a confirmed or corrected occurrence;
2. otherwise prefer the earliest uploaded document.

The fields endpoint reports `duplicates_omitted`, and Readiness uses the same canonical rule so hidden duplicates do not create impossible review actions.

### Untrusted upload text

Document text is untrusted data. Instruction-like phrases are removed from fallback parsing, the document is flagged, Readiness creates an unsafe-document finding, and chat never receives document instructions as authority.

## Readiness behavior

Readiness loads the checklist on every evaluation. For each requirement it checks:

- minimum matching document count;
- declared required fields;
- renter confirmation/correction state for canonical values;
- document age;
- expiration;
- document safety flags.

Completion is the percentage of checklist document groups that pass. It is explicitly a preparation measure, never an eligibility score.

## Assistant safety model

The assistant receives a trusted, versioned retrieval context and deterministic session context. Provider output passes through response guards before it reaches the browser.

Expected behavior:

- cite retrieved source IDs;
- abstain when trusted facts are unavailable;
- use deterministic services for numbers;
- reject eligibility and decision language;
- ignore uploaded prompt injections;
- stream the already-guarded response to the UI.

API keys enable optional providers. The local application must remain capable of safe, constrained behavior without them.

## Configuration modes

### Local demo mode

Set:

```dotenv
APP_ENV=development
FRONTEND_ORIGINS=http://localhost:5173
USE_IN_MEMORY_REPOSITORY=true
```

Data disappears when the API process restarts. Local temporary files are still removed through document/session deletion and the cleanup script.

### Durable mode

Set `USE_IN_MEMORY_REPOSITORY=false`, configure PostgreSQL URLs and Supabase storage values, then apply migrations:

```powershell
cd backend
uv run python scripts/apply_migrations.py
```

Use a direct connection URL for migrations when available and a pooler-compatible URL for application traffic. Configure explicit HTTPS frontend origins in production.

### Provider-enhanced mode

Add OpenRouter or NVIDIA credentials only in `backend/.env`. Do not expose them through Vite variables or commit them.

## Dataset update workflow

When policy requirements change:

1. Verify the official source, geography, year, effective date, and redistribution rights.
2. Update official source metadata.
3. Update the structured rule, checklist, or MTSP dataset—not frontend copy first.
4. Preserve stable IDs where meaning is unchanged; create a new ID/version when meaning changes.
5. Rebuild the retrieval corpus when source text changes.
6. Add or update a narrow regression case.
7. Walk through Upload, Extraction, Readiness, Rules, assistant citations, and Packet.

Commands:

```powershell
cd backend
uv run python scripts/import_albany_mtsp.py
uv run python scripts/build_rule_corpus.py
uv run python scripts/verify_synthetic_documents.py
```

Do not silently mix years, jurisdictions, or program variants.

## Extension playbooks

### Add an extracted field

1. Add it to the relevant checklist `required_fields` only if policy preparation needs it.
2. Add normalization and correction validation in `services/documents.py`.
3. Add manifest or conservative parser support with page evidence.
4. Confirm that duplicate identity is appropriate for the field.
5. Add one focused extraction/readiness test.

### Add a document type

1. Add a checklist item and citation.
2. Add classification evidence and approved fields.
3. Add a synthetic example and manifest entry.
4. Add upload icon/label handling only as presentation; keep requirements dataset-driven.
5. Verify extraction, freshness, readiness action routing, and packet inclusion.

### Add a geography or year

Do not overwrite the Albany 2026 data. Add versioned structured records and source metadata, extend profile selection deliberately, and ensure retrieval filters cannot cross geography or year boundaries.

### Change the assistant

Preserve deterministic routing, trusted context boundaries, citation validation, decision-language guards, and adversarial tests. A stronger prompt is not a substitute for backend enforcement.

## Accessibility and UX review

Before shipping a UI change, verify:

- keyboard navigation and visible focus;
- semantic labels and status announcements;
- dialogs return focus and can be dismissed safely;
- no color-only meaning;
- 320px width without horizontal page overflow;
- 200% zoom;
- long filenames and citations;
- loading, empty, error, disabled, and unavailable states;
- reduced motion;
- assistant and sidebars remain operable when collapsed or resized.

## Verification strategy

Use the smallest test set proportional to the change.

- Dataset/readiness change: focused backend readiness tests.
- Extraction change: document service/API tests plus one representative file.
- Chat change: injection, decision-language, citation, and streaming tests.
- UI change: relevant component test and production build.
- Contract or repository change: backend suite and frontend build.

Full checks before release:

```powershell
cd backend
uv run pytest

cd ../frontend
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Operations and cleanup

Run expired-data cleanup on a schedule in durable deployments:

```powershell
cd backend
uv run python scripts/cleanup_expired_data.py
```

Logs should use request IDs and avoid raw renter values, document text, credentials, and session cookies. Monitor health at `/api/health`.

## Common problems

### API fails at startup with `FRONTEND_ORIGINS`

Credentialed cookies cannot use a wildcard origin. Provide explicit comma-separated origins such as `http://localhost:5173`.

### API asks for `DATABASE_URL`

Set `USE_IN_MEMORY_REPOSITORY=true` for local work, or configure PostgreSQL and apply migrations.

### Browser creates a session but upload returns 403

The profile flow must record document-processing consent before upload.

### A later document has fewer displayed fields

Check `duplicates_omitted`. Exact facts already represented by another document are intentionally hidden from repeated review.

### Chat has no hosted-model answer

Check provider credentials and the provider-check script. The system should still fail safely or answer from deterministic/local trusted behavior rather than fabricate.

### PDF preview fails

Confirm the stored file still exists, is a valid PDF, and the requested page is within its page count. Images do not use PDF page rendering.

## Deployment gates

Before real renter use, complete:

- legal and fair-housing review;
- policy validation by subject-matter experts;
- security architecture and penetration testing;
- privacy and retention review;
- formal WCAG 2.2 AA audit;
- production OCR accuracy and failure-mode evaluation;
- operational backup, cleanup, incident, and access-control procedures;
- reviewed translations where offered.

## Definition of done

A change is complete when it preserves renter control, uses the correct source of truth, exposes evidence for important facts, avoids eligibility conclusions, handles failure states, passes proportional verification, and updates documentation when behavior or configuration changes.
