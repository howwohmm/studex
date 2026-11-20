"""PP-StructureV3 -> tables as HTML (with rowspan/colspan) + cell geometry.

Usage: .venv312/bin/python run_paddle.py <image> [...]
First run downloads the layout/table models.
"""
import json
import pathlib
import sys
import time

OUT = pathlib.Path(__file__).parent / "out"
OUT.mkdir(exist_ok=True)

from paddleocr import PPStructureV3  # noqa: E402

pipeline = PPStructureV3(use_doc_orientation_classify=True, use_doc_unwarping=False)


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


for path in sys.argv[1:]:
    p = pathlib.Path(path)
    t0 = time.time()
    results = pipeline.predict(str(p))
    elapsed = time.time() - t0

    tables_html, raw_texts, boxes = [], [], []
    for res in results:
        d = res.json if hasattr(res, "json") else res
        if isinstance(d, dict) and "res" in d:
            d = d["res"]
        for h in deep_find(d, "pred_html"):
            if isinstance(h, str) and "<" in h:
                tables_html.append(h)
        for t in deep_find(d, "rec_texts"):
            if isinstance(t, list):
                raw_texts.extend(t)
        for b in deep_find(d, "rec_boxes"):
            try:
                boxes.extend([list(map(float, x)) for x in b])
            except Exception:
                pass

    out = {
        "source": p.name,
        "elapsed_seconds": round(elapsed, 2),
        "table_count": len(tables_html),
        "tables_html": tables_html,
        "ocr_text_count": len(raw_texts),
        "ocr_texts": raw_texts[:600],
        "ocr_boxes": boxes[:600],
    }
    dest = OUT / f"{p.stem}.paddle.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"wrote {dest.name} — {len(tables_html)} table(s), "
          f"{len(raw_texts)} text boxes, {elapsed:.1f}s", flush=True)
