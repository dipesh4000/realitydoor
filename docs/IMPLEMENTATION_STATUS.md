# RealDoor implementation status

## Actual judged scope

RealDoor supports one FY2026 LIHTC workflow for Albany, GA MSA using synthetic renter documents and a human-controlled preparation decision. It must expose evidence and confidence, require renter correction/confirmation, explain versioned rules with citations and effective dates, deterministically calculate income, identify missing/stale/expired documents, let the renter preview/edit/download/delete a packet, refuse eligibility decisioning, protect session data, and meet WCAG 2.2 AA behavior.

## Implemented

- Consent-gated temporary renter sessions with household size and 50%/60% profile selection.
- PDF/image signature, size, corruption, and PDF page-count validation.
- Allowlisted synthetic extraction with confidence, source text, page, bounding boxes, correction, confirmation, rejection, and a rendered evidence overlay.
- Prompt-injection detection in untrusted upload text.
- Exact FY2026 Albany MTSP lookup and deterministic pay-frequency annualization.
- `Understand` response showing selected profile, exact published threshold, formula, source page, effective date, missing facts, and no eligibility conclusion.
- A 52-chunk, versioned retrieval corpus built from pinned official HUD PDFs; contextual page metadata, query augmentation, local hybrid term/cosine retrieval, reranking, safe public semantic caching, page citations, parallel provider fallback, abstention, and decision-language guards.
- Configurable readiness findings for missing, stale, expired, unsafe, and unconfirmed inputs.
- Packet preview with file selection and editable notes; explicit generation, download, and deletion; never auto-sent.
- Explicit session/document/packet deletion plus an expired-session cleanup command.
- Keyboard focus styles and labels for new critical controls.
- Seven distinct, visually verified synthetic examples under `examples/`.

## Authoritative sources

The pinned sources and hashes are in `data/sources/official_sources_2026.json`. HUD’s FY2026 MTSP page states an effective date of May 1, 2026. The scoped Albany values come from page 43 of the FY2026 HERA report.

## Production boundaries

- Arbitrary scanned image OCR still requires a configured OCR provider; image uploads are retained for human review instead of guessed extraction.
- The local retrieval layer is dependency-free lexical/vector-space retrieval. NVIDIA model calls are optional enhancements, not a requirement for a quick grounded response.
- Full legal/fair-housing review, external penetration testing, and a formal WCAG audit remain deployment gates rather than code features.
- The demo checklist is configurable preparation guidance, not a universal legal-document requirement.

## Verification

```powershell
cd backend
python -m pytest
python scripts/build_rule_corpus.py
python scripts/generate_examples.py

cd ../frontend/realdoor-app
npm.cmd run lint
npm.cmd run build
```
