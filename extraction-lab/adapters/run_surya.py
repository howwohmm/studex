"""Surya 2 (surya-ocr 0.22.1) -> table HTML with rowspan/colspan + cell boxes.

Surya 2 is a VLM. On Apple Silicon it needs a llama.cpp `llama-server` binary
(`brew install llama.cpp`); surya auto-spawns it and downloads
datalab-to/surya-ocr-2-gguf (surya-2.gguf 1266MB + surya-2-mmproj.gguf 205MB).

Pipeline per image (mirrors surya/scripts/table_recognition.py):
  1. LayoutPredictor (VLM)                -> find Table / TableOfContents blocks
  2. TableRecPredictor(mode="full")       -> <table> HTML w/ colspan/rowspan
  3. TableRecPredictor.predict_simple()   -> row/col/cell geometry (boxes)

Usage:
  .venv-surya/bin/python adapters/run_surya.py fixtures/*.jpg
"""

import json
import os
import pathlib
import sys
import time

os.environ.setdefault("SURYA_INFERENCE_BACKEND", "llamacpp")
os.environ.setdefault("SURYA_INFERENCE_KEEP_ALIVE", "true")
# Surya's default guided (JSON-schema-constrained) layout decode sends a
# json_schema that llama-server b10360 rejects with
#   400 "Failed to initialize samplers: failed to parse grammar".
# Unguided decode works; layout JSON is parsed leniently by surya anyway.
os.environ.setdefault("SURYA_GUIDED_LAYOUT", "false")

from bs4 import BeautifulSoup  # noqa: E402
from PIL import Image  # noqa: E402

from surya.common.util import expand_bbox  # noqa: E402
from surya.inference import SuryaInferenceManager  # noqa: E402
from surya.layout import LayoutPredictor  # noqa: E402
from surya.table_rec import TableRecPredictor  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

SKIP_SIMPLE = os.environ.get("SURYA_SKIP_SIMPLE") == "1"


def html_texts(html: str):
    """Flat list of cell strings, in reading order."""
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for td in soup.find_all(["td", "th"]):
        t = " ".join(td.get_text(" ", strip=True).split())
        if t:
            out.append(t)
    return out


def html_cells(html: str, table_idx: int):
    soup = BeautifulSoup(html, "html.parser")
    cells = []
    for r, tr in enumerate(soup.find_all("tr")):
        for c, td in enumerate(tr.find_all(["td", "th"])):
            cells.append(
                {
                    "text": " ".join(td.get_text(" ", strip=True).split()),
                    "row": r,
                    "col": c,
                    "row_span": int(td.get("rowspan", 1) or 1),
                    "col_span": int(td.get("colspan", 1) or 1),
                    "is_header": td.name == "th",
                    "table_idx": table_idx,
                }
            )
    return cells


def main(paths):
    t_boot = time.time()
    manager = SuryaInferenceManager()
    layout_predictor = LayoutPredictor(manager)
    table_rec_predictor = TableRecPredictor(manager)
    boot = time.time() - t_boot
    print(f"[boot] predictors constructed in {boot:.1f}s", flush=True)

    for path in paths:
        p = pathlib.Path(path)
        img = Image.open(p).convert("RGB")
        t0 = time.time()

        # --- 1. layout: locate tables -----------------------------------
        t_layout0 = time.time()
        layout_pred = layout_predictor([img], target_image_sizes=[img.size])[0]
        t_layout = time.time() - t_layout0

        layout_boxes = [
            {"label": b.label, "bbox": [float(v) for v in b.bbox]}
            for b in layout_pred.bboxes
        ]
        tables_on_page = [
            b for b in layout_pred.bboxes if b.label in ("Table", "TableOfContents")
        ]
        table_imgs, table_bboxes, counts = [], [], []
        for b in tables_on_page:
            bbox = expand_bbox(b.bbox)
            table_imgs.append(img.crop(bbox))
            table_bboxes.append([float(v) for v in bbox])
            counts.append(b.count)

        # Fallback: layout found no table -> treat the whole page as one table.
        table_detected = bool(table_imgs)
        if not table_imgs:
            table_imgs = [img]
            table_bboxes = [[0.0, 0.0, float(img.width), float(img.height)]]
            # count=0 would floor max_tokens at 1024 and truncate a dense
            # timetable mid-table; ask for the full block ceiling instead.
            counts = [8192]

        # --- 2. full mode: HTML with rowspan/colspan --------------------
        t_full0 = time.time()
        full_preds = table_rec_predictor.predict_full(table_imgs, counts=counts)
        t_full = time.time() - t_full0

        tables_html, cells, texts = [], [], []
        for i, pred in enumerate(full_preds):
            if pred.error or not pred.html:
                continue
            tables_html.append(pred.html)
            cells.extend(html_cells(pred.html, i))
            texts.extend(html_texts(pred.html))

        # --- 3. simple mode: row/col/cell geometry ----------------------
        boxes, cell_boxes, t_simple = [], [], 0.0
        if not SKIP_SIMPLE:
            t_simple0 = time.time()
            simple_preds = table_rec_predictor.predict_simple(table_imgs)
            t_simple = time.time() - t_simple0
            for i, pred in enumerate(simple_preds):
                ox, oy = table_bboxes[i][0], table_bboxes[i][1]
                for cell in pred.cells:
                    b = [
                        float(cell.bbox[0]) + ox,
                        float(cell.bbox[1]) + oy,
                        float(cell.bbox[2]) + ox,
                        float(cell.bbox[3]) + oy,
                    ]
                    boxes.append(b)
                    cell_boxes.append(
                        {
                            "bbox": b,
                            "row_id": cell.row_id,
                            "col_id": cell.col_id,
                            "table_idx": i,
                        }
                    )

        elapsed = time.time() - t0
        out = {
            "source": p.name,
            "engine": "surya-ocr 0.22.1 (Surya 2, llama.cpp backend)",
            "elapsed_seconds": round(elapsed, 2),
            "timing_breakdown": {
                "layout_seconds": round(t_layout, 2),
                "table_rec_full_seconds": round(t_full, 2),
                "table_rec_simple_seconds": round(t_simple, 2),
            },
            "table_detected_by_layout": table_detected,
            "table_count": len(tables_html),
            "tables_html": tables_html,
            # NOTE: deliberately NOT called "cells" - score.py's load_generic sums
            # tables_html cells AND the "cells" key, which would double-count since
            # these are parsed from the same HTML. tables_html is the primary output.
            "cells_detail": cells,
            "texts": texts,
            "boxes": boxes,
            "cell_boxes": cell_boxes,
            "layout_boxes": layout_boxes,
            "table_bboxes": table_bboxes,
        }
        dest = OUT / f"{p.stem}.surya.json"
        dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
        spans = sum(1 for c in cells if c["row_span"] > 1 or c["col_span"] > 1)
        print(
            f"wrote {dest.name} - {len(tables_html)} table(s), {len(cells)} cells "
            f"({spans} spanning), {len(texts)} texts, {len(boxes)} cell boxes, "
            f"{elapsed:.1f}s (layout {t_layout:.1f} / full {t_full:.1f} / "
            f"simple {t_simple:.1f})",
            flush=True,
        )


if __name__ == "__main__":
    main(sys.argv[1:])
