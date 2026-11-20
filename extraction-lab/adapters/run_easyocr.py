"""EasyOCR (CRAFT detector + CRNN recognizer) -> flat OCR text + boxes.

EasyOCR has NO table-structure model. It emits word/line detections only, so
this adapter writes the `texts` fallback of the output contract plus `boxes`.
It deliberately does NOT synthesise `tables_html` -- any grid we invented here
would be *our* clustering code being benchmarked, not EasyOCR.

Usage: .venv-easyocr/bin/python adapters/run_easyocr.py <image> [...]
First run downloads craft_mlt_25k + english_g2 into ~/.EasyOCR.
"""
import json
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

import easyocr  # noqa: E402

t_init = time.time()
# gpu=False: MPS support in easyocr is unreliable; these are ~1080px images.
# ['en'] only -- adding Devanagari/Kannada swaps the recognition model and
# would degrade these all-English fixtures.
reader = easyocr.Reader(["en"], gpu=False, verbose=False)
init_seconds = round(time.time() - t_init, 2)
print(f"reader ready in {init_seconds}s (model load + any download)", flush=True)

for path in sys.argv[1:]:
    p = pathlib.Path(path)
    t0 = time.time()
    # detail=1 -> [(quad, text, confidence)]; paragraph=False keeps each
    # detection separate, which maps better onto per-cell scoring.
    results = reader.readtext(str(p), detail=1, paragraph=False)
    elapsed = time.time() - t0

    texts, boxes, confs = [], [], []
    for quad, text, conf in results:
        text = (text or "").strip()
        if not text:
            continue
        xs = [float(pt[0]) for pt in quad]
        ys = [float(pt[1]) for pt in quad]
        texts.append(text)
        boxes.append([min(xs), min(ys), max(xs), max(ys)])
        confs.append(round(float(conf), 4))

    out = {
        "source": p.name,
        "engine": "easyocr",
        "engine_version": getattr(easyocr, "__version__", "1.7.2"),
        "elapsed_seconds": round(elapsed, 2),
        "reader_init_seconds": init_seconds,
        "table_count": 0,
        "tables_html": [],
        "emits_cell_boxes": False,
        "texts": texts,
        "boxes": boxes,
        "confidences": confs,
    }
    dest = OUT / f"{p.stem}.easyocr.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"wrote {dest.name} - {len(texts)} text boxes, 0 tables, {elapsed:.1f}s",
          flush=True)
