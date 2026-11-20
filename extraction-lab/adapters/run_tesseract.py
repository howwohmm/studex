"""Tesseract 5.5.2 + img2table 2.0.0 -> tables as HTML (with rowspan/colspan) + cell boxes.

img2table does the structure: OpenCV line detection -> cell grid -> merged-cell
reconstruction. Tesseract (shelled out, hOCR mode) does the characters. The two are
joined by bbox overlap, so text lands in the cell it physically sits in.

Usage: .venv-tesseract/bin/python adapters/run_tesseract.py <image> [...]
No model download - brew's tesseract ships eng.traineddata.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
import time

from img2table.document import Image
from img2table.ocr import TesseractOCR

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

# psm 11 = "sparse text", img2table's default. Timetable cells are short fragments
# scattered over a grid, which is exactly the sparse case.
OCR = TesseractOCR(n_threads=4, lang="eng", psm=11)


def cells_and_boxes(table):
    """Dedupe img2table's grid (a merged cell is repeated at every position it
    covers) back to one entry per physical cell, with its span."""
    by_bbox = {}
    for row_idx, row in table.content.items():
        for col_idx, cell in enumerate(row):
            b = cell.bbox
            # img2table hands back numpy ints; json can't encode those.
            key = (int(b.x1), int(b.y1), int(b.x2), int(b.y2))
            e = by_bbox.setdefault(
                key,
                {"text": cell.value or "", "rows": set(), "cols": set(),
                 "box": list(key)},
            )
            e["rows"].add(row_idx)
            e["cols"].add(col_idx)

    cells, boxes = [], []
    for e in by_bbox.values():
        boxes.append(e["box"])
        if not e["text"].strip():
            continue
        cells.append({
            "text": e["text"],
            "row_span": len(e["rows"]),
            "col_span": len(e["cols"]),
            "box": e["box"],
        })
    return cells, boxes


def flat_ocr(path):
    """Plain full-page Tesseract, independent of any table structure. Kept as a
    floor: it shows what the OCR alone saw, so a structure failure is telling
    apart from an OCR failure."""
    try:
        import pytesseract
        from PIL import Image as PILImage

        data = pytesseract.image_to_data(
            PILImage.open(path), config="--psm 11",
            output_type=pytesseract.Output.DICT,
        )
        return [t.strip() for t, c in zip(data["text"], data["conf"])
                if t.strip() and float(c) >= 50]
    except Exception as exc:  # noqa: BLE001
        print(f"  flat OCR failed: {exc}", file=sys.stderr)
        return []


def run(path: pathlib.Path):
    doc = Image(src=str(path), detect_rotation=False)

    t0 = time.time()
    tables = doc.extract_tables(ocr=OCR, implicit_rows=True, implicit_columns=False,
                                borderless_tables=False, min_confidence=50)
    mode = "bordered"

    # Ruled-grid detection found nothing -> fall back to the borderless detector.
    if not tables:
        tables = doc.extract_tables(ocr=OCR, implicit_rows=True, implicit_columns=False,
                                    borderless_tables=True, min_confidence=50)
        mode = "borderless"
    elapsed = time.time() - t0

    tables_html, all_cells, all_boxes = [], [], []
    for t in tables:
        tables_html.append(t.html)
        c, b = cells_and_boxes(t)
        all_cells.extend(c)
        all_boxes.extend(b)

    t1 = time.time()
    texts = flat_ocr(path)
    flat_elapsed = time.time() - t1

    has_spans = any(re.search(r'(row|col)span="[2-9]', h) for h in tables_html)

    out = {
        "source": path.name,
        "engine": "tesseract-5.5.2 + img2table-2.0.0",
        "mode": mode,
        "elapsed_seconds": round(elapsed, 2),
        "flat_ocr_seconds": round(flat_elapsed, 2),
        "table_count": len(tables_html),
        "has_spans": has_spans,
        "tables_html": tables_html,
        "cells": all_cells,
        "boxes": all_boxes,
        "texts": texts,
    }
    dest = OUT / f"{path.stem}.tesseract.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"wrote {dest.name} - {len(tables_html)} table(s) [{mode}], "
          f"{len(all_cells)} non-empty cells, spans={has_spans}, "
          f"{elapsed:.1f}s (+{flat_elapsed:.1f}s flat OCR)", flush=True)


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        run(pathlib.Path(arg))
