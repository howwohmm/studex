"""RapidAI TableStructureRec (table_cls -> wired/lineless table rec) + RapidOCR.

Emits HTML tables with rowspan/colspan, cell list with spans, flat OCR texts,
and cell/OCR boxes.

Usage:
  .venv-rapidai-table/bin/python adapters/run_rapidai-table.py <image> [...]

First run downloads ONNX models (table_cls yolo, unet, lore detect/process,
plus the RapidOCR det/cls/rec models).
"""

import json
import pathlib
import sys
import time
from html.parser import HTMLParser

import numpy as np

from rapidocr import RapidOCR
from table_cls import TableCls
from wired_table_rec import WiredTableRecognition
from wired_table_rec.main import WiredTableInput
from lineless_table_rec import LinelessTableRecognition
from lineless_table_rec.main import LinelessTableInput

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)
SLUG = "rapidai-table"


class _CellParser(HTMLParser):
    """Pull <td> text + rowspan/colspan out of the engine's pred_html."""

    def __init__(self):
        super().__init__()
        self.cells = []
        self._depth = 0
        self._buf = []
        self._attrs = {}
        self._row = -1

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._row += 1
        elif tag == "td":
            self._depth = 1
            self._buf = []
            self._attrs = {k: v for k, v in attrs}

    def handle_data(self, data):
        if self._depth:
            self._buf.append(data)

    def handle_endtag(self, tag):
        if tag == "td" and self._depth:
            self._depth = 0
            text = "".join(self._buf).strip()
            self.cells.append(
                {
                    "text": text,
                    "row": self._row,
                    "row_span": int(self._attrs.get("rowspan") or 1),
                    "col_span": int(self._attrs.get("colspan") or 1),
                }
            )


def to_list(x):
    if x is None:
        return []
    if isinstance(x, np.ndarray):
        return x.tolist()
    return list(x)


def xyxy(poly):
    """Any of (4,2) poly / flat-8 / xyxy -> [x1,y1,x2,y2]."""
    a = np.asarray(poly, dtype=float).reshape(-1)
    if a.size == 4:
        return [float(v) for v in a]
    pts = a.reshape(-1, 2)
    return [
        float(pts[:, 0].min()),
        float(pts[:, 1].min()),
        float(pts[:, 0].max()),
        float(pts[:, 1].max()),
    ]


print("loading models ...", flush=True)
_t = time.time()
ocr_engine = RapidOCR()
# NOTE: the library-default classifier (yolo_cls) calls presidency-2bes07 "wireless"
# and routes it to LORE, which shreds the grid. paddle_cls and q_cls both call all
# three fixtures "wired", which matches the images (they all have visible rules).
# We route on paddle_cls and also record the default label for transparency.
cls_engine = TableCls(model_type="paddle")
cls_engine_default = TableCls(model_type="yolo")
wired_engine = WiredTableRecognition(WiredTableInput())  # unet
lineless_engine = LinelessTableRecognition(LinelessTableInput())  # LORE
print(f"models ready in {time.time() - _t:.1f}s", flush=True)


def run(path: pathlib.Path):
    t0 = time.time()

    ocr_out = ocr_engine(str(path))
    texts = list(ocr_out.txts or [])
    ocr_scores = [float(s) for s in (ocr_out.scores or [])]
    ocr_boxes_raw = to_list(ocr_out.boxes)
    # engines expect the legacy rapidocr_onnxruntime shape: [[poly4x2], text, score]
    ocr_result = [
        [b, t, s] for b, t, s in zip(ocr_boxes_raw, texts, ocr_scores)
    ]

    cls_label, cls_elapse = cls_engine(str(path))
    default_label, _ = cls_engine_default(str(path))
    engine = wired_engine if cls_label == "wired" else lineless_engine
    res = engine(str(path), ocr_result)

    elapsed = time.time() - t0

    html = res.pred_html or ""
    parser = _CellParser()
    if html:
        parser.feed(html)

    logic = to_list(res.logic_points)
    cell_bboxes = to_list(res.cell_bboxes)

    out = {
        "source": path.name,
        "engine": SLUG,
        "table_type": cls_label,
        "table_type_default_yolo_cls": default_label,
        "structure_model": "wired/unet" if cls_label == "wired" else "lineless/LORE",
        "table_cls_seconds": round(float(cls_elapse), 3),
        "elapsed_seconds": round(elapsed, 2),
        "table_count": 1 if html.strip() else 0,
        "tables_html": [html] if html.strip() else [],
        "cells": parser.cells,
        "cell_logic_points": logic,  # [row_start, row_end, col_start, col_end]
        "boxes": [xyxy(b) for b in cell_bboxes],
        "texts": texts,
        "ocr_text_count": len(texts),
        "ocr_boxes": [xyxy(b) for b in ocr_boxes_raw],
    }

    dest = OUT / f"{path.stem}.{SLUG}.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    spans = sum(1 for c in parser.cells if c["row_span"] > 1 or c["col_span"] > 1)
    print(
        f"wrote {dest.name} — type={cls_label}, {len(parser.cells)} cells "
        f"({spans} spanning), {len(texts)} ocr texts, {elapsed:.1f}s",
        flush=True,
    )


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        p = pathlib.Path(arg)
        try:
            run(p)
        except Exception:
            import traceback

            traceback.print_exc()
            print(f"FAILED {p.name}", flush=True)
