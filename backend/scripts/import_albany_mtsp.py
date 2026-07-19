"""Extract the frozen Albany FY2026 50% and 60% limits from HUD's report."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "Dataset" / "HERA-Income-Limits-Report-FY26.pdf"
OUTPUT = ROOT / "data" / "processed" / "albany_mtsp_2026.json"
AREA = "Albany, GA MSA"


def parse() -> dict:
    reader = PdfReader(SOURCE)
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        area_index = text.find(AREA)
        if area_index < 0:
            continue
        block = text[area_index : area_index + 1100]
        mfi = re.search(r"FY\s+2026\s+MFI:\s+\$([\d,]+)", block)
        fifty = re.search(r"VERY LOW INCOME\s+((?:\d+\s+){7}\d+)", block)
        sixty = re.search(r"60% INCOME LIMIT\s+((?:\d+\s+){7}\d+)", block)
        if not (mfi and fifty and sixty):
            raise RuntimeError("Albany block was found but expected limit rows were missing")
        values = lambda match: [int(item) for item in match.group(1).split()]
        return {
            "source": {
                "id": "HUD_MTSP_HERA_2026",
                "title": "FY 2026 HERA Income Limits Report",
                "publisher": "U.S. Department of Housing and Urban Development",
                "canonical_url": "https://www.huduser.gov/portal/datasets/mtsp.html",
                "local_path": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
                "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                "page": page_number,
                "effective_from": "2026-05-01",
            },
            "program": "LIHTC",
            "fiscal_year": 2026,
            "area_name": AREA,
            "median_family_income": int(mfi.group(1).replace(",", "")),
            "limits": {"50": values(fifty), "60": values(sixty)},
        }
    raise RuntimeError(f"{AREA} was not found in {SOURCE}")


if __name__ == "__main__":
    document = parse()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {AREA} FY2026 limits to {OUTPUT}")
