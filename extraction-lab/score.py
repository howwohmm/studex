"""Adapter-agnostic timetable extraction scorer.

Every adapter is normalised to the same intermediate representation:
    cell = {text, row_span, col_span}
then scored against the verified ground truth in out/groundtruth/.

Metrics (the two that decide whether a timetable is safe to trust):
  RECALL     - fraction of real cells the adapter found        (misses = missing classes)
  PRECISION  - fraction of adapter cells that are real         (misses = FABRICATION)
  F1         - harmonic mean; this is the gate number (>= 0.90)
  SPAN       - fraction of merged cells whose span survived    (labs vs lectures)

Matching is by token-set Jaccard so it is robust to cell-internal formatting
(" | " vs newline vs space) but NOT to invented or dropped content.

Usage: python score.py <stem> [stem...]
"""
import html as htmllib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "out"
TRUTH = OUT / "groundtruth"
MATCH_THRESHOLD = 0.5  # Jaccard over token sets

STOP = {"br", "td", "tr", "nbsp", "amp"}


def tokens(text: str):
    """Normalised token set for a cell: lowercase alphanumerics, punctuation stripped."""
    text = htmllib.unescape(text or "")
    text = re.sub(r"<[^>]+>", " ", text)
    raw = re.findall(r"[A-Za-z0-9]+", text.lower())
    return {t for t in raw if t not in STOP}


# ---------------------------------------------------------------- adapters


def load_truth(stem):
    d = json.loads((TRUTH / f"{stem}.truth.json").read_text())
    t = d.get("truth", d)
    cells = []
    for c in t.get("cells", []):
        if c.get("is_empty"):
            continue
        cells.append({
            "text": c.get("content", ""),
            "col_span": len(c.get("columns") or [1]),
            "row_span": 1,
            "merged": bool(c.get("is_merged")),
            "row": c.get("row", ""),
        })
    return cells


def load_vision(stem):
    p = OUT / f"{stem}.vision.json"
    if not p.exists():
        return None
    d = json.loads(p.read_text())
    cells = []
    for t in d.get("tables", []):
        for c in t.get("cells", []):
            if not (c.get("text") or "").strip():
                continue
            cells.append({"text": c["text"], "col_span": c.get("colSpan", 1),
                          "row_span": c.get("rowSpan", 1),
                          "merged": c.get("colSpan", 1) > 1 or c.get("rowSpan", 1) > 1})
    return cells


def cells_from_html(html_text):
    cells = []
    for m in re.finditer(r"<t[dh]([^>]*)>(.*?)</t[dh]>", html_text, re.S | re.I):
        attrs, body = m.group(1), m.group(2)
        body = re.sub(r"<br\s*/?>", " | ", body, flags=re.I)
        text = re.sub(r"<[^>]+>", " ", body)
        text = htmllib.unescape(text).strip()
        if not text:
            continue
        cs = re.search(r'colspan\s*=\s*"?(\d+)', attrs, re.I)
        rs = re.search(r'rowspan\s*=\s*"?(\d+)', attrs, re.I)
        cs = int(cs.group(1)) if cs else 1
        rs = int(rs.group(1)) if rs else 1
        cells.append({"text": text, "col_span": cs, "row_span": rs,
                      "merged": cs > 1 or rs > 1})
    return cells


def load_sarvam_digitise(stem):
    p = OUT / f"{stem}.clean.json"
    if not p.exists():
        return None
    d = json.loads(p.read_text())
    html_text = " ".join(b.get("text", "") for b in d.get("digitise_blocks", []))
    return cells_from_html(html_text)


def load_sarvam_extract(stem):
    p = OUT / f"{stem}.clean.json"
    if not p.exists():
        return None
    res = (json.loads(p.read_text()) or {}).get("extract_result") or {}
    cells = []
    for h in res.get("period_headers") or []:
        txt = " ".join(str(h.get(k) or "") for k in ("label", "start_time", "end_time"))
        if txt.strip():
            cells.append({"text": txt, "col_span": 1, "row_span": 1, "merged": False})
    for s in res.get("slots") or []:
        txt = " ".join(str(s.get(k) or "") for k in ("room", "subject_code", "faculty", "batch"))
        if txt.strip():
            n = len(s.get("period_labels") or [1])
            cells.append({"text": txt, "col_span": n, "row_span": 1, "merged": n > 1})
    return cells


def load_paddle(stem):
    p = OUT / f"{stem}.paddle.json"
    if not p.exists():
        return None
    d = json.loads(p.read_text())
    cells = []
    for h in d.get("tables_html", []):
        cells.extend(cells_from_html(h))
    return cells


def load_generic(stem, adapter):
    """Any adapter can drop out/<stem>.<adapter>.json with either:
         {"tables_html": ["<table>...</table>", ...]}          (preferred - keeps spans)
       or {"cells": [{"text": ..., "row_span": 1, "col_span": 1}, ...]}
       or {"texts": ["...", ...]}                              (flat OCR, no structure)
    """
    p = OUT / f"{stem}.{adapter}.json"
    if not p.exists():
        return None
    d = json.loads(p.read_text())
    cells = []
    for h in d.get("tables_html") or []:
        cells.extend(cells_from_html(h))
    for c in d.get("cells") or []:
        txt = (c.get("text") or "").strip()
        if not txt:
            continue
        cs, rs = int(c.get("col_span", 1) or 1), int(c.get("row_span", 1) or 1)
        cells.append({"text": txt, "col_span": cs, "row_span": rs,
                      "merged": cs > 1 or rs > 1})
    if not cells:
        for t in d.get("texts") or []:
            if str(t).strip():
                cells.append({"text": str(t), "col_span": 1, "row_span": 1, "merged": False})
    return cells or None


BUILTIN = {
    "apple-vision": load_vision,
    "sarvam-digitise": load_sarvam_digitise,
    "sarvam-extract": load_sarvam_extract,
    "paddle-ppstructure": load_paddle,
}

RESERVED = {"digitise", "extract", "clean", "vision", "paddle", "truth", "status", "result"}


def discover():
    """Find every adapter that has written output, builtin or generic."""
    found = dict(BUILTIN)
    for p in OUT.glob("*.json"):
        parts = p.stem.split(".")
        if len(parts) < 2:
            continue
        name = parts[-1]
        if name in RESERVED or name in found:
            continue
        found[name] = (lambda n: (lambda stem: load_generic(stem, n)))(name)
    return found


ADAPTERS = discover()


# ---------------------------------------------------------------- scoring


def score(truth, got):
    tt = [(c, tokens(c["text"])) for c in truth]
    gt = [(c, tokens(c["text"])) for c in got]
    used = set()
    matched = []
    for i, (tc, ttok) in enumerate(tt):
        best, best_j = None, 0.0
        for j, (gc, gtok) in enumerate(gt):
            if j in used or not (ttok or gtok):
                continue
            inter = len(ttok & gtok)
            if not inter:
                continue
            jac = inter / len(ttok | gtok)
            if jac > best_j:
                best, best_j = j, jac
        if best is not None and best_j >= MATCH_THRESHOLD:
            used.add(best)
            matched.append((i, best, best_j))

    recall = len(matched) / len(tt) if tt else 0.0
    precision = len(matched) / len(gt) if gt else 0.0
    f1 = 2 * recall * precision / (recall + precision) if (recall + precision) else 0.0

    merged_truth = [i for i, (c, _) in enumerate(tt) if c["merged"]]
    span_ok = 0
    for i, j, _ in matched:
        if tt[i][0]["merged"]:
            if gt[j][0]["col_span"] == tt[i][0]["col_span"] or (
                gt[j][0]["merged"] and gt[j][0]["col_span"] > 1):
                span_ok += 1
    span_acc = span_ok / len(merged_truth) if merged_truth else None

    fabricated = [gt[j][0]["text"] for j in range(len(gt)) if j not in used]
    missing = [tt[i][0]["text"] for i in range(len(tt)) if i not in {m[0] for m in matched}]
    return {
        "truth_cells": len(tt), "got_cells": len(gt), "matched": len(matched),
        "recall": recall, "precision": precision, "f1": f1,
        "merged_in_truth": len(merged_truth), "span_accuracy": span_acc,
        "unmatched_output": fabricated, "missed_truth": missing,
    }


if __name__ == "__main__":
    stems = sys.argv[1:] or [p.stem.replace(".truth", "") for p in TRUTH.glob("*.truth.json")]
    table = []
    for stem in stems:
        truth = load_truth(stem)
        print(f"\n{'='*78}\n{stem}  ({len(truth)} non-empty truth cells)\n{'='*78}")
        print(f"{'adapter':<22} {'F1':>6} {'recall':>7} {'prec':>7} {'span':>7} "
              f"{'found':>6} {'missed':>7} {'unmatched':>10}")
        for name, loader in ADAPTERS.items():
            got = loader(stem)
            if got is None:
                print(f"{name:<22} {'—  not run —':>40}")
                continue
            s = score(truth, got)
            sa = "n/a" if s["span_accuracy"] is None else f"{s['span_accuracy']*100:.0f}%"
            print(f"{name:<22} {s['f1']*100:5.1f}% {s['recall']*100:6.1f}% "
                  f"{s['precision']*100:6.1f}% {sa:>7} {s['matched']:6d} "
                  f"{len(s['missed_truth']):7d} {len(s['unmatched_output']):10d}")
            table.append({"stem": stem, "adapter": name, **{k: v for k, v in s.items()
                          if k not in ("unmatched_output", "missed_truth")},
                          "n_unmatched": len(s["unmatched_output"]),
                          "n_missed": len(s["missed_truth"])})
    (OUT / "scores.json").write_text(json.dumps(table, indent=2))
    print(f"\nwrote {OUT/'scores.json'}")
