#!/usr/bin/env python
"""PaddleOCR-VL 1.6 (0.9B: ERNIE-4.5-0.3B LM + NaViT ViT) via MLX.

WHAT THIS MODEL ACTUALLY IS
---------------------------
PaddleOCR-VL is an ELEMENT-LEVEL recognizer, not a page parser. In the official
PaddleOCR pipeline it is stage 2: PP-DocLayoutV2 detects regions, crops them, and
PaddleOCR-VL transcribes each crop under a task prompt:

    OCR:                  -> markdown / plain text
    Table Recognition:    -> OTSL table markup   (NOT HTML -- see below)
    Formula Recognition:  -> LaTeX
    Chart Recognition:    -> structured chart data

PP-DocLayoutV2 is PaddlePaddle-only with no MLX port, so this adapter runs the VL
model alone on the whole page. That is the honest "engine by itself" number, and for
2 of the 3 lab fixtures it works well.

THE FAILURE MODE (measured, not theoretical)
--------------------------------------------
The 0.3B decoder degenerates into an unbounded `<lcel>` / repeated-phrase loop when
the page framing is off-distribution, and it is startlingly brittle about it:

    arch-batches-thu-fri, full page          -> clean, 90 cells, 21s
    arch-batches-thu-fri, 24px cut off left  -> LOOP, 16.5K chars of junk, 120s
    presidency-2bes07, full page             -> LOOP, 49K chars of junk, 127s
    presidency-2bes07, cropped to grid       -> clean, 123 cells, 10s

Twenty-four pixels flip it. So: pass 1 always runs on the untouched page; only if the
output is detected as degenerate does pass 2 retry on an OpenCV-detected grid crop
(`table_region`) standing in for the missing layout stage. Cropping preemptively is
worse -- the detected boxes for arch and vit shave off their row-label columns, which
is exactly the 24px-class change that induces the loop. `used_crop` records which
pass won; `elapsed_seconds` includes the wasted pass-1 time, because that is the
engine's real cost.

`OCR:` MODE IS UNUSABLE HERE
---------------------------
Measured on all three fixtures at full page: the `OCR:` prompt loops every time
(45-120s, 12-18K chars of repeated fragments) even on vit-slot-grid, where table mode
is near-perfect. It is not run. "texts" is derived from the parsed table cells
instead; "texts_source" says so in the JSON.

OTSL, NOT HTML
--------------
Despite the prompt name, PaddleOCR-VL 1.6 emits OTSL (Optimized Table Structure
Language), the token format from IBM's TableFormer:

    <fcel>  cell with content         <ecel>  empty cell
    <lcel>  merged with cell to LEFT   -> colspan
    <ucel>  merged with cell ABOVE     -> rowspan
    <xcel>  merged both directions
    <nl>    end of row
    <ched> <rhed> <srow>               header markers

`otsl_to_html` resolves those into a real <table> with numeric rowspan/colspan, so the
contract's preferred "tables_html" key carries genuine span information. "otsl" keeps
the untranslated markup beside it.

NO GEOMETRY
-----------
The model emits no coordinates in any prompt mode -- no element boxes, no cell boxes.
"boxes" carries at most the OpenCV retry crop, which is not model output.

Usage: .venv-paddleocrvl/bin/python adapters/run_paddleocrvl.py fixtures/*.jpg
"""

from __future__ import annotations

import argparse
import html as html_mod
import json
import pathlib
import re
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"

MODEL_ID = "mlx-community/PaddleOCR-VL-1.6-4bit"

# Every clean output measured came in under 4268 chars / ~1600 tokens. 4096 caps the
# cost of a degenerate pass without truncating a good one.
MAX_TOKENS = 4096

# Verbatim from the PaddleOCR-VL model card PROMPTS dict. The model is trained on
# these exact strings; paraphrasing them breaks the task head.
PROMPT_TABLE = "Table Recognition:"

# Greedy decoding on a 0.3B decoder locks into repeat loops on dense grids. A light
# penalty over a short window does not prevent the big framing-induced loops above,
# but every "clean" measurement in this file was taken with it on, so it stays.
REP_PENALTY = 1.05
REP_CONTEXT = 40

DEGENERATE_CHARS = 8000
_PHRASE_LOOP = re.compile(r"(.{8,60}?)\1{6,}", re.S)


def is_degenerate(txt: str) -> bool:
    """True when the decoder has locked into a repeat loop."""
    if len(txt) > DEGENERATE_CHARS:  # cheap check first: keeps the regex off 49K strings
        return True
    return bool(_PHRASE_LOOP.search(txt))


# --------------------------------------------------------------------------- layout


def table_region(img, pad: int = 10, min_area_frac: float = 0.35):
    """Retry-only stand-in for PP-DocLayoutV2: bbox of the ruled grid.

    Uses line INTERSECTIONS rather than raw lines: a page border contributes four
    corners, a real table contributes thousands, so the junction bbox hugs the grid
    and drops a logo/title band sitting above it (the presidency failure).

    Returns (x1, y1, x2, y2), or None when no convincing grid is found. Conservative
    by design -- it only fires when the region covers most of the page, so a bad
    detection degrades to "no retry" rather than to a wrong crop.
    """
    import cv2
    import numpy as np

    a = np.array(img.convert("L"))
    h, w = a.shape
    bw = cv2.adaptiveThreshold(a, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                               cv2.THRESH_BINARY_INV, 25, 10)
    hk = cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, w // 25), 1))
    vk = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(20, h // 25)))
    hl = cv2.morphologyEx(bw, cv2.MORPH_OPEN, hk)
    vl = cv2.morphologyEx(bw, cv2.MORPH_OPEN, vk)
    # Dilate before AND-ing so a few px of line misalignment still counts as a junction.
    j = cv2.bitwise_and(cv2.dilate(hl, np.ones((7, 1), np.uint8)),
                        cv2.dilate(vl, np.ones((1, 7), np.uint8)))
    ys, xs = np.nonzero(j)
    if xs.size == 0:
        return None
    x1, y1 = max(0, int(xs.min()) - pad), max(0, int(ys.min()) - pad)
    x2, y2 = min(w, int(xs.max()) + pad + 1), min(h, int(ys.max()) + pad + 1)
    if (x2 - x1) * (y2 - y1) < min_area_frac * w * h:
        return None
    if (x2 - x1) < 0.5 * w or (y2 - y1) < 0.5 * h:
        return None
    return (x1, y1, x2, y2)


# ----------------------------------------------------------------------------- OTSL

_TOKEN = re.compile(r"<(fcel|ecel|lcel|ucel|xcel|ched|rhed|srow|nl)>")


def parse_otsl(raw: str):
    """OTSL string -> grid[row][col] = (tag, text)."""
    parts = _TOKEN.split(raw)
    grid, row = [], []
    i = 1
    while i < len(parts):
        tag = parts[i]
        text = parts[i + 1] if i + 1 < len(parts) else ""
        if tag == "nl":
            grid.append(row)
            row = []
        else:
            row.append((tag, " ".join(text.split())))
        i += 2
    if row:
        grid.append(row)
    return [r for r in grid if r]


def otsl_to_html(raw: str):
    """OTSL -> (html_table, cells). Resolves lcel/ucel/xcel into numeric spans."""
    grid = parse_otsl(raw)
    if not grid:
        return None, []
    ncols = max(len(r) for r in grid)
    for r in grid:
        r.extend([("ecel", "")] * (ncols - len(r)))

    # owner[r][c] = (r0, c0) of the anchor cell that this position belongs to.
    owner = [[None] * ncols for _ in grid]
    for r in range(len(grid)):
        for c in range(ncols):
            tag = grid[r][c][0]
            if tag == "lcel" and c > 0 and owner[r][c - 1]:
                owner[r][c] = owner[r][c - 1]
            elif tag == "ucel" and r > 0 and owner[r - 1][c]:
                owner[r][c] = owner[r - 1][c]
            elif tag == "xcel":
                owner[r][c] = (owner[r][c - 1] if c > 0 and owner[r][c - 1]
                               else owner[r - 1][c] if r > 0 and owner[r - 1][c]
                               else (r, c))
            else:  # fcel / ecel / ched / rhed / srow -> new anchor
                owner[r][c] = (r, c)

    spans: dict = {}
    for r in range(len(grid)):
        for c in range(ncols):
            a = owner[r][c]
            s = spans.setdefault(a, {"r": 1, "c": 1})
            s["r"] = max(s["r"], r - a[0] + 1)
            s["c"] = max(s["c"], c - a[1] + 1)

    cells, rows_html = [], []
    for r in range(len(grid)):
        tds = []
        for c in range(ncols):
            if owner[r][c] != (r, c):
                continue
            tag, text = grid[r][c]
            s = spans[(r, c)]
            el = "th" if tag in ("ched", "rhed") else "td"
            attr = ""
            if s["r"] > 1:
                attr += f' rowspan="{s["r"]}"'
            if s["c"] > 1:
                attr += f' colspan="{s["c"]}"'
            tds.append(f"<{el}{attr}>{html_mod.escape(text)}</{el}>")
            cells.append({"text": text, "row_span": s["r"], "col_span": s["c"]})
        if tds:
            rows_html.append("<tr>" + "".join(tds) + "</tr>")
    if not rows_html:
        return None, []
    return "<table>" + "".join(rows_html) + "</table>", cells


def extract_html_tables(text: str):
    """If the model ever emits real HTML instead of OTSL, take it verbatim."""
    text = re.sub(r"^\s*```(?:html)?\s*|\s*```\s*$", "", text.strip(), flags=re.M)
    return re.findall(r"<table\b.*?</table>", text, re.S | re.I)


def to_output(raw: str):
    """Model string -> (tables_html, cells, otsl_or_None)."""
    tables = extract_html_tables(raw)
    if tables:
        return tables, [], None
    html, cells = otsl_to_html(raw)
    return ([html] if html else []), cells, raw


# ------------------------------------------------------------------------------ run


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("--max-tokens", type=int, default=MAX_TOKENS)
    ap.add_argument("--no-retry", action="store_true",
                    help="skip the cropped retry; report raw full-page behaviour")
    args = ap.parse_args(argv)

    from PIL import Image
    from mlx_vlm import generate, load
    from mlx_vlm.prompt_utils import apply_chat_template
    from mlx_vlm.utils import load_config

    t0 = time.time()
    model, processor = load(MODEL_ID)
    config = load_config(MODEL_ID)
    load_seconds = round(time.time() - t0, 2)
    print(f"[paddleocrvl] model loaded in {load_seconds}s", flush=True)

    OUT.mkdir(exist_ok=True)
    formatted = apply_chat_template(processor, config, PROMPT_TABLE, num_images=1)

    def run(path):
        r = generate(model, processor, formatted, image=[str(path)],
                     max_tokens=args.max_tokens, temperature=0.0,
                     repetition_penalty=REP_PENALTY,
                     repetition_context_size=REP_CONTEXT, verbose=False)
        return getattr(r, "text", str(r))

    for raw_path in args.images:
        img_path = pathlib.Path(raw_path).resolve()
        stem = img_path.stem

        t = time.time()
        raw1 = run(img_path)
        pass1_seconds = round(time.time() - t, 2)
        deg1 = is_degenerate(raw1)

        raw2, box, pass2_seconds = None, None, 0.0
        if deg1 and not args.no_retry:
            im = Image.open(img_path).convert("RGB")
            box = table_region(im)
            if box:
                tmp = OUT / f".{stem}.paddleocrvl_crop.png"
                im.crop(box).save(tmp)
                t = time.time()
                raw2 = run(tmp)
                pass2_seconds = round(time.time() - t, 2)
                tmp.unlink(missing_ok=True)

        # Prefer the first non-degenerate pass; otherwise salvage pass 1's prefix.
        if not deg1:
            winner, used_crop = raw1, False
        elif raw2 is not None and not is_degenerate(raw2):
            winner, used_crop = raw2, True
        else:
            winner, used_crop = raw1, False

        tables, cells, otsl = to_output(winner)
        texts = [c["text"] for c in cells if c["text"]]
        degenerate = is_degenerate(winner)

        rec = {
            "engine": "paddleocrvl",
            "model": MODEL_ID,
            "image": str(img_path),
            "tables_html": tables,
            "cells": cells,
            "texts": texts,
            "texts_source": "table cells (the model's OCR: prompt loops on these pages)",
            # Model emits NO geometry. At most the OpenCV retry crop lands here.
            "boxes": [list(box)] if (box and used_crop) else [],
            "crop_box": list(box) if (box and used_crop) else None,
            "used_crop": used_crop,
            "degenerate": degenerate,
            "otsl": otsl,
            "elapsed_seconds": round(pass1_seconds + pass2_seconds, 2),
            "pass1_seconds": pass1_seconds,
            "pass2_seconds": pass2_seconds,
            "pass1_degenerate": deg1,
            "model_load_seconds": load_seconds,
            "raw_output": {"pass1_fullpage": raw1, "pass2_cropped": raw2},
        }

        dest = OUT / f"{stem}.paddleocrvl.json"
        dest.write_text(json.dumps(rec, ensure_ascii=False, indent=2))
        spans = sum(1 for c in cells if c["row_span"] > 1 or c["col_span"] > 1)
        print(f"[paddleocrvl] {stem}: {len(tables)} table(s), {len(cells)} cells "
              f"({spans} spanning), {rec['elapsed_seconds']}s "
              f"(p1 {pass1_seconds}s{'+LOOPED' if deg1 else ''}"
              f"{f', p2 {pass2_seconds}s crop={box}' if raw2 is not None else ''})"
              f"{' DEGENERATE' if degenerate else ''} -> {dest.name}", flush=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
