"""GOT-OCR 2.0 (580M, stepfun-ai/GOT-OCR-2.0-hf) via transformers -> tables as HTML.

GOT is an end-to-end OCR-2.0 VLM: image in, text out, no layout stage. In its
"format" mode it emits LaTeX/markdown, so a table comes back as a
\\begin{tabular} block. This adapter converts that LaTeX to HTML, mapping
\\multicolumn -> colspan and \\multirow -> rowspan, so the output contract's
preferred "tables_html" key carries real span information.

The raw model string is always kept in "raw_format" so a converter bug can be
told apart from an engine failure.

GOT emits NO coordinates in this mode (box-grounded OCR takes boxes as *input*),
so there is no "boxes" key.

Usage: .venv-gotocr/bin/python adapters/run_gotocr.py <image> [<image> ...]
"""

from __future__ import annotations

import html as htmllib
import json
import pathlib
import re
import sys
import time

import torch
from transformers import AutoModelForImageTextToText, AutoProcessor

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

MODEL_ID = "stepfun-ai/GOT-OCR-2.0-hf"
MAX_NEW_TOKENS = 4096


# ---------------------------------------------------------------- LaTeX -> HTML

def _balanced(s: str, i: int):
    """Read a {...} group starting at s[i] == '{'. Returns (content, index_after)."""
    assert s[i] == "{"
    depth, j = 0, i
    while j < len(s):
        if s[j] == "{":
            depth += 1
        elif s[j] == "}":
            depth -= 1
            if depth == 0:
                return s[i + 1:j], j + 1
        j += 1
    return s[i + 1:], len(s)


def _split_cells(row: str) -> list[str]:
    """Split a LaTeX row on unescaped & at brace depth 0."""
    cells, depth, buf = [], 0, []
    i = 0
    while i < len(row):
        c = row[i]
        if c == "\\" and i + 1 < len(row):
            buf.append(row[i:i + 2])
            i += 2
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        if c == "&" and depth == 0:
            cells.append("".join(buf))
            buf = []
        else:
            buf.append(c)
        i += 1
    cells.append("".join(buf))
    return cells


_CLEAN = [
    (re.compile(r"\\(?:hline|toprule|midrule|bottomrule|endhead|endfoot)\b"), " "),
    (re.compile(r"\\cline\s*\{[^}]*\}"), " "),
    (re.compile(r"\\cmidrule(?:\([^)]*\))?\s*\{[^}]*\}"), " "),
    (re.compile(r"\\(?:textbf|textit|mathrm|text|bf|it|emph)\s*"), ""),
    (re.compile(r"\\\\\s*\[[^\]]*\]"), r"\\\\"),
    (re.compile(r"\\(?:vspace|hspace)\s*\{[^}]*\}"), " "),
    (re.compile(r"[$~]"), " "),
]


def _cell_text_and_spans(cell: str):
    """Unwrap \\multicolumn / \\multirow (possibly nested) -> (text, rspan, cspan)."""
    rspan = cspan = 1
    s = cell.strip()
    for _ in range(4):  # they nest at most a couple deep in practice
        m = re.match(r"\\multicolumn\s*\{", s)
        if m:
            n, k = _balanced(s, m.end() - 1)
            _, k = _balanced(s, s.index("{", k))          # column spec
            body, k = _balanced(s, s.index("{", k))
            try:
                cspan = max(cspan, int(n.strip()))
            except ValueError:
                pass
            s = body.strip()
            continue
        m = re.match(r"\\multirow\s*(?:\[[^\]]*\])?\s*\{", s)
        if m:
            n, k = _balanced(s, s.index("{", m.end() - 1))
            _, k = _balanced(s, s.index("{", k))          # width
            body, k = _balanced(s, s.index("{", k))
            try:
                rspan = max(rspan, int(n.strip().lstrip("*")))
            except ValueError:
                pass
            s = body.strip()
            continue
        break
    s = re.sub(r"\\[a-zA-Z]+\s*", " ", s)                 # leftover commands
    s = s.replace("{", " ").replace("}", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s, rspan, cspan


def latex_tabular_to_html(block: str):
    """One \\begin{tabular} body -> (html, [cell dicts]). Rowspan placeholders in
    later LaTeX rows are consumed by an occupancy grid so they don't become cells."""
    body = block
    for pat, rep in _CLEAN:
        body = pat.sub(rep, body)

    raw_rows = [r for r in re.split(r"\\\\", body)]
    occupied: dict[tuple[int, int], bool] = {}
    grid: list[list[tuple[str, int, int]]] = []
    cells_out = []

    r = 0
    for raw in raw_rows:
        if not raw.strip():
            continue
        row_cells = []
        c = 0
        for raw_cell in _split_cells(raw):
            text, rs, cs = _cell_text_and_spans(raw_cell)
            start = c
            while occupied.get((r, c)):
                c += 1
            # LaTeX repeats an *empty* cell in every row a \multirow covers.
            # If we just walked past such a covered position and this cell is
            # blank, it is that placeholder - drop it instead of shifting the
            # rest of the row one column right.
            if not text and c > start:
                continue
            row_cells.append((text, rs, cs))
            for dr in range(rs):
                for dc in range(cs):
                    occupied[(r + dr, c + dc)] = True
            if text:
                cells_out.append({"text": text, "row_span": rs, "col_span": cs,
                                  "row": r, "col": c})
            c += cs
        if row_cells:
            grid.append(row_cells)
            r += 1

    parts = ["<table>"]
    for row_cells in grid:
        parts.append("<tr>")
        for text, rs, cs in row_cells:
            attrs = ""
            if rs > 1:
                attrs += f' rowspan="{rs}"'
            if cs > 1:
                attrs += f' colspan="{cs}"'
            parts.append(f"<td{attrs}>{htmllib.escape(text)}</td>")
        parts.append("</tr>")
    parts.append("</table>")
    return "".join(parts), cells_out


def markdown_tables_to_html(text: str):
    """Fallback: GOT sometimes returns pipe-style markdown tables (no spans)."""
    tables, cells_out = [], []
    block: list[str] = []

    def flush():
        rows = [b for b in block
                if not re.fullmatch(r"\|?[\s|:-]+\|?", b.strip())]
        if len(rows) < 2:
            return
        parts = ["<table>"]
        for ri, line in enumerate(rows):
            cols = [c.strip() for c in line.strip().strip("|").split("|")]
            parts.append("<tr>")
            for ci, col in enumerate(cols):
                parts.append(f"<td>{htmllib.escape(col)}</td>")
                if col:
                    cells_out.append({"text": col, "row_span": 1, "col_span": 1,
                                      "row": ri, "col": ci})
            parts.append("</tr>")
        parts.append("</table>")
        tables.append("".join(parts))

    for line in text.splitlines():
        if line.strip().startswith("|"):
            block.append(line)
        else:
            if block:
                flush()
            block = []
    if block:
        flush()
    return tables, cells_out


def parse(raw: str):
    """raw model string -> (tables_html, cells, mode)."""
    blocks = re.findall(
        r"\\begin\{(?:tabular|longtable|array)\}(?:\[[^\]]*\])?\s*\{[^}]*\}"
        r"(.*?)\\end\{(?:tabular|longtable|array)\}",
        raw, flags=re.S)
    if blocks:
        tables, cells = [], []
        for b in blocks:
            h, cs = latex_tabular_to_html(b)
            tables.append(h)
            cells.extend(cs)
        return tables, cells, "latex-tabular"
    tables, cells = markdown_tables_to_html(raw)
    if tables:
        return tables, cells, "markdown-pipe"
    return [], [], "none"


# -------------------------------------------------------------------- inference

def pick_device():
    if torch.backends.mps.is_available():
        return "mps", torch.float16
    return "cpu", torch.float32


def main(paths):
    device, dtype = pick_device()
    t0 = time.perf_counter()
    processor = AutoProcessor.from_pretrained(MODEL_ID, use_fast=True)
    model = AutoModelForImageTextToText.from_pretrained(MODEL_ID, dtype=dtype)
    model = model.to(device).eval()
    load_s = time.perf_counter() - t0
    print(f"[gotocr] loaded on {device}/{dtype} in {load_s:.1f}s", flush=True)

    for p in paths:
        path = pathlib.Path(p).resolve()
        stem = path.stem
        t = time.perf_counter()
        inputs = processor(str(path), return_tensors="pt", format=True).to(device)
        with torch.inference_mode():
            gen = model.generate(
                **inputs,
                do_sample=False,
                tokenizer=processor.tokenizer,
                stop_strings="<|im_end|>",
                max_new_tokens=MAX_NEW_TOKENS,
            )
        raw = processor.decode(gen[0, inputs["input_ids"].shape[1]:],
                               skip_special_tokens=True)
        elapsed = time.perf_counter() - t

        tables, cells, mode = parse(raw)
        texts = [ln.strip() for ln in raw.splitlines() if ln.strip()]

        payload = {
            "engine": "gotocr",
            "model": MODEL_ID,
            "device": f"{device}/{str(dtype).split('.')[-1]}",
            "mode": f"format=True ({mode})",
            "image": str(path),
            "elapsed_seconds": round(elapsed, 2),
            "model_load_seconds": round(load_s, 2),
            "n_generated_tokens": int(gen.shape[1] - inputs["input_ids"].shape[1]),
            "hit_token_cap": bool(gen.shape[1] - inputs["input_ids"].shape[1]
                                  >= MAX_NEW_TOKENS),
            "tables_html": tables,
            "cells": cells,
            "texts": texts,
            "raw_format": raw,
        }
        dest = OUT / f"{stem}.gotocr.json"
        dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
        spans = sum(1 for c in cells if c["row_span"] > 1 or c["col_span"] > 1)
        print(f"[gotocr] {stem}: {elapsed:.1f}s  tables={len(tables)} "
              f"cells={len(cells)} spans={spans} mode={mode} -> {dest}", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
