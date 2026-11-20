"""RapidTable (SLANet-plus ONNX) + RapidOCR -> HTML table with rowspan/colspan.

Usage:
    .venv-rapidtable/bin/python adapters/run_rapidtable.py <image> [...]

Writes out/<stem>.rapidtable.json

Notes:
  * RapidTable is a *table structure recogniser only* - it has no layout
    detector. It assumes the whole input image is one table, which is fine
    for full-frame timetable photos.
  * We run RapidOCR ourselves first (so we can report raw text + boxes and
    time the two stages separately) and then hand the OCR result to
    RapidTable, which matches text into the predicted cell grid.
"""

import html as html_mod
import json
import pathlib
import re
import sys
import time

import numpy as np

from rapid_table import ModelType, RapidTable, RapidTableInput
from rapidocr import RapidOCR

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

MODEL_TYPE = ModelType(
    sys.argv[1].split("=", 1)[1]
    if len(sys.argv) > 1 and sys.argv[1].startswith("--model=")
    else "slanet_plus"
)
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]

t_init = time.perf_counter()
ocr_engine = RapidOCR()
# use_ocr must stay True: RapidTable only runs the html matcher on that path.
# We still pass our own ocr_results in, so the internal engine is never called.
table_engine = RapidTable(RapidTableInput(model_type=MODEL_TYPE, use_ocr=True))
init_elapsed = time.perf_counter() - t_init
print(f"engines ready in {init_elapsed:.1f}s (model={MODEL_TYPE.value})", flush=True)

CELL_RE = re.compile(r"<td([^>]*)>(.*?)</td>", re.S)
SPAN_RE = re.compile(r'(row|col)span\s*=\s*["\']?(\d+)')


def cells_from_html(h: str):
    """Parse <td ...>text</td> into {text,row_span,col_span} records."""
    out = []
    for attrs, inner in CELL_RE.findall(h):
        spans = {"row": 1, "col": 1}
        for kind, n in SPAN_RE.findall(attrs):
            spans[kind] = int(n)
        text = html_mod.unescape(re.sub(r"<[^>]+>", " ", inner)).strip()
        out.append(
            {"text": text, "row_span": spans["row"], "col_span": spans["col"]}
        )
    return out


def to_xyxy(box):
    """RapidTable cell bboxes are [x1,y1,x2,y2] or 4x2 polygons."""
    a = np.asarray(box, dtype=float).reshape(-1)
    if a.size == 4:
        return [round(float(v), 1) for v in a]
    pts = np.asarray(box, dtype=float).reshape(-1, 2)
    return [
        round(float(pts[:, 0].min()), 1),
        round(float(pts[:, 1].min()), 1),
        round(float(pts[:, 0].max()), 1),
        round(float(pts[:, 1].max()), 1),
    ]


for path in ARGS:
    p = pathlib.Path(path).resolve()
    t0 = time.perf_counter()

    ocr_res = ocr_engine(str(p))
    ocr_elapsed = time.perf_counter() - t0

    texts = list(ocr_res.txts) if ocr_res.txts is not None else []
    ocr_boxes = (
        [to_xyxy(b) for b in ocr_res.boxes] if ocr_res.boxes is not None else []
    )
    scores = [round(float(s), 3) for s in (ocr_res.scores or [])]

    t1 = time.perf_counter()
    if texts:
        table_res = table_engine(
            str(p),
            ocr_results=[[ocr_res.boxes, ocr_res.txts, ocr_res.scores]],
        )
    else:
        table_res = table_engine(str(p))
    table_elapsed = time.perf_counter() - t1
    elapsed = time.perf_counter() - t0

    tables_html = [h for h in (table_res.pred_htmls or []) if h]
    cells = []
    for h in tables_html:
        cells.extend(cells_from_html(h))

    # geometry + logical grid coords straight from the model
    cell_boxes, logic_points = [], []
    for arr in table_res.cell_bboxes or []:
        if arr is None:
            continue
        for b in np.asarray(arr):
            cell_boxes.append(to_xyxy(b))
    for arr in table_res.logic_points or []:
        if arr is None:
            continue
        for lp in np.asarray(arr).tolist():
            logic_points.append([int(v) for v in lp])

    # attach geometry/logical coords to cells when counts line up
    if len(cell_boxes) == len(cells):
        for c, b in zip(cells, cell_boxes):
            c["box"] = b
    if len(logic_points) == len(cells):
        for c, lp in zip(cells, logic_points):
            c["row_start"], c["row_end"], c["col_start"], c["col_end"] = lp

    has_spans = any(c["row_span"] > 1 or c["col_span"] > 1 for c in cells)

    out = {
        "engine": "rapidtable",
        "model": MODEL_TYPE.value,
        "source": p.name,
        "elapsed_seconds": round(elapsed, 2),
        "ocr_seconds": round(ocr_elapsed, 2),
        "table_seconds": round(table_elapsed, 2),
        "engine_init_seconds": round(init_elapsed, 2),
        "table_count": len(tables_html),
        # NOTE: `tables_html` is the primary contract key. The per-cell records
        # live under `cells_detail` (not `cells`) on purpose: score.py's generic
        # loader concatenates `tables_html` + `cells`, so exposing both would
        # double-count every cell and halve precision.
        "tables_html": tables_html,
        "cells_detail": cells,
        "has_spans": has_spans,
        "boxes": cell_boxes,
        "logic_points": logic_points,
        "texts": texts,
        "ocr_boxes": ocr_boxes,
        "ocr_scores": scores,
    }
    dest = OUT / f"{p.stem}.rapidtable.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(
        f"wrote {dest.name} — {len(tables_html)} table(s), {len(cells)} cells, "
        f"{len(texts)} ocr texts, spans={has_spans}, {elapsed:.1f}s "
        f"(ocr {ocr_elapsed:.1f}s + table {table_elapsed:.1f}s)",
        flush=True,
    )
