"""Build a versioned, page-cited retrieval corpus from pinned official HUD PDFs."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "data" / "processed" / "rag_corpus_2026.json"
SOURCES = [
    ("HUD_MTSP_BRIEFING_2026", "FY 2026 MTSP Briefing", ROOT / "Dataset/official/MTSP-Briefing-26.pdf", "https://www.huduser.gov/portal/datasets/mtsp.html"),
    ("HUD_MTSP_HERA_2026", "FY 2026 HERA Income Limits Report", ROOT / "Dataset/official/HERA-Income-Limits-Report-FY26.pdf", "https://www.huduser.gov/portal/datasets/mtsp.html"),
]


def _chunks(text: str, limit: int = 1100) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    output, current = [], ""
    for sentence in sentences:
        if current and len(current) + len(sentence) + 1 > limit:
            output.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        output.append(current)
    return output


def main() -> None:
    records: list[dict] = []
    for source_id, title, path, url in SOURCES:
        reader = PdfReader(path)
        # The HERA report is huge; page 43 is the scoped Albany source page.
        page_indexes = [42] if source_id == "HUD_MTSP_HERA_2026" else range(len(reader.pages))
        for page_index in page_indexes:
            page_text = reader.pages[page_index].extract_text() or ""
            for index, chunk in enumerate(_chunks(page_text)):
                chunk_id = f"{source_id}-p{page_index + 1}-c{index + 1}"
                records.append({
                    "id": chunk_id,
                    "source_id": source_id,
                    "title": title,
                    "page": page_index + 1,
                    "url": url,
                    "effective_from": "2026-05-01",
                    "text": chunk,
                })
    rules = json.loads((ROOT / "data/rules/lihtc_2026.json").read_text(encoding="utf-8"))
    for rule in rules["rules"]:
        citation = rule["citations"][0]
        records.append({
            "id": rule["id"],
            "source_id": citation["source_id"],
            "title": rule["title"],
            "page": citation["page"],
            "url": citation["url"],
            "effective_from": rule["effective_from"],
            "text": f"{rule['plain_english']} Formula: {rule['formula']}",
        })
    digest = hashlib.sha256("\n".join(item["text"] for item in records).encode()).hexdigest()
    OUTPUT.write_text(json.dumps({"version": f"hud-fy2026-{digest[:12]}", "chunks": records}, indent=2), encoding="utf-8")
    print(f"Wrote {len(records)} chunks to {OUTPUT} ({digest[:12]})")


if __name__ == "__main__":
    main()
