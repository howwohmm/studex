"""Microsoft Table Transformer (TATR) v1.1-all -> tables as HTML with rowspan/colspan.

Pipeline:
  1. microsoft/table-transformer-detection      -> locate table region(s)
  2. microsoft/table-transformer-structure-recognition-v1.1-all
                                                -> rows / columns / spanning cells
  3. grid = row x column intersections, merged where a spanning cell covers them
  4. tesseract (one image_to_data call per table) -> words, assigned to cells by centroid

TATR itself is text-blind: it only predicts geometry. All text comes from tesseract.

Usage: .venv-tatr/bin/python adapters/run_tatr.py <image> [...]
"""
import json
import pathlib
import sys
import time

import torch
from PIL import Image
from torchvision import transforms

import pytesseract
from pytesseract import Output
from huggingface_hub import hf_hub_download
from transformers import TableTransformerConfig, TableTransformerForObjectDetection

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

DET_ID = "microsoft/table-transformer-detection"
STR_ID = "microsoft/table-transformer-structure-recognition-v1.1-all"

DET_MAX = 800          # canonical TATR detection input size
STR_MAX = 1000         # canonical TATR structure input size
DET_THRESH = 0.7
STR_THRESH = 0.5
CROP_PAD = 30          # px of padding around a detected table before structure pass
OCR_UPSCALE = 2.0      # A/B tested against 3x/4x and rgb-vs-grayscale
OCR_PSMS = (6, 11)     # psm 6 wins on ruled tables, psm 11 on coloured slot grids
OCR_CONF = 25          # tesseract word-confidence floor

DEVICE = torch.device("cpu")   # MPS silently misbehaves on DETR-family heads

NORM = transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])


def prep(img: Image.Image, max_size: int) -> torch.Tensor:
    w, h = img.size
    scale = max_size / max(w, h)
    resized = img.resize((int(round(w * scale)), int(round(h * scale))))
    return NORM(transforms.functional.to_tensor(resized)).unsqueeze(0)


def postprocess(outputs, size_wh, threshold):
    """DETR head -> (scores, label_ids, xyxy boxes in `size_wh` pixel coords)."""
    logits = outputs.logits[0]
    boxes = outputs.pred_boxes[0]
    prob = logits.softmax(-1)[..., :-1]          # drop the "no object" class
    scores, labels = prob.max(-1)
    keep = scores > threshold
    w, h = size_wh
    cx, cy, bw, bh = boxes[keep].unbind(-1)
    xyxy = torch.stack(
        [(cx - bw / 2) * w, (cy - bh / 2) * h, (cx + bw / 2) * w, (cy + bh / 2) * h], -1
    )
    return scores[keep].tolist(), labels[keep].tolist(), xyxy.tolist()


def iou_cover(inner, outer):
    """Fraction of `inner`'s area that lies inside `outer`."""
    ix1 = max(inner[0], outer[0])
    iy1 = max(inner[1], outer[1])
    ix2 = min(inner[2], outer[2])
    iy2 = min(inner[3], outer[3])
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    area = max(1e-6, (inner[2] - inner[0]) * (inner[3] - inner[1]))
    return inter / area


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def load(repo_id):
    """transformers>=5 rejects the `"dilation": null` in the v1.1 configs, so the
    config is downloaded, patched, and handed back explicitly."""
    try:
        return TableTransformerForObjectDetection.from_pretrained(repo_id)
    except Exception as exc:
        print(f"  config patch needed ({type(exc).__name__}); repairing", flush=True)
        cfg_path = hf_hub_download(repo_id, "config.json")
        d = json.loads(pathlib.Path(cfg_path).read_text())
        for k in ("dilation", "use_pretrained_backbone", "use_timm_backbone",
                  "auxiliary_loss", "backbone_use_pretrained"):
            if d.get(k, False) is None:
                d[k] = False
        d.pop("architectures", None)
        cfg = TableTransformerConfig(**d)
        return TableTransformerForObjectDetection.from_pretrained(repo_id, config=cfg)


print(f"loading {DET_ID} ...", flush=True)
det_model = load(DET_ID).to(DEVICE).eval()
print(f"loading {STR_ID} ...", flush=True)
str_model = load(STR_ID).to(DEVICE).eval()
print("det labels:", det_model.config.id2label, flush=True)
print("str labels:", str_model.config.id2label, flush=True)

DET_LABELS = {int(k): v for k, v in det_model.config.id2label.items()}
STR_LABELS = {int(k): v for k, v in str_model.config.id2label.items()}


def structure_to_cells(crop: Image.Image):
    """Run the structure model on a table crop -> (cells, all_boxes, label_counts)."""
    with torch.no_grad():
        out = str_model(prep(crop, STR_MAX).to(DEVICE))
    scores, labels, boxes = postprocess(out, crop.size, STR_THRESH)

    rows, cols, spans, header_boxes, all_boxes = [], [], [], [], []
    counts = {}
    for s, lab, b in zip(scores, labels, boxes):
        name = STR_LABELS.get(lab, str(lab))
        counts[name] = counts.get(name, 0) + 1
        all_boxes.append({"label": name, "score": round(s, 3),
                          "box": [round(v, 1) for v in b]})
        if name == "table row":
            rows.append(b)
        elif name == "table column":
            cols.append(b)
        elif name == "table spanning cell":
            spans.append((s, b))
        elif name == "table column header":
            header_boxes.append(b)

    rows.sort(key=lambda b: (b[1] + b[3]) / 2)
    cols.sort(key=lambda b: (b[0] + b[2]) / 2)
    if not rows or not cols:
        return [], all_boxes, counts

    # grid cell (i,j) = row i intersected with column j
    grid = {}
    for i, r in enumerate(rows):
        for j, c in enumerate(cols):
            grid[(i, j)] = [max(r[0], c[0]), max(r[1], c[1]),
                            min(r[2], c[2]), min(r[3], c[3])]

    # merge grid cells covered by a predicted spanning cell
    owner = {}          # (i,j) -> group id
    groups = {}         # group id -> dict(r0,r1,c0,c1)
    for gid, (_s, sb) in enumerate(sorted(spans, key=lambda x: -x[0])):
        hit = [(i, j) for (i, j), gb in grid.items() if iou_cover(gb, sb) >= 0.5]
        hit = [k for k in hit if k not in owner]
        if len(hit) < 2:
            continue
        r0 = min(i for i, _ in hit); r1 = max(i for i, _ in hit)
        c0 = min(j for _, j in hit); c1 = max(j for _, j in hit)
        rect = [(i, j) for i in range(r0, r1 + 1) for j in range(c0, c1 + 1)]
        if any(k in owner for k in rect):
            continue                      # would overlap an existing merge
        groups[gid] = {"r0": r0, "r1": r1, "c0": c0, "c1": c1}
        for k in rect:
            owner[k] = gid

    cells = []
    for i in range(len(rows)):
        for j in range(len(cols)):
            gid = owner.get((i, j))
            if gid is None:
                box = grid[(i, j)]
                cells.append({"row": i, "col": j, "row_span": 1, "col_span": 1,
                              "box": box})
            else:
                g = groups[gid]
                if (i, j) != (g["r0"], g["c0"]):
                    continue              # covered by the anchor cell
                members = [grid[(a, b)] for a in range(g["r0"], g["r1"] + 1)
                           for b in range(g["c0"], g["c1"] + 1)]
                box = [min(m[0] for m in members), min(m[1] for m in members),
                       max(m[2] for m in members), max(m[3] for m in members)]
                cells.append({"row": i, "col": j,
                              "row_span": g["r1"] - g["r0"] + 1,
                              "col_span": g["c1"] - g["c0"] + 1,
                              "box": box})

    header_rows = set()
    for hb in header_boxes:
        for i, r in enumerate(rows):
            if iou_cover(r, hb) >= 0.5:
                header_rows.add(i)
    for c in cells:
        c["is_header"] = c["row"] in header_rows
    return cells, all_boxes, counts


def _pass(img, psm):
    data = pytesseract.image_to_data(img, config=f"--psm {psm}",
                                     output_type=Output.DICT)
    got = []
    for k in range(len(data["text"])):
        txt = (data["text"][k] or "").strip()
        if not txt:
            continue
        try:
            conf = float(data["conf"][k])
        except (TypeError, ValueError):
            conf = -1
        if conf < OCR_CONF:
            continue
        x, y = data["left"][k] / OCR_UPSCALE, data["top"][k] / OCR_UPSCALE
        w, h = data["width"][k] / OCR_UPSCALE, data["height"][k] / OCR_UPSCALE
        got.append((conf, txt, [x, y, x + w, y + h]))
    return got


def _iou(a, b):
    ix1, iy1 = max(a[0], b[0]), max(a[1], b[1])
    ix2, iy2 = min(a[2], b[2]), min(a[3], b[3])
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / max(1e-6, ua)


def ocr_words(crop: Image.Image):
    """Two tesseract passes over the crop, merged by IoU (higher confidence wins).

    psm 6 (uniform block) reads dense ruled timetables best; psm 11 (sparse text)
    is the only mode that reads the low-contrast coloured slot grids. Neither
    alone covers both fixture styles, so the union is taken.
    """
    big = crop.resize((int(crop.width * OCR_UPSCALE), int(crop.height * OCR_UPSCALE)),
                      Image.LANCZOS).convert("L")
    words = []
    for psm in OCR_PSMS:
        for conf, txt, b in sorted(_pass(big, psm), key=lambda z: -z[0]):
            if any(_iou(b, eb) > 0.5 for _, eb in words):
                continue
            words.append((txt, b))
    return words


def fill_text(cells, words):
    for c in cells:
        c["_words"] = []
    for txt, wb in words:
        wcx, wcy = (wb[0] + wb[2]) / 2, (wb[1] + wb[3]) / 2
        best, best_a = None, 0.0
        for c in cells:
            b = c["box"]
            if b[0] <= wcx <= b[2] and b[1] <= wcy <= b[3]:
                a = (b[2] - b[0]) * (b[3] - b[1])
                # prefer the tightest containing cell
                if best is None or a < best_a:
                    best, best_a = c, a
        if best is not None:
            best["_words"].append((wcy, wb[0], txt))
    for c in cells:
        ws = sorted(c.pop("_words"))
        # group into visual lines, then left-to-right inside each line
        lines, cur, cur_y = [], [], None
        for y, x, t in ws:
            if cur_y is None or abs(y - cur_y) <= 10:
                cur.append((x, t)); cur_y = y if cur_y is None else cur_y
            else:
                lines.append(cur); cur = [(x, t)]; cur_y = y
        if cur:
            lines.append(cur)
        c["text"] = " ".join(" ".join(t for _, t in sorted(ln)) for ln in lines).strip()


def cells_to_html(cells):
    if not cells:
        return ""
    nrows = max(c["row"] for c in cells) + 1
    by_row = {}
    for c in cells:
        by_row.setdefault(c["row"], []).append(c)
    parts = ["<table>"]
    for i in range(nrows):
        row = sorted(by_row.get(i, []), key=lambda c: c["col"])
        if not row:
            continue
        parts.append("<tr>")
        for c in row:
            tag = "th" if c.get("is_header") else "td"
            attrs = ""
            if c["row_span"] > 1:
                attrs += f' rowspan="{c["row_span"]}"'
            if c["col_span"] > 1:
                attrs += f' colspan="{c["col_span"]}"'
            parts.append(f"<{tag}{attrs}>{esc(c['text'])}</{tag}>")
        parts.append("</tr>")
    parts.append("</table>")
    return "".join(parts)


for path in sys.argv[1:]:
    p = pathlib.Path(path)
    img = Image.open(p).convert("RGB")
    t0 = time.time()

    with torch.no_grad():
        det_out = det_model(prep(img, DET_MAX).to(DEVICE))
    dscores, dlabels, dboxes = postprocess(det_out, img.size, DET_THRESH)
    tables = [(s, b) for s, l, b in zip(dscores, dlabels, dboxes)
              if DET_LABELS.get(l, "").startswith("table")]
    tables.sort(key=lambda x: x[1][1])
    detected = len(tables)
    if not tables:                       # full-frame table: fall back to whole image
        tables = [(0.0, [0, 0, img.width, img.height])]

    tables_html, all_cells, all_boxes, texts = [], [], [], []
    for ti, (tscore, tb) in enumerate(tables):
        x1 = max(0, int(tb[0]) - CROP_PAD); y1 = max(0, int(tb[1]) - CROP_PAD)
        x2 = min(img.width, int(tb[2]) + CROP_PAD)
        y2 = min(img.height, int(tb[3]) + CROP_PAD)
        crop = img.crop((x1, y1, x2, y2))

        cells, sboxes, counts = structure_to_cells(crop)
        words = ocr_words(crop)
        fill_text(cells, words)
        tables_html.append(cells_to_html(cells))

        for c in cells:
            b = c["box"]
            all_cells.append({
                "table": ti, "row": c["row"], "col": c["col"],
                "row_span": c["row_span"], "col_span": c["col_span"],
                "is_header": c.get("is_header", False),
                "text": c["text"],
                "box": [round(b[0] + x1, 1), round(b[1] + y1, 1),
                        round(b[2] + x1, 1), round(b[3] + y1, 1)],
            })
        for sb in sboxes:
            b = sb["box"]
            all_boxes.append([round(b[0] + x1, 1), round(b[1] + y1, 1),
                              round(b[2] + x1, 1), round(b[3] + y1, 1)])
        texts.extend(t for t, _ in words)
        print(f"  table {ti}: det_score={tscore:.2f} {counts} "
              f"-> {len(cells)} cells, {len(words)} ocr words", flush=True)

    elapsed = time.time() - t0
    spanned = sum(1 for c in all_cells if c["row_span"] > 1 or c["col_span"] > 1)
    out = {
        "source": p.name,
        "engine": "microsoft/table-transformer v1.1-all + tesseract",
        "elapsed_seconds": round(elapsed, 2),
        "tables_detected": detected,
        "table_count": len(tables_html),
        "tables_html": tables_html,
        # NOTE: deliberately NOT called "cells" -- score.py's load_generic concatenates
        # `tables_html` and `cells`, so emitting both would double-count every cell.
        # `tables_html` is the contract key; this is the same data plus geometry.
        "cells_detail": all_cells,
        "spanning_cell_count": spanned,
        "texts": texts,
        "boxes": all_boxes,
    }
    dest = OUT / f"{p.stem}.tatr.json"
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"wrote {dest.name} — {len(tables_html)} table(s), {len(all_cells)} cells, "
          f"{spanned} spanning, {len(texts)} words, {elapsed:.1f}s", flush=True)
