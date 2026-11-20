"""granite-docling-258M (IBM) via MLX -> DocTags/OTSL -> tables as HTML.

granite-docling is an end-to-end 258M VLM that emits **DocTags**: an XML-ish
document language where tables are encoded as OTSL (Optimised Table Structure
Language). OTSL carries real merge information -- `fcel` starts a cell, `lcel`
extends it left->right (colspan), `ucel` extends it up->down (rowspan) -- so the
span data survives all the way into `tables_html` without any heuristic parsing
on our side. docling_core does the OTSL -> DoclingDocument -> HTML conversion.

DocTags also carries `<loc_x>` tokens (0..500 normalised page space) for layout
items, which docling_core rescales to image pixels when we hand it the PIL image.
Whether *table cells* get boxes depends on what the model emits inside the OTSL
block; the adapter records both `boxes` (layout items) and per-cell `bbox` under
`table_cells` so a missing one is visible rather than assumed.

Inference runs on MLX (Apple Silicon Metal). torch/torchvision are installed but
are NOT used for inference -- transformers 5.x routes the Idefics3 image
processor through torchvision, so they are a preprocessing-only dependency.

PROMPT MATTERS ENORMOUSLY (measured on the three timetable fixtures):
  "Convert this page to docling." (full-page layout mode) mis-classifies a dense
  timetable grid as a <picture> and returns nothing (presidency: 3 text lines,
  zero cells), or drops out of OTSL into <text> mode and hallucinates a counting
  loop ("13:50 PM", "14:50 PM" ... "34:50 PM" -- times that do not exist on the
  page) until it hits the token cap (vit-slot-grid).
  "Convert table to OTSL." forces table mode and recovers real structure on all
  three: presidency 40 cells w/ real subject codes, vit 95 cells w/ real slot
  codes, arch 91 cells. Hence it is the default here.

Usage: .venv-granitedocling/bin/python adapters/run_granitedocling.py <image> [...]

Env knobs:
  GD_MODEL       ibm-granite/granite-docling-258M-mlx (default)
  GD_PROMPT      "Convert table to OTSL." (default; forces table/OTSL mode)
                 Use "Convert this page to docling." for full-page layout mode.
  GD_MAX_TOKENS  8192 (default)
  GD_SUFFIX      granitedocling (default) -> out/<stem>.<suffix>.json
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import sys
import time

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

MODEL_ID = os.environ.get("GD_MODEL", "ibm-granite/granite-docling-258M-mlx")
PROMPT = os.environ.get("GD_PROMPT", "Convert table to OTSL.")
MAX_TOKENS = int(os.environ.get("GD_MAX_TOKENS", "8192"))
SUFFIX = os.environ.get("GD_SUFFIX", "granitedocling")


def bbox_xyxy(bbox, page_height=None):
    """Normalise a docling BoundingBox to top-left-origin [x1, y1, x2, y2]."""
    if bbox is None:
        return None
    try:
        b = bbox
        origin = getattr(getattr(b, "coord_origin", None), "value", None)
        if origin == "BOTTOMLEFT" and page_height is not None:
            b = b.to_top_left_origin(page_height=page_height)
        return [float(b.l), float(b.t), float(b.r), float(b.b)]
    except Exception:
        return None


def degeneracy(doctags: str) -> float:
    """Crude repetition score: 1 - (unique lines / total lines). Small models
    loop on dense tables; this makes that visible in the output instead of
    silently inflating the cell count.

    KNOWN BLIND SPOT: this only catches *verbatim* loops. The observed
    vit-slot-grid failure was an *incrementing* loop ("13:50 PM", "14:50 PM",
    ... "34:50 PM") where every line is unique, so it scored 0.004 -- looking
    clean while being entirely hallucinated. Treat `hit_token_cap` as the more
    reliable degeneration signal, and always eyeball the text."""
    lines = [ln.strip() for ln in doctags.splitlines() if ln.strip()]
    if len(lines) < 4:
        return 0.0
    return round(1.0 - len(set(lines)) / len(lines), 3)


def main(paths):
    from mlx_vlm import generate, load
    from mlx_vlm.prompt_utils import apply_chat_template
    from mlx_vlm.utils import load_config

    t0 = time.perf_counter()
    model, processor = load(MODEL_ID)
    config = load_config(MODEL_ID)
    load_s = time.perf_counter() - t0
    print(f"[granitedocling] loaded {MODEL_ID} in {load_s:.1f}s", flush=True)

    from docling_core.types.doc.document import DocTagsDocument, DoclingDocument

    for raw_path in paths:
        path = pathlib.Path(raw_path).resolve()
        stem = path.stem
        pil = Image.open(path).convert("RGB")

        formatted = apply_chat_template(processor, config, PROMPT, num_images=1)

        t = time.perf_counter()
        res = generate(
            model,
            processor,
            formatted,
            image=[str(path)],
            max_tokens=MAX_TOKENS,
            temperature=0.0,
            verbose=False,
        )
        elapsed = time.perf_counter() - t

        doctags = res.text if hasattr(res, "text") else str(res)
        gen_tokens = int(getattr(res, "generation_tokens", 0) or 0)

        # docling_core wants the full <doctag>...</doctag> envelope
        wrapped = doctags if doctags.lstrip().startswith("<doctag>") else f"<doctag>{doctags}</doctag>"

        tables_html, table_cells, boxes, texts = [], [], [], []
        parse_error = None
        markdown = ""
        try:
            dtd = DocTagsDocument.from_doctags_and_image_pairs([wrapped], [pil])
            doc = DoclingDocument.load_from_doctags(dtd, document_name=stem)

            page_heights = {}
            try:
                for no, page in doc.pages.items():
                    page_heights[no] = float(page.size.height)
            except Exception:
                pass

            def ph_for(item):
                try:
                    return page_heights.get(item.prov[0].page_no)
                except Exception:
                    return None

            for tbl in getattr(doc, "tables", []):
                try:
                    tables_html.append(tbl.export_to_html(doc=doc))
                except Exception as exc:
                    print(f"  ! export_to_html failed: {exc}", file=sys.stderr)
                h = ph_for(tbl)
                data = getattr(tbl, "data", None)
                if data is None:
                    continue
                for c in getattr(data, "table_cells", []):
                    table_cells.append({
                        "text": c.text,
                        "row_span": c.row_span,
                        "col_span": c.col_span,
                        "start_row": c.start_row_offset_idx,
                        "end_row": c.end_row_offset_idx,
                        "start_col": c.start_col_offset_idx,
                        "end_col": c.end_col_offset_idx,
                        "column_header": c.column_header,
                        "bbox": bbox_xyxy(c.bbox, h),
                    })

            for item in getattr(doc, "texts", []):
                txt = (getattr(item, "text", "") or "").strip()
                if not txt:
                    continue
                texts.append(txt)
                try:
                    b = bbox_xyxy(item.prov[0].bbox, ph_for(item))
                    if b:
                        boxes.append(b)
                except Exception:
                    pass

            markdown = doc.export_to_markdown()
        except Exception as exc:
            parse_error = f"{type(exc).__name__}: {exc}"
            print(f"  ! doctags parse failed: {parse_error}", file=sys.stderr)

        if not tables_html and not texts:
            # last-ditch flat fallback so a generation that produced *something*
            # is still scoreable: strip DocTags markup and keep the words.
            flat = re.sub(r"<[^>]*>", "\n", doctags)
            texts = [ln.strip() for ln in flat.splitlines() if ln.strip()]

        spans = sum(1 for c in table_cells if c["row_span"] > 1 or c["col_span"] > 1)
        cell_boxes = sum(1 for c in table_cells if c["bbox"])

        payload = {
            "source": path.name,
            "engine": "granite-docling-258M (mlx)",
            "model": MODEL_ID,
            "runtime": "mlx-vlm",
            "mode": "DocTags/OTSL",
            "prompt": PROMPT,
            "elapsed_seconds": round(elapsed, 2),
            "model_load_seconds": round(load_s, 2),
            "n_generated_tokens": gen_tokens,
            "hit_token_cap": gen_tokens >= MAX_TOKENS,
            "finish_reason": getattr(res, "finish_reason", None),
            "repetition_score": degeneracy(doctags),
            "table_count": len(tables_html),
            "span_cells": spans,
            "cells_with_bbox": cell_boxes,
            "parse_error": parse_error,
            "tables_html": tables_html,
            # NOT "cells": score.py's load_generic() sums tables_html cells *plus*
            # everything under "cells", which would double-count. Same data with
            # geometry, parked under a non-colliding key.
            "table_cells": table_cells,
            "texts": texts,
            "boxes": boxes,
            "markdown": markdown,
            "raw_doctags": doctags,
        }
        dest = OUT / f"{stem}.{SUFFIX}.json"
        dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
        print(
            f"[granitedocling] {stem}: {elapsed:.1f}s  tables={len(tables_html)} "
            f"cells={len(table_cells)} spans={spans} cell_boxes={cell_boxes} "
            f"texts={len(texts)} tokens={gen_tokens} rep={payload['repetition_score']} "
            f"-> {dest.name}",
            flush=True,
        )


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    main(args)
