# RealDoor AI

Evidence-first affordable-housing application readiness assistant for renters.

RealDoor helps renters understand 2026 LIHTC and MTSP requirements, review information extracted from supporting documents, calculate income using deterministic rules, identify missing or outdated documents, and generate a renter-controlled application-readiness packet.

> RealDoor does not approve, reject, rank, or determine eligibility for renters. Final decisions remain with the housing provider or administering agency.

## Problem

Affordable-housing applications are difficult to navigate because renters must interpret complex program rules, annual income limits, household-size requirements, income calculations, and document checklists.

Common challenges include:

- understanding which income limit applies;
- determining which household members count;
- annualizing weekly, biweekly, monthly, variable, or benefit income;
- identifying missing, stale, or conflicting documents;
- understanding why a value was extracted from a document;
- finding authoritative, current program guidance;
- preparing a complete application packet without exposing unnecessary personal information.

RealDoor provides a guided workspace that combines document verification, official rules, deterministic calculations, citations, and privacy controls.

## MVP Scope

The initial MVP supports:

- one metro area;
- one LIHTC program;
- frozen 2026 program rules;
- 2026 MTSP income limits;
- synthetic renter documents;
- one end-to-end renter workflow.

The MVP intentionally avoids broad nationwide coverage, live vacancy tracking, automated application submission, and final eligibility decisions.

## Core Workflow

### 1. Profile

The renter uploads documents such as pay stubs, benefits letters, employment verification, bank statements, identity documents, and household-member records.

RealDoor extracts only approved fields and shows the extracted value, confidence, source document, page number, highlighted evidence, and confirmation or correction controls. Only renter-confirmed values are used in calculations.

### 2. Understand

The renter can ask questions such as:

- What does MTSP mean?
- Which household size applies?
- What is the 40-60 test?
- How is income annualized?
- Which documents are required?
- Which 2026 income limit applies?

Answers are grounded in official, versioned sources and include citations, section references, and effective dates.

### 3. Prepare

RealDoor checks the renter profile and uploaded documents against the selected program checklist. It identifies missing documents, expired or stale documents, unconfirmed values, conflicting records, incomplete household details, and items requiring human review.

The renter can then generate, review, download, and delete an application-readiness packet.

## What RealDoor Is Not

RealDoor is not:

- an eligibility decision engine;
- an approval or rejection system;
- a tenant-ranking tool;
- an underwriting system;
- a live vacancy source;
- a live waitlist source;
- a legal-advice service;
- a substitute for a housing provider or counselor.

The system must not state:

- “You qualify.”
- “You are eligible.”
- “You will be approved.”
- “You do not qualify.”
- “This property must accept you.”

A compliant response is:

> Your confirmed annualized income is $40,040. The published 2026 MTSP limit retrieved for the selected three-person household and 60% income band is $41,580. The housing provider makes the final determination.

## Architecture

```text
Browser
  |
  v
API Orchestrator
  |
  +-- Document Processing
  |     +-- file validation
  |     +-- OCR and layout extraction
  |     +-- PII redaction
  |     +-- document classification
  |     +-- allowlisted field extraction
  |     +-- evidence coordinates
  |
  +-- Profile Validation
  |     +-- field validation
  |     +-- document validation
  |     +-- cross-document conflict checks
  |     +-- renter confirmation state
  |
  +-- Rules Engine
  |     +-- household composition
  |     +-- income annualization
  |     +-- document freshness
  |     +-- checklist logic
  |
  +-- Structured Data Services
  |     +-- MTSP exact lookup
  |     +-- property data
  |
  +-- Retrieval Pipeline
  |     +-- metadata filtering
  |     +-- BM25 or FTS retrieval
  |     +-- FAISS semantic retrieval
  |     +-- merge and deduplicate
  |     +-- reranking
  |
  +-- Chat Orchestrator
  |     +-- intent classification
  |     +-- context resolution
  |     +-- deterministic routing
  |     +-- explanation generation
  |
  +-- Policy and Response Validation
  |     +-- citation validation
  |     +-- forbidden phrase checks
  |     +-- unsupported claim rejection
  |
  +-- Temporary Session Storage
        +-- encrypted records
        +-- expiration
        +-- explicit deletion
```

## Engineering Principles

### AI for language, deterministic code for rules and numbers

Use deterministic services for MTSP lookups, income annualization, household-size calculations, document-age checks, checklist evaluation, citation assembly, session deletion, and access control.

Use the LLM for intent understanding, plain-language explanations, summarizing confirmed information, guiding renters through missing items, and answering citation-backed rule questions.

### Smallest model that passes evaluation

Do not choose the lowest-quality model.

```text
Rules first
  -> Exact lookup
  -> Cache
  -> Small model
  -> Stronger model only for low-confidence cases
```

Model selection should be based on rule-answer accuracy, citation correctness, unsupported-claim rate, refusal accuracy, structured-output validity, latency, and cost per completed renter session.

## Data Model

### Rules Index

Stores official definitions, program rules, required-document guidance, calculation methods, exceptions, effective dates, source URLs, and page and section references.

### MTSP Table

MTSP limits are structured records, not free-text embeddings.

```json
{
  "program": "LIHTC",
  "fiscal_year": 2026,
  "area_name": "Albany, GA MSA",
  "income_band": 60,
  "household_size": 3,
  "income_limit": 41580,
  "effective_from": "2026-05-01",
  "source_id": "MTSP_2026_ALBANY"
}
```

### Property Table

Optional property-discovery records may include project ID, property name, address, geography, total units, low-income units, placed-in-service year, and source date.

Property data must not be treated as live vacancy or waitlist data.

### Renter Session Store

Temporary, private records may include document references, extracted fields, confirmed fields, user corrections, calculation traces, checklist state, and packet state.

Renter data must never be added to a shared vector index.

## Document Processing Flow

```text
Upload
  -> File validation
  -> Temporary encrypted storage
  -> OCR and layout extraction
  -> PII detection and redaction
  -> Document classification
  -> Allowlisted field extraction
  -> Normalization
  -> Evidence linking
  -> Renter confirmation
```

### Security Requirements

- validate file signature and MIME type;
- enforce file-size and page-count limits;
- reject corrupted or unsupported files;
- scan for malicious content where available;
- treat all OCR text as untrusted;
- ignore prompt instructions embedded in documents;
- redact non-allowlisted PII before LLM processing.

Potentially sensitive data to redact includes Social Security numbers, account and routing numbers, full dates of birth, tax identifiers, driver-license numbers, medical information, and employee identifiers.

## Field Extraction Schema

```json
{
  "field_name": "gross_pay",
  "raw_value": "$1,540.00",
  "normalized_value": 1540.0,
  "confidence": 0.94,
  "page": 1,
  "bounding_box": [120, 430, 320, 470],
  "source_text": "Gross Pay: $1,540.00",
  "status": "extracted"
}
```

Allowed field states:

- `extracted`
- `confirmed`
- `corrected`
- `rejected`
- `needs_review`

No extracted field becomes authoritative until the renter confirms it.

## Validation Layers

### Field Validation

Examples:

- gross pay must be numeric and non-negative;
- dates must parse correctly;
- pay-period end cannot precede pay-period start;
- household size must be positive;
- pay frequency must match an approved enum.

### Document Validation

Examples:

- issue date must not be in the future;
- YTD gross should normally be at least current gross pay;
- required fields for a document type must be present.

### Cross-Document Validation

Examples:

- conflicting employer names;
- inconsistent pay frequency;
- duplicate pay periods;
- inconsistent household members;
- materially different benefit amounts.

### Freshness Validation

```json
{
  "rule_id": "DOC-PAYSTUB-001",
  "document_type": "pay_stub",
  "max_age_days": 60,
  "effective_from": "2026-01-01",
  "source_ids": ["RULE_SOURCE_14"]
}
```

### Household Composition

Household size must be determined from versioned program rules rather than accepted as an unchecked number. The system should account for dependents, temporarily absent members, students, live-in aides, and other program-specific inclusions or exclusions.

### Income Validation

The engine should detect fixed wages, variable income, year-to-date income, benefits, self-employment, missing periods, and conflicting records. When the applicable method cannot be determined, RealDoor should request clarification or escalate rather than invent a result.

## Deterministic Calculation Engine

```json
{
  "rule_id": "INC-BIWEEKLY-001",
  "version": "2026.1",
  "income_type": "employment",
  "pay_frequency": "biweekly",
  "method": "multiply",
  "multiplier": 26,
  "effective_from": "2026-01-01",
  "source_ids": ["SOURCE_22"]
}
```

```json
{
  "calculation_id": "calc_123",
  "method": "biweekly_gross_times_26",
  "inputs": {
    "gross_pay": 1540.0,
    "periods_per_year": 26
  },
  "result": 40040.0,
  "rule_id": "INC-BIWEEKLY-001",
  "source_ids": ["SOURCE_22"]
}
```

Every calculation must be reproducible and explainable.

## Retrieval Architecture

```text
Question
  -> Intent classification
  -> Program, geography, and year resolution
  -> Metadata filtering
  -> BM25 or FTS search
  +  FAISS semantic search
  -> Merge and deduplicate
  -> Rerank
  -> Confidence threshold
  -> LLM explanation
  -> Citation validation
```

### Why Hybrid Retrieval

- keyword search finds exact legal terms and section names;
- semantic search finds conceptually related text;
- metadata prevents mixing years, jurisdictions, or programs;
- reranking improves final evidence selection.

For a small frozen corpus, exact FAISS search such as `IndexFlatIP` is sufficient.

## Citation Design

The model must not invent citation metadata.

```text
[SOURCE_1] ...
[SOURCE_2] ...
```

```json
{
  "answer": "The published limit is ...",
  "claims": [
    {
      "text": "The three-person 60% limit is $41,580.",
      "source_ids": ["SOURCE_1"]
    }
  ]
}
```

The backend must verify every source ID exists, verify each source was retrieved, confirm program/geography/year/version, reject unsupported claims, and render final citations itself.

Numeric MTSP values must come from structured lookup, not LLM generation.

## Chat Intent Routing

Supported intents may include:

- `definition_question`
- `program_rule_question`
- `mtsp_lookup`
- `income_calculation`
- `document_requirement`
- `document_status`
- `profile_update`
- `property_information`
- `application_packet`
- `privacy_request`
- `delete_session`
- `human_escalation`
- `unsupported`

Response routing order:

1. deterministic rule;
2. exact structured lookup;
3. safe cache;
4. authoritative RAG;
5. clarification;
6. human escalation;
7. refusal to speculate.

## Response Policy

```json
{
  "response_type": "neutral_income_comparison",
  "summary": "Your confirmed annualized income is $40,040.",
  "facts": [
    {
      "claim": "The published 2026 limit for a three-person household at 60% is $41,580.",
      "source_ids": ["MTSP_2026_ALBANY"]
    }
  ],
  "calculation_id": "calc_123",
  "disclaimer": "The housing provider makes the final determination.",
  "next_action": "Review missing documents"
}
```

The backend must reject unsupported numeric or factual claims before rendering.

## Readiness Checklist

```json
{
  "requirement_id": "REQ_PAYSTUB_01",
  "document_type": "pay_stub",
  "minimum_count": 2,
  "max_age_days": 60,
  "applies_when": {
    "income_type": "employment"
  },
  "source_ids": ["RULE_SOURCE_31"]
}
```

“Ready” refers only to document readiness, not eligibility.

## Privacy and Session Handling

Do not store sensitive renter data in browser `localStorage`.

Use:

- memory for transient UI state;
- `sessionStorage` only for non-sensitive navigation state;
- encrypted server-side session records;
- encrypted temporary object storage;
- secure `HttpOnly`, `SameSite` cookies;
- automatic expiration;
- explicit session deletion;
- redacted logs;
- no model training on renter data.

## Accessibility

Accessibility is a core MVP requirement.

Minimum requirements:

- complete keyboard navigation;
- visible focus indicators;
- screen-reader labels;
- logical reading order;
- sufficient contrast;
- no color-only status communication;
- plain-language errors;
- adjustable text size;
- accessible document evidence highlighting.

## Translation

- use official translated HUD materials where available;
- use professionally reviewed interface translations;
- preserve original source text;
- mark machine translations as unofficial;
- never alter numbers, formulas, dates, or source IDs during translation.

## Human Escalation

Provide a first-class “Talk to a housing counselor” action.

Escalate when household composition is ambiguous, program rules conflict, the applicable year cannot be confirmed, extraction repeatedly fails, the renter disputes a calculation, the question requires legal interpretation, or authoritative evidence is unavailable.

For the MVP, use a curated static resource directory.

## Technology Stack

### Frontend (Implemented)

- **Vite 5** + **React 18** (JavaScript, `.jsx`)
- **React Router DOM v6** — client-side routing
- **Lucide React** — icon library
- **Axios** — HTTP client (mock API layer included)
- `src/api/` contains mock API functions structured as real endpoint contracts; swap return values for `axios` calls when the backend is ready.

### Backend (Planned)

- FastAPI
- Python 3.11+

### Structured Data

- SQLite for the MVP
- PostgreSQL for a durable deployment

### Retrieval

- FAISS
- SQLite FTS5, PostgreSQL full-text search, or BM25
- lightweight reranker

### Cache

- in-process cache for the demo
- Redis when needed

### Documents

- OCR and layout extraction adapter
- encrypted temporary object storage

### Testing

- `pytest`
- API contract tests
- retrieval regression tests
- safety and prompt-injection tests

## Repository Structure

```text
realdoor-ai/
├── frontend/
│   └── realdoor-app/              ← Vite + React app (JavaScript)
│       ├── src/
│       │   ├── api/               ← Mock API contracts (swap for real calls)
│       │   │   ├── session.js     →  GET/DELETE  /api/session
│       │   │   ├── documents.js   →  POST/GET/DELETE /api/documents/...
│       │   │   ├── readiness.js   →  GET  /api/readiness
│       │   │   ├── rules.js       →  GET  /api/rules
│       │   │   ├── chat.js        →  POST /api/chat
│       │   │   └── income.js      →  POST /api/income/calculate
│       │   ├── components/
│       │   │   └── layout/
│       │   │       ├── Sidebar.jsx
│       │   │       └── AiPanel.jsx
│       │   ├── pages/
│       │   │   ├── PolicySelectPage.jsx   /            ← Program selection
│       │   │   ├── UploadPage.jsx         /upload      ← Step 1
│       │   │   ├── ExtractionPage.jsx     /extraction  ← Step 2
│       │   │   ├── WorkspacePage.jsx      /readiness   ← Readiness report
│       │   │   ├── DocumentsPage.jsx      /documents
│       │   │   └── RulesPage.jsx          /rules
│       │   ├── App.jsx
│       │   ├── main.jsx
│       │   └── index.css          ← Design tokens + global styles
│       ├── index.html
│       ├── vite.config.js
│       └── package.json
├── backend/                       ← To be implemented (FastAPI)
│   ├── app/
│   │   ├── api/
│   │   ├── document_service/
│   │   ├── profile_service/
│   │   ├── rules_service/
│   │   ├── limits_service/
│   │   ├── retrieval_service/
│   │   ├── chat_service/
│   │   ├── policy_service/
│   │   ├── packet_service/
│   │   └── session_service/
│   ├── tests/
│   └── main.py
├── data/
│   ├── mtsp/
│   ├── rules/
│   ├── properties/
│   └── synthetic_documents/
├── evals/
│   ├── golden_qa.jsonl
│   ├── retrieval_cases.jsonl
│   ├── calculation_cases.jsonl
│   └── safety_cases.jsonl
├── scripts/
│   ├── import_mtsp.py
│   ├── build_faiss_index.py
│   └── validate_rules.py
├── docs/
│   ├── architecture.md
│   ├── api-contract.md
│   ├── privacy.md
│   └── safety.md
├── .env.example
├── docker-compose.yml
└── README.md
```

## Environment Variables

```bash
APP_ENV=development
DATABASE_URL=sqlite:///./realdoor.db
SESSION_TTL_MINUTES=60
DOCUMENT_STORAGE_PATH=./tmp/documents
EMBEDDING_MODEL=
LLM_MODEL=
LLM_API_KEY=
OCR_PROVIDER=
OCR_API_KEY=
```

Never commit real credentials.

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.11+ (for backend when implemented)
- `pip` or `uv`
- Optional: Docker

### Frontend

```bash
cd frontend/realdoor-app
npm install
npm run dev
# → http://localhost:5173
```

### User Flow

```text
/ (Programs)  →  Select LIHTC program
/upload       →  Upload documents (drag & drop, AI scans)
/extraction   →  Review AI-extracted fields, confirm or correct values
/readiness    →  Application Readiness report (score, required actions)
/documents    →  Full document list
/rules        →  LIHTC rules library with citations and formulas
```

### Backend (when implemented)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### Connecting Frontend to Backend

All API calls are currently mocked in `frontend/realdoor-app/src/api/`. Each function has a comment showing the real endpoint path. To connect the backend:

1. Create a `.env` file in `frontend/realdoor-app/`:
   ```
   VITE_API_URL=http://localhost:8000
   ```
2. In each `src/api/*.js` file, uncomment the `axios` call and remove the mock return.

Example (`src/api/readiness.js`):
```js
// Before (mock):
return { score: 65, ... };

// After (real):
return (await axios.get(`${API}/api/readiness`)).data;
```

### Tests

```bash
cd backend
pytest
```

### Build Retrieval Index

```bash
python scripts/build_faiss_index.py
```

### Import MTSP Data

```bash
python scripts/import_mtsp.py
```

## Evaluation Suite

Create a golden test set before final model selection.

Recommended categories:

- definitions and terminology;
- MTSP exact lookup;
- household composition;
- fixed-income annualization;
- variable-income cases;
- document requirements;
- document freshness;
- citation validation;
- prohibited eligibility language;
- prompt injection;
- deletion and privacy.

```json
{
  "test_id": "QA-001",
  "question": "What is the 2026 60% limit for a three-person household in Albany?",
  "session_context": {
    "program": "LIHTC",
    "area": "Albany, GA MSA",
    "year": 2026
  },
  "expected_answer_facts": {
    "income_limit": 41580
  },
  "required_source_ids": ["MTSP-2026-ALBANY"],
  "forbidden_phrases": [
    "you qualify",
    "you are eligible"
  ],
  "expected_behavior": "neutral_comparison"
}
```

## Success Metrics

### Product

- field extraction accuracy;
- evidence-location accuracy;
- renter correction completion rate;
- checklist classification accuracy;
- packet generation success rate.

### Retrieval

- retrieval recall;
- citation precision;
- unsupported-claim rate;
- rule-answer accuracy;
- correct effective-date usage.

### Safety

- refusal accuracy;
- prompt-injection resistance;
- zero final eligibility claims;
- zero cross-session leakage;
- successful session deletion.

### Efficiency

- cost per completed renter session;
- average latency;
- cache hit rate;
- strong-model escalation rate.

## MVP Demo Scenario

1. Select Albany, Georgia and the LIHTC program.
2. Upload a synthetic pay stub.
3. Extract gross pay, employer, pay date, and pay frequency.
4. Highlight the source evidence.
5. Correct gross pay from `$1,450` to `$1,540`.
6. Annualize biweekly income deterministically: `$1,540 × 26 = $40,040`.
7. Retrieve the structured 2026 MTSP limit: `$41,580` for a three-person household at 60%.
8. Display a neutral comparison.
9. Identify a missing benefits letter and an outdated bank statement.
10. Generate the readiness packet.
11. Demonstrate prompt-injection refusal.
12. Delete the session.

## Roadmap

### Phase 1 — MVP

- one metro;
- one LIHTC program;
- 2026 MTSP limits;
- synthetic documents;
- document extraction and confirmation;
- deterministic calculations;
- hybrid RAG;
- citation validation;
- checklist engine;
- packet generation;
- deletion;
- accessibility.

### Phase 2 — Pilot

- resumable authenticated sessions;
- professionally reviewed translations;
- housing-counselor directory;
- broader document support;
- additional rule coverage;
- legal and fair-housing review.

### Phase 3 — Expansion

- additional metros;
- additional affordable-housing programs;
- optional property discovery;
- official integrations where available;
- provider-side packet intake without renter scoring.

## Legal and Compliance

Before any real-world launch:

- obtain legal and fair-housing review;
- validate program rules with subject-matter experts;
- review disclaimer language;
- review data-retention policies;
- complete accessibility testing;
- verify translation quality;
- perform security and privacy assessment.

This repository is intended for application-readiness assistance and demonstration purposes. It must not be used as an automated housing decision system.

## License

Add the project license here. MIT or Apache-2.0 may be appropriate for an open-source prototype.

Do not publish third-party datasets or documents unless redistribution is permitted.

## Contributing

Before opening a pull request:

- add or update tests;
- preserve citation metadata;
- do not introduce eligibility conclusions;
- do not store renter data in `localStorage`;
- do not add renter documents to shared retrieval indexes;
- keep calculations deterministic and traceable;
- document any new rule source and effective date.

## Project Status

Prototype / hackathon MVP.

Current focus:

- 2026 LIHTC and MTSP guidance;
- evidence-backed document processing;
- deterministic income calculations;
- privacy-first session handling;
- renter-controlled application readiness.
