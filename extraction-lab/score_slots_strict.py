"""STRICT per-cell placement scorer.

Why this exists (do not delete score_slots.py, it is the record of what was shipped):

score_slots.py is CORRECT on presidency-2bes07 and BROKEN on the other two fixtures.
  1. arch-batches-thu-fri: truth rows are spreadsheet row numbers "22".."31", so
     norm_day() returns "?" for every cell and all 84 truth cells are discarded.
     Every arm scored 0/0/0 with 29 "hallucinations". Meaningless.
  2. vit-slot-grid: truth is not filtered to day rows, so the 13 THEORY HOURS cells,
     13 LAB HOURS cells and 5 ROW_LABEL cells are counted as class slots (91 instead
     of 60). Worse, truth column labels are MOR1..MOR6/AFT1..AFT6 while the arms emit
     "1".."12", so norm_period() can never intersect and placement is 0.0% by
     construction, for every arm, regardless of what it extracted.
  3. Even on presidency, the period test is `bool(truth_periods & got_periods)` -- ANY
     overlap passes. A 2-period merged cell reported as a single period scores as
     correct. That is what let C-text-only score 100% placement while getting 3 of 14
     span widths wrong.

The CONTROL-perfect run only exists for presidency, so its passing certifies the
scorer on that fixture ONLY. It says nothing about the other two.

This scorer expands every slot to one tuple per (row, period) CELL, which makes the
merge-vs-split convention disagreement flagged by the extraction agents disappear:
a merged slot with periods ["3","4"] and two separate single-period cells both expand
to the same two cells. Placement then requires the exact cell, not an overlap.

Usage: python score_slots_strict.py
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "out"
TRUTH = OUT / "groundtruth"


def sig(s):
    """Normalized content signature used to match a truth cell to an extracted slot."""
    return re.sub(r"[^a-z0-9]", "", str(s or "").lower())


def norm_day(s):
    s = re.sub(r"[^a-z]", "", str(s or "").lower())
    for k, v in (("mon", "monday"), ("tue", "tuesday"), ("wed", "wednesday"),
                 ("thu", "thursday"), ("fri", "friday"), ("sat", "saturday")):
        if s.startswith(k):
            return v
    return s or "?"


# ---------------------------------------------------------------- presidency

PERIOD_NUM = re.compile(r"^\s*(\d+)\b")
SUBJ_CODE = re.compile(r"\b[A-Z]{2,4}\d{3,4}\b")


def truth_presidency(d):
    cells = set()
    for c in d["cells"]:
        if c.get("is_empty"):
            continue
        codes = SUBJ_CODE.findall(c.get("content", ""))
        if not codes:                      # break / lunch columns carry no subject code
            continue
        for col in c["columns"]:
            m = PERIOD_NUM.match(col)
            if m:
                cells.add((norm_day(c["row"]), m.group(1), sig(codes[0])))
    return cells


def run_presidency(slots):
    cells = set()
    for s in slots:
        codes = SUBJ_CODE.findall(" ".join(str(s.get(k) or "") for k in ("subject", "subject_code")))
        if not codes:
            continue
        for p in (s.get("periods") or []):
            m = PERIOD_NUM.match(str(p))
            if m:
                cells.add((norm_day(s.get("day")), m.group(1), sig(codes[0])))
    return cells


# ---------------------------------------------------------- arch (batch rows)
# Truth rows are sheet rows 22-26 = Thursday batches A-E, 27-31 = Friday batches A-E.
# The arms emit NO batch field at all -- five different batch rows all say "Thursday".
# Batch identity is recovered from slot ORDER: a new batch row begins whenever a slot
# starts again at period 1. This is a reconstruction, and it is stated as such in the
# verdict; it is the most favourable reading available to the arms.

ARCH_ROW = {str(n): ("thursday", "ABCDE"[n - 22]) for n in range(22, 27)}
ARCH_ROW.update({str(n): ("friday", "ABCDE"[n - 27]) for n in range(27, 32)})


def truth_arch(d):
    cells = set()
    for c in d["cells"]:
        if c.get("is_empty") or c["row"] not in ARCH_ROW:
            continue
        day, batch = ARCH_ROW[c["row"]]
        subject = c["content"].split("\n")[0].strip()
        for col in c["columns"]:
            m = re.match(r"^P(\d)$", col)
            if m:
                cells.add((f"{day}-{batch}", m.group(1), sig(subject)))
    return cells


def run_arch(slots):
    cells = set()
    per_day = {}
    for s in slots:
        day = norm_day(s.get("day"))
        ps = [p for p in (s.get("periods") or [])]
        if not ps:
            continue
        # new batch row each time the period sequence restarts at 1
        if str(ps[0]).strip() == "1":
            per_day[day] = per_day.get(day, -1) + 1
        idx = per_day.get(day, 0)
        batch = "ABCDE"[idx] if 0 <= idx < 5 else f"?{idx}"
        for p in ps:
            cells.add((f"{day}-{batch}", str(p).strip(), sig(s.get("subject"))))
    return cells


# --------------------------------------------------------------------- vit
# Truth columns MOR1..MOR6 -> periods 1..6, AFT1..AFT6 -> periods 7..12 (the LUNCH
# column is unnumbered, which is exactly the convention all three arms used).

VIT_DAYS = {"MON", "TUE", "WED", "THU", "FRI"}


def truth_vit(d):
    cells = set()
    for c in d["cells"]:
        if c.get("is_empty") or c["row"] not in VIT_DAYS:
            continue
        for col in c["columns"]:
            m = re.match(r"^(MOR|AFT)(\d)$", col)
            if not m:
                continue                    # ROW_LABEL / LUNCH are not class slots
            p = int(m.group(2)) + (6 if m.group(1) == "AFT" else 0)
            cells.add((norm_day(c["row"]), str(p), sig(c["content"])))
    return cells


def run_vit(slots):
    cells = set()
    for s in slots:
        for p in (s.get("periods") or []):
            cells.add((norm_day(s.get("day")), str(p).strip(), sig(s.get("subject"))))
    return cells


FIXTURES = {
    "presidency-2bes07": (truth_presidency, run_presidency),
    "arch-batches-thu-fri": (truth_arch, run_arch),
    "vit-slot-grid": (truth_vit, run_vit),
}


def score(truth, got):
    """Cell-level recall / row accuracy / exact placement."""
    t_by_sig, g_by_sig = {}, {}
    for row, per, s in truth:
        t_by_sig.setdefault(s, set()).add((row, per))
    for row, per, s in got:
        g_by_sig.setdefault(s, set()).add((row, per))

    placed = sum(1 for cell in truth if cell in got)
    rows_ok = 0
    found = 0
    for row, per, s in truth:
        locs = g_by_sig.get(s)
        if not locs:
            continue
        found += 1
        if any(r == row for r, _ in locs):
            rows_ok += 1
    n = len(truth) or 1
    return {
        "truth_cells": len(truth), "got_cells": len(got),
        "recall": found / n, "row_accuracy": rows_ok / n, "placement": placed / n,
        "placed_n": placed,
        "spurious": len(got - truth),
    }


if __name__ == "__main__":
    rows = []
    for stem, (tf, rf) in FIXTURES.items():
        d = json.loads((TRUTH / f"{stem}.truth.json").read_text())
        truth = tf(d)
        print(f"\n{'='*88}\n{stem}   ({len(truth)} truth CELLS, per-period expansion)\n{'='*88}")
        print(f"{'run':<26}{'recall':>9}{'row-acc':>9}{'PLACED':>9}{'cells':>8}{'spurious':>10}")
        for p in sorted(OUT.glob(f"{stem}.*.slots.json")):
            name = p.name.replace(f"{stem}.", "").replace(".slots.json", "")
            s = score(truth, rf(json.loads(p.read_text()).get("slots") or []))
            print(f"{name:<26}{s['recall']*100:8.1f}%{s['row_accuracy']*100:8.1f}%"
                  f"{s['placement']*100:8.1f}%{s['got_cells']:8d}{s['spurious']:10d}")
            rows.append({"stem": stem, "run": name, **s})
    (OUT / "slot_scores_strict.json").write_text(json.dumps(rows, indent=2))
    print(f"\nwrote {OUT/'slot_scores_strict.json'}")

    ctl = [r for r in rows if r["run"] == "CONTROL-perfect"]
    for c in ctl:
        ok = c["recall"] == c["row_accuracy"] == c["placement"] == 1.0
        print(f"\nCONTROL CHECK ({c['stem']}): {'PASS' if ok else 'FAIL'} "
              f"- recall {c['recall']*100:.1f} row {c['row_accuracy']*100:.1f} placed {c['placement']*100:.1f}")
        if not ok:
            sys.exit(1)
