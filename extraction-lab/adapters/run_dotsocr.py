"""dots.ocr (rednote-hilab, 1.7B LLM + 1.2B ViT) via mlx-vlm -> layout JSON with HTML tables.

dots.ocr is a single VLM that does layout detection AND content recognition in one
pass. Driven by its official `prompt_layout_all_en` prompt it returns a JSON array of
layout elements:

    [{"bbox": [x1,y1,x2,y2], "category": "Table", "text": "<table>...</table>"}, ...]

Category "Table" carries real HTML (with rowspan/colspan), which is exactly the
output contract's preferred "tables_html" key. Every element also carries a bbox,
so "boxes" is populated too -- but those are ELEMENT-level boxes (whole table),
not per-cell boxes. The model emits no cell geometry.

Runs on Apple Silicon via MLX. Default checkpoint mlx-community/dots.ocr-8bit (4.4GB).

The raw model string is always kept in "raw_output" so a parser bug can be told
apart from an engine failure, and a truncated/invalid JSON is salvaged element by
element rather than thrown away.

Usage: .venv-dotsocr/bin/python adapters/run_dotsocr.py <image> [<image> ...]
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import sys
import tempfile
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

MODEL_ID = os.environ.get("DOTSOCR_MODEL", "mlx-community/dots.ocr-8bit")
MAX_TOKENS = int(os.environ.get("DOTSOCR_MAX_TOKENS", "12000"))

# Phone-camera timetable shots land around 0.6-0.9 MP, which puts a 10-column grid
# at ~100px per cell. At that scale dots.ocr reads the first rows correctly and then
# falls into a degenerate `<tr><th>Tuesday</th><td></td>...` repetition loop until it
# hits the token cap. Upscaling toward ~3 MP (still far under the processor's
# 11.29 MP ceiling) gives the ViT enough detail to keep tracking rows.
# Set DOTSOCR_UPSCALE=1 to disable.
TARGET_PIXELS = float(os.environ.get("DOTSOCR_TARGET_PIXELS", "3.0e6"))
UPSCALE_CAP = float(os.environ.get("DOTSOCR_UPSCALE", "2.5"))

# Verbatim from rednote-hilab/dots.ocr -> dots_ocr/utils/prompts.py
# (`prompt_layout_all_en`). The model is trained on this exact string; paraphrasing
# it degrades the layout mode.
PROMPT_LAYOUT_ALL_EN = """Please output the layout information from the PDF image, including each layout element's bbox, its category, and the corresponding text content within the bbox.

1. Bbox format: [x1, y1, x2, y2]

2. Layout Categories: The possible categories are ['Caption', 'Footnote', 'Formula', 'List-item', 'Page-footer', 'Page-header', 'Picture', 'Section-header', 'Table', 'Text', 'Title'].

3. Text Extraction & Formatting Rules:
    - Picture: For the 'Picture' category, the text field should be omitted.
    - Formula: Format its text as LaTeX.
    - Table: Format its text as HTML.
    - All Others (Text, Title, etc.): Format their text as Markdown.

4. Constraints:
    - The output text must be the original text from the image, with no translation.
    - All layout elements must be sorted according to human reading order.

5. Final Output: The entire output must be a single JSON object.
"""


# ---------------------------------------------------------------- parsing

def _strip_fences(s: str) -> str:
    s = s.strip()
    m = re.match(r"^```(?:json)?\s*\n(.*?)(?:\n```)?$", s, re.S)
    if m:
        return m.group(1).strip()
    return s


def _salvage_elements(s: str) -> list[dict]:
    """Pull complete {...} objects out of a truncated / malformed JSON array.

    Scans for balanced braces at depth 1 while respecting string literals, so a
    generation that was cut off mid-table still yields every element that did
    finish. Returns [] if nothing parses.
    """
    out: list[dict] = []
    depth = 0
    start = -1
    in_str = False
    esc = False
    for i, ch in enumerate(s):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start >= 0:
                try:
                    obj = json.loads(s[start:i + 1])
                    if isinstance(obj, dict):
                        out.append(obj)
                except json.JSONDecodeError:
                    pass
                start = -1
            if depth < 0:
                depth = 0
    return out


def parse_layout(raw: str) -> tuple[list[dict], str]:
    """-> (elements, parse_mode). Never raises."""
    s = _strip_fences(raw)
    try:
        obj = json.loads(s)
        if isinstance(obj, list):
            return [e for e in obj if isinstance(e, dict)], "strict"
        if isinstance(obj, dict):
            for k in ("layout", "elements", "results", "data"):
                v = obj.get(k)
                if isinstance(v, list):
                    return [e for e in v if isinstance(e, dict)], "strict-wrapped"
            return [obj], "strict-single"
    except json.JSONDecodeError:
        pass
    salvaged = _salvage_elements(s)
    return salvaged, ("salvaged" if salvaged else "unparsed")


def has_spans(html_list: list[str]) -> bool:
    return any(re.search(r"(row|col)span\s*=", h, re.I) for h in html_list)


# ---------------------------------------------------------------- run

def prepare_image(img_path: pathlib.Path, tmpdir: pathlib.Path) -> tuple[str, tuple[int, int], float]:
    """Return (path_to_feed, original_size, scale). Upscales small images in place."""
    from PIL import Image

    with Image.open(img_path) as im:
        w, h = im.size
        px = w * h
        scale = min(UPSCALE_CAP, max(1.0, (TARGET_PIXELS / px) ** 0.5))
        if scale <= 1.01:
            return str(img_path), (w, h), 1.0
        nw, nh = int(round(w * scale)), int(round(h * scale))
        tmpdir.mkdir(parents=True, exist_ok=True)
        dest = tmpdir / f"{img_path.stem}.x{scale:.2f}.png"
        im.convert("RGB").resize((nw, nh), Image.LANCZOS).save(dest)
    return str(dest), (w, h), scale


def run_one(model, processor, config, img_path: pathlib.Path) -> dict:
    from mlx_vlm import generate
    from mlx_vlm.prompt_utils import apply_chat_template

    feed, (w, h), scale = prepare_image(
        img_path, pathlib.Path(tempfile.gettempdir()) / "dotsocr_upscaled"
    )

    formatted = apply_chat_template(
        processor, config, PROMPT_LAYOUT_ALL_EN, num_images=1
    )
    t0 = time.perf_counter()
    result = generate(
        model,
        processor,
        formatted,
        image=[feed],
        max_tokens=MAX_TOKENS,
        temperature=0.0,
        verbose=False,
    )
    attempt = "greedy"

    # On sparse grids (many blank cells) greedy decoding falls into a
    # `<tr><th>Tuesday</th><td></td>...` loop and runs to the token cap. A mild
    # repetition penalty over a short window breaks the loop; it is NOT the default
    # because legitimately repeated cell text (a 3-period block repeating the same
    # subject) is correct content that a penalty would discourage.
    if (getattr(result, "generation_tokens", 0) or 0) >= MAX_TOKENS:
        result = generate(
            model,
            processor,
            formatted,
            image=[feed],
            max_tokens=MAX_TOKENS,
            temperature=0.0,
            repetition_penalty=1.05,
            repetition_context_size=80,
            verbose=False,
        )
        attempt = "greedy+repetition_penalty_1.05"
    elapsed = time.perf_counter() - t0

    raw = getattr(result, "text", None)
    if raw is None:
        raw = str(result)

    elements, parse_mode = parse_layout(raw)

    tables_html: list[str] = []
    texts: list[str] = []
    boxes: list[list[float]] = []
    categories: list[str] = []

    for el in elements:
        cat = str(el.get("category", "") or "")
        txt = el.get("text")
        bbox = el.get("bbox")
        categories.append(cat)
        if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
            try:
                # Model sees the upscaled image; report boxes in ORIGINAL pixels.
                boxes.append([round(float(v) / scale, 1) for v in bbox])
            except (TypeError, ValueError):
                boxes.append([])
        else:
            boxes.append([])
        if cat.lower() == "table" and isinstance(txt, str) and txt.strip():
            tables_html.append(txt.strip())
        elif isinstance(txt, str) and txt.strip():
            texts.append(txt.strip())

    return {
        "engine": "dots.ocr",
        "model": MODEL_ID,
        "runtime": "mlx-vlm",
        "mode": "prompt_layout_all_en",
        "image": str(img_path),
        "image_size": [w, h],
        "input_scale": round(scale, 3),
        "max_tokens": MAX_TOKENS,
        "decode": attempt,
        "truncated": None,  # filled below
        "elapsed_seconds": round(elapsed, 2),
        "parse_mode": parse_mode,
        "n_elements": len(elements),
        "tables_html": tables_html,
        "texts": texts,
        "boxes": boxes,
        "box_level": "layout-element",  # NOT per-cell
        "categories": categories,
        "has_spans": has_spans(tables_html),
        "prompt_tokens": getattr(result, "prompt_tokens", None),
        "generation_tokens": getattr(result, "generation_tokens", None),
        "peak_memory_gb": getattr(result, "peak_memory", None),
        "raw_output": raw,
    } | {
        "truncated": (getattr(result, "generation_tokens", 0) or 0) >= MAX_TOKENS,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    args = ap.parse_args()

    from mlx_vlm import load
    from mlx_vlm.utils import load_config

    t_load = time.perf_counter()
    model, processor = load(MODEL_ID)
    config = load_config(MODEL_ID)
    print(f"[dotsocr] model loaded in {time.perf_counter() - t_load:.1f}s", flush=True)

    rc = 0
    for p in args.images:
        img = pathlib.Path(p).resolve()
        dest = OUT / f"{img.stem}.dotsocr.json"
        try:
            rec = run_one(model, processor, config, img)
        except Exception as e:  # noqa: BLE001 - one bad image must not kill the batch
            import traceback
            rec = {
                "engine": "dots.ocr",
                "model": MODEL_ID,
                "image": str(img),
                "error": f"{type(e).__name__}: {e}",
                "traceback": traceback.format_exc(),
                "elapsed_seconds": None,
                "tables_html": [],
                "texts": [],
                "boxes": [],
            }
            rc = 1
        dest.write_text(json.dumps(rec, indent=2, ensure_ascii=False))
        print(
            f"[dotsocr] {img.name}: {rec.get('elapsed_seconds')}s "
            f"tables={len(rec.get('tables_html', []))} "
            f"texts={len(rec.get('texts', []))} "
            f"spans={rec.get('has_spans')} "
            f"parse={rec.get('parse_mode')} -> {dest}",
            flush=True,
        )
    return rc


if __name__ == "__main__":
    sys.exit(main())
