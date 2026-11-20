"""Score direct slot extraction (day + period placement), not just text recall.

This is the metric that caught dots.ocr: an engine can top text-F1 while putting
every class on the wrong day. Input files look like:

    out/<stem>.<run>.slots.json
    {"slots": [{"day": "Monday", "periods": ["3","4"], "subject": "ECE2007",
                "room": "LFL03", "faculty": "..."}]}

Scored against out/groundtruth/<stem>.truth.json.

Usage: python score_slots.py <stem> [stem...]
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "out"
TRUTH = OUT / "groundtruth"

DAY_ALIASES = {
    "mon": "monday", "monday": "monday",
    "tue": "tuesday", "tues": "tuesday", "tuesday": "tuesday",
    "wed": "wednesday", "wednesday": "wednesday",
    "thu": "thursday", "thur": "thursday", "thurs": "thursday", "thursday": "thursday",
    "fri": "friday", "friday": "friday",
    "sat": "saturday", "saturday": "saturday",
}


def norm_day(s):
    s = re.sub(r"[^a-z]", "", str(s or "").lower())
    for k in sorted(DAY_ALIASES, key=len, reverse=True):
        if s.startswith(k):
            return DAY_ALIASES[k]
    return s or "?"


def norm_period(p):
    """Reduce a period label to its most identifying token: a bare number, else digits+letters."""
    s = str(p or "").strip().lower()
    m = re.match(r"^\s*(\d+)\s*$", s)
    if m:
        return m.group(1)
    m = re.search(r"\b(\d{1,2})\b", s)
    return m.group(1) if m else re.sub(r"[^a-z0-9]", "", s)[:12]


def key_tokens(text):
    """Subject-code-ish tokens that identify a class."""
    return set(re.findall(r"\b[A-Z]{2,4}\d{3,4}\b", str(text or "")))


def load_truth_slots(stem):
    d = json.loads((TRUTH / f"{stem}.truth.json").read_text())
    t = d.get("truth", d)
    slots = []
    for c in t.get("cells", []):
        if c.get("is_empty"):
            continue
        day = norm_day(c.get("row"))
        if day in ("?", "") or "break" in str(c.get("content", "")).lower():
            continue
        periods = {norm_period(x) for x in (c.get("columns") or [])}
        slots.append({
            "day": day,
            "periods": periods,
            "content": c.get("content", ""),
            "codes": key_tokens(c.get("content", "")),
        })
    return slots


def load_run(path):
    d = json.loads(pathlib.Path(path).read_text())
    slots = []
    for s in d.get("slots") or []:
        periods = s.get("periods") or s.get("period_labels") or []
        if isinstance(periods, str):
            periods = [periods]
        txt = " ".join(str(s.get(k) or "") for k in ("subject", "subject_code", "room", "faculty"))
        slots.append({
            "day": norm_day(s.get("day")),
            "periods": {norm_period(x) for x in periods},
            "content": txt,
            "codes": key_tokens(txt) or {re.sub(r'[^A-Za-z0-9]', '', str(s.get('subject') or ''))[:14].upper()},
        })
    return slots


def score(truth, got):
    used = set()
    day_ok = period_ok = both_ok = found = 0
    errors = []
    for t in truth:
        cand = None
        for i, g in enumerate(got):
            if i in used:
                continue
            if t["codes"] and g["codes"] and (t["codes"] & g["codes"]):
                cand = i
                break
        if cand is None:  # fall back to loose text overlap
            for i, g in enumerate(got):
                if i in used:
                    continue
                a = set(re.findall(r"[a-z0-9]+", t["content"].lower()))
                b = set(re.findall(r"[a-z0-9]+", g["content"].lower()))
                if a and b and len(a & b) / len(a | b) >= 0.5:
                    cand = i
                    break
        if cand is None:
            errors.append(f"NOT FOUND: {t['content'][:44]}")
            continue
        used.add(cand)
        found += 1
        g = got[cand]
        d_ok = g["day"] == t["day"]
        p_ok = bool(t["periods"] & g["periods"]) if t["periods"] else True
        day_ok += d_ok
        period_ok += p_ok
        both_ok += (d_ok and p_ok)
        if not d_ok:
            errors.append(f"WRONG DAY: {t['content'][:30]} truth={t['day']} got={g['day']}")
        elif not p_ok:
            errors.append(f"WRONG PERIOD: {t['content'][:30]} truth={sorted(t['periods'])} got={sorted(g['periods'])}")
    n = len(truth)
    return {
        "truth_slots": n, "got_slots": len(got), "found": found,
        "day_correct": day_ok, "period_correct": period_ok, "fully_correct": both_ok,
        "recall": found / n if n else 0,
        "day_accuracy": day_ok / n if n else 0,
        "placement_accuracy": both_ok / n if n else 0,
        "hallucinated": len(got) - len(used),
        "errors": errors[:12],
    }


if __name__ == "__main__":
    stems = sys.argv[1:] or [p.name.replace(".truth.json", "") for p in TRUTH.glob("*.truth.json")]
    rows = []
    for stem in stems:
        truth = load_truth_slots(stem)
        runs = sorted(OUT.glob(f"{stem}.*.slots.json"))
        if not runs:
            continue
        print(f"\n{'='*86}\n{stem}  ({len(truth)} truth class slots)\n{'='*86}")
        print(f"{'run':<28}{'recall':>8}{'day-acc':>9}{'placed':>8}{'halluc':>8}")
        for r in runs:
            name = r.name.replace(f"{stem}.", "").replace(".slots.json", "")
            s = score(truth, load_run(r))
            print(f"{name:<28}{s['recall']*100:7.1f}%{s['day_accuracy']*100:8.1f}%"
                  f"{s['placement_accuracy']*100:7.1f}%{s['hallucinated']:8d}")
            rows.append({"stem": stem, "run": name, **{k: v for k, v in s.items() if k != "errors"}})
    if rows:
        (OUT / "slot_scores.json").write_text(json.dumps(rows, indent=2))
        print(f"\nwrote {OUT/'slot_scores.json'}")
