"""Validate synthetic PDFs and render a visual QA contact sheet."""

from __future__ import annotations

import json
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
DOCUMENT_DIR = ROOT / "data" / "synthetic_documents"
PREVIEW_DIR = ROOT / "tmp" / "pdfs" / "synthetic_previews"


def main() -> None:
    manifest = json.loads((DOCUMENT_DIR / "gold_manifest.json").read_text(encoding="utf-8"))
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    previews: list[tuple[str, Image.Image]] = []

    for record in manifest["documents"]:
        path = DOCUMENT_DIR / record["filename"]
        reader = PdfReader(path)
        if len(reader.pages) != 1:
            raise RuntimeError(f"Expected one page in {path.name}")
        extracted = reader.pages[0].extract_text() or ""
        for evidence in record["fields"].values():
            raw = evidence["raw_value"]
            if raw not in extracted:
                raise RuntimeError(f"Missing expected text {raw!r} in {path.name}")

        pdf = pdfium.PdfDocument(str(path))
        image = pdf[0].render(scale=1.15).to_pil().convert("RGB")
        preview_path = PREVIEW_DIR / f"{path.stem}.png"
        image.save(preview_path)
        previews.append((path.name, image))

    thumb_width = 310
    thumb_height = 420
    label_height = 30
    columns = 3
    rows = (len(previews) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * thumb_width, rows * (thumb_height + label_height)), "white")
    draw = ImageDraw.Draw(sheet)
    for index, (name, image) in enumerate(previews):
        image.thumbnail((thumb_width - 12, thumb_height - 12))
        x = (index % columns) * thumb_width + 6
        y = (index // columns) * (thumb_height + label_height) + 6
        sheet.paste(image, (x, y))
        draw.text((x, y + thumb_height), name, fill="#0f172a")
    contact_sheet = PREVIEW_DIR / "contact_sheet.png"
    sheet.save(contact_sheet)
    print(f"Verified {len(previews)} PDFs; contact sheet: {contact_sheet}")


if __name__ == "__main__":
    main()

