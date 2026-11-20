"""PP-StructureV3 with MOBILE weights -> tables as HTML (rowspan/colspan) + geometry.

Mobile stack (vs. run_paddle.py which uses the server defaults):
  * text det  : PP-OCRv5_mobile_det   (~5 MB)   instead of PP-OCRv5_server_det  (~84 MB)
  * text rec  : PP-OCRv5_mobile_rec   (~16 MB)  instead of PP-OCRv5_server_rec  (~81 MB)
  * table str : SLANet_plus           (~7.7 MB) for BOTH wired and wireless tables,
                run end-to-end so the RT-DETR-L cell detectors (124 MB each) and
                SLANeXt_wired (349 MB) never run.
  * formula / seal / chart recognition disabled (keeps PP-FormulaNet_plus-L, 701 MB, out).

Layout detection stays on the pipeline default (PP-DocLayout_plus-L, 124 MB) so the only
variable changed vs. the server run is the OCR + table-structure stack.

Usage:
  .venv-paddlemobile/bin/python adapters/run_paddlemobile.py <image> [<image> ...]
"""

import json
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

from paddleocr import PPStructureV3  # noqa: E402

t_init = time.time()
pipeline = PPStructureV3(
    # --- mobile OCR weights ---
    text_detection_model_name="PP-OCRv5_mobile_det",
    text_recognition_model_name="PP-OCRv5_mobile_rec",
    # --- mobile table structure: SLANet_plus for wired AND wireless ---
    wired_table_structure_recognition_model_name="SLANet_plus",
    wireless_table_structure_recognition_model_name="SLANet_plus",
    # --- keep parity with run_paddle.py ---
    use_doc_orientation_classify=True,
    use_doc_unwarping=False,
    # --- drop the heavy heads a phone would never ship ---
    use_formula_recognition=False,
    use_seal_recognition=False,
    use_chart_recognition=False,
)
INIT_SECONDS = round(time.time() - t_init, 2)
print(f"pipeline ready in {INIT_SECONDS}s", flush=True)


def deep_find(obj, key):
    """Collect every value stored under `key`, at any depth."""
    hits = []

    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k == key:
                    hits.append(v)
                walk(v)
        elif isinstance(o, (list, tuple)):
            for v in o:
                walk(v)

    walk(obj)
    return hits


def to_xyxy(box):
    """Normalise a box to [x1, y1, x2, y2]; accepts xyxy or 4-point polygons."""
    try:
        vals = [float(v) for v in box]
    except (TypeError, ValueError):
        try:
            pts = [[float(a), float(b)] for a, b in box]
        except Exception:
            return None
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return [min(xs), min(ys), max(xs), max(ys)]
    if len(vals) == 4:
        return vals
    if len(vals) == 8:
        xs, ys = vals[0::2], vals[1::2]
        return [min(xs), min(ys), max(xs), max(ys)]
    return None


for path in sys.argv[1:]:
    p = pathlib.Path(path)
    t0 = time.time()
    results = pipeline.predict(
        str(p),
        # SLANet_plus emits HTML directly for BOTH table types; without these the
        # wired path would route through the 124 MB RT-DETR-L cell detector.
        use_e2e_wired_table_rec_model=True,
        use_e2e_wireless_table_rec_model=True,
    )
    elapsed = time.time() - t0

    tables_html, texts, boxes, cell_boxes = [], [], [], []
    for res in results:
        d = res.json if hasattr(res, "json") else res
        if isinstance(d, dict) and "res" in d:
            d = d["res"]
        for h in deep_find(d, "pred_html"):
            if isinstance(h, str) and "<" in h:
                tables_html.append(h)
        for t in deep_find(d, "rec_texts"):
            if isinstance(t, list):
                texts.extend(t)
        for b in deep_find(d, "rec_boxes"):
            if isinstance(b, (list, tuple)):
                for x in b:
                    xy = to_xyxy(x)
                    if xy:
                        boxes.append(xy)
        # SLANet_plus / cell-detection geometry, whichever the pipeline produced
        for key in ("cell_box_list", "pred_bboxes", "table_cells_result"):
            for group in deep_find(d, key):
                if isinstance(group, (list, tuple)):
                    for x in group:
                        xy = to_xyxy(x)
                        if xy:
                            cell_boxes.append(xy)

    has_spans = any(("rowspan" in h or "colspan" in h) for h in tables_html)

    out = {
        "source": p.name,
        "engine": "paddleocr-3.7.0 PP-StructureV3 (mobile weights)",
        "models": {
            "text_detection": "PP-OCRv5_mobile_det",
            "text_recognition": "PP-OCRv5_mobile_rec",
            "table_structure": "SLANet_plus (e2e, wired+wireless)",
            "layout_detection": "PP-DocLayout_plus-L (pipeline default)",
        },
        "elapsed_seconds": round(elapsed, 2),
        "init_seconds": INIT_SECONDS,
        "table_count": len(tables_html),
        "has_spans": has_spans,
        "tables_html": tables_html,
        "text_count": len(texts),
        "texts": texts,
        "boxes": boxes,
        "cell_box_count": len(cell_boxes),
        "cell_boxes": cell_boxes,
    }
    dest = OUT / f"{p.stem}.paddlemobile.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(
        f"wrote {dest.name} — {len(tables_html)} table(s), {len(texts)} text boxes, "
        f"{len(cell_boxes)} cell boxes, spans={has_spans}, {elapsed:.1f}s",
        flush=True,
    )
