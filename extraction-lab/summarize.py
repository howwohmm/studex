"""Flatten Sarvam extract results into a readable grid for human/agent verification."""
import json
import pathlib
import sys

OUT = pathlib.Path(__file__).parent / "out"


def find_payload(obj):
    """Extract results nest the model output at varying depths; find the dict with 'slots'."""
    hits = []

    def walk(o):
        if isinstance(o, dict):
            if "slots" in o or "period_headers" in o:
                hits.append(o)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
        elif isinstance(o, str) and o.lstrip()[:1] in "[{":
            try:
                walk(json.loads(o))
            except Exception:
                pass

    walk(obj)
    return max(hits, key=lambda d: len(json.dumps(d))) if hits else None


for stem in sys.argv[1:]:
    p = OUT / f"{stem}.extract.result.json"
    data = json.loads(p.read_text())
    pay = data.get("result") or find_payload(data)
    print(f"\n{'='*70}\n{stem}\n{'='*70}")
    if not pay:
        print("NO SLOTS FOUND. raw keys:", list(data.keys()))
        print(json.dumps(data)[:1500])
        continue
    print("program:", pay.get("program"), "| institution:", pay.get("institution"))
    hdrs = pay.get("period_headers") or []
    print(f"\nPERIOD HEADERS ({len(hdrs)}):")
    for h in hdrs:
        print(f"  {str(h.get('label')):<14} {h.get('start_time')} -> {h.get('end_time')}")
    slots = pay.get("slots") or []
    print(f"\nSLOTS ({len(slots)}):")
    byday = {}
    for s in slots:
        byday.setdefault(str(s.get("day")), []).append(s)
    for day, ss in byday.items():
        print(f"\n  --- {day} ({len(ss)})")
        for s in ss:
            per = ",".join(s.get("period_labels") or [])
            bits = [f"P[{per}]", str(s.get("subject_code"))]
            if s.get("batch"):
                bits.append(f"batch={s['batch']}")
            if s.get("room"):
                bits.append(f"room={s['room']}")
            if s.get("faculty"):
                bits.append(f"fac={s['faculty']}")
            print("     " + " | ".join(bits))
