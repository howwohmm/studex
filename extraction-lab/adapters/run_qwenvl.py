#!/usr/bin/env python
"""Qwen3-VL-4B-Instruct (4-bit, MLX) adapter for the timetable extraction lab.

General-purpose VLM baseline: no layout model, no table-structure model, no OCR
engine. The whole image goes in, HTML comes out of the language head.

Run:
    .venv-qwenvl/bin/python adapters/run_qwenvl.py fixtures/*.jpg

Writes out/<stem>.qwenvl.json conforming to the lab contract:
    tables_html / cells / texts  +  elapsed_seconds
"""
import json
import pathlib
import re
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
MODEL_ID = "mlx-community/Qwen3-VL-4B-Instruct-4bit"
MAX_TOKENS = 8192

PROMPT = (
    "This image is a university class timetable grid.\n"
    "Convert the ENTIRE table into a single HTML <table>.\n"
    "Rules:\n"
    "- Use <tr> for every row and <td> for every cell, including header rows.\n"
    "- If a cell is merged across columns, add colspan=\"N\".\n"
    "- If a cell is merged across rows, add rowspan=\"N\".\n"
    "- Transcribe text EXACTLY as printed: subject codes, room numbers, "
    "faculty names, batch labels, times. Do not translate, expand, "
    "summarise or invent anything.\n"
    "- Use <br> to separate multiple lines inside one cell.\n"
    "- Keep empty cells as <td></td> so the grid stays aligned.\n"
    "Output ONLY the HTML table. No markdown fences, no commentary."
)


def extract_tables(text: str):
    """Pull <table>...</table> blocks; tolerate an unclosed final table."""
    text = re.sub(r"^\s*```(?:html)?\s*|\s*```\s*$", "", text.strip(), flags=re.M)
    tables = re.findall(r"<table\b.*?</table>", text, re.S | re.I)
    if tables:
        return tables, False
    # Model may have been cut off mid-table by max_tokens.
    if re.search(r"<table\b", text, re.I):
        frag = text[re.search(r"<table\b", text, re.I).start():]
        return [frag + "</table>"], True
    # No <table> at all but maybe bare rows.
    if re.search(r"<tr\b", text, re.I):
        return ["<table>" + text + "</table>"], True
    return [], False


def main(paths):
    from mlx_vlm import load, generate
    from mlx_vlm.prompt_utils import apply_chat_template
    from mlx_vlm.utils import load_config

    t0 = time.time()
    model, processor = load(MODEL_ID)
    config = load_config(MODEL_ID)
    load_seconds = round(time.time() - t0, 2)
    print(f"[qwenvl] model loaded in {load_seconds}s", flush=True)

    OUT.mkdir(exist_ok=True)
    for img in paths:
        img = pathlib.Path(img).resolve()
        stem = img.stem
        formatted = apply_chat_template(processor, config, PROMPT, num_images=1)

        t = time.time()
        result = generate(
            model,
            processor,
            formatted,
            image=[str(img)],
            max_tokens=MAX_TOKENS,
            temperature=0.0,
            verbose=False,
        )
        elapsed = round(time.time() - t, 2)

        raw = result.text if hasattr(result, "text") else str(result)
        tables, truncated = extract_tables(raw)

        payload = {
            "source": img.name,
            "engine": "qwen3-vl-4b-instruct-4bit-mlx",
            "model_id": MODEL_ID,
            "mode": "vlm-image-to-html",
            "model_load_seconds": load_seconds,
            "elapsed_seconds": elapsed,
            "prompt_tokens": getattr(result, "prompt_tokens", None),
            "generation_tokens": getattr(result, "generation_tokens", None),
            "peak_memory_gb": round(getattr(result, "peak_memory", 0) or 0, 2),
            "truncated": truncated,
            "table_count": len(tables),
            "tables_html": tables,
            "cells": [],
            "texts": [] if tables else [raw],
            "boxes": [],  # Qwen3-VL emits no boxes in this HTML mode
            "raw_response": raw,
        }
        dest = OUT / f"{stem}.qwenvl.json"
        dest.write_text(json.dumps(payload, indent=2))
        print(
            f"[qwenvl] {stem}: {elapsed}s  tables={len(tables)} "
            f"gen_tokens={payload['generation_tokens']} "
            f"truncated={truncated} -> {dest.name}",
            flush=True,
        )


if __name__ == "__main__":
    args = sys.argv[1:] or [
        str(ROOT / "fixtures" / f)
        for f in ("presidency-2bes07.jpg", "arch-batches-thu-fri.jpg", "vit-slot-grid.jpg")
    ]
    main(args)
