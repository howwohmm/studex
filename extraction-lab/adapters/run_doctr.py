"""docTR (python-doctr 1.0.1) -> flat OCR text + word boxes.

docTR is a pure OCR stack: text DETECTION (DBNet / FAST / LinkNet) plus text
RECOGNITION (CRNN / PARSeq / ViTSTR / SAR). It has NO table-structure model, so
it cannot emit `tables_html` or rowspan/colspan. We therefore write the
`texts` fallback from the output contract, plus absolute-pixel `boxes`.

Usage:
  .venv-doctr/bin/python adapters/run_doctr.py <image> [<image> ...]
Env:
  DOCTR_DET=db_resnet50|fast_base|db_mobilenet_v3_large|linknet_resnet18
  DOCTR_RECO=crnn_vgg16_bn|parseq|vitstr_small|master|sar_resnet31
  DOCTR_SUFFIX=doctr      (output file is out/<stem>.<suffix>.json)
"""

import json
import os
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

DET = os.environ.get("DOCTR_DET", "db_resnet50")
RECO = os.environ.get("DOCTR_RECO", "crnn_vgg16_bn")
SUFFIX = os.environ.get("DOCTR_SUFFIX", "doctr")

t_load = time.time()
from doctr.io import DocumentFile  # noqa: E402
from doctr.models import ocr_predictor  # noqa: E402

predictor = ocr_predictor(
    det_arch=DET,
    reco_arch=RECO,
    pretrained=True,
    assume_straight_pages=True,
    detect_orientation=False,
)
load_seconds = time.time() - t_load
print(f"loaded {DET} + {RECO} in {load_seconds:.1f}s", flush=True)


def abs_box(geom, w, h):
    """docTR relative geometry -> absolute [x1, y1, x2, y2] pixels."""
    (x1, y1), (x2, y2) = geom
    return [round(x1 * w, 1), round(y1 * h, 1), round(x2 * w, 1), round(y2 * h, 1)]


for path in sys.argv[1:]:
    p = pathlib.Path(path)
    doc = DocumentFile.from_images(str(p))

    t0, c0 = time.time(), time.process_time()
    result = predictor(doc)
    elapsed = time.time() - t0
    cpu_seconds = time.process_time() - c0

    export = result.export()

    texts, boxes, words, lines = [], [], [], []
    for page in export["pages"]:
        ph, pw = page["dimensions"]  # (height, width)
        for block in page["blocks"]:
            for line in block["lines"]:
                toks = []
                for word in line["words"]:
                    val = word["value"]
                    toks.append(val)
                    words.append(
                        {
                            "text": val,
                            "confidence": round(float(word["confidence"]), 4),
                            "box": abs_box(word["geometry"], pw, ph),
                        }
                    )
                line_text = " ".join(toks)
                if not line_text.strip():
                    continue
                lb = abs_box(line["geometry"], pw, ph)
                texts.append(line_text)
                boxes.append(lb)
                lines.append({"text": line_text, "box": lb})

    confs = [w["confidence"] for w in words]
    out = {
        "source": p.name,
        "engine": "doctr-1.0.1",
        "det_arch": DET,
        "reco_arch": RECO,
        "model_load_seconds": round(load_seconds, 2),
        "elapsed_seconds": round(elapsed, 2),
        "cpu_seconds": round(cpu_seconds, 2),
        # docTR has no table-structure model: no tables_html, no cells, no spans.
        # We deliberately omit an empty "tables_html" so downstream scorers do
        # not prefer a present-but-empty structured key over the real text.
        "has_spans": False,
        "table_count": 0,
        "texts": texts,           # one entry per detected LINE, reading order
        "boxes": boxes,           # absolute [x1,y1,x2,y2] aligned with texts
        "text_count": len(texts),
        "word_count": len(words),
        "mean_word_confidence": round(sum(confs) / len(confs), 4) if confs else None,
        "words": words,           # word-level text + box + confidence
        "lines": lines,
    }

    dest = OUT / f"{p.stem}.{SUFFIX}.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(
        f"wrote {dest.name} — {len(texts)} lines / {len(words)} words, "
        f"{elapsed:.1f}s",
        flush=True,
    )
