"""Run Sarvam DocAI over timetable fixtures. Saves raw outputs to out/.

Usage: ./.venv/bin/python run_sarvam.py digitise|extract <fixture.jpg> [...]
Key comes from .env.local (SARVAM_API_KEY) — never hardcoded.
"""
import json
import os
import pathlib
import sys
import time

from sarvamai import SarvamAI

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

# load .env.local without extra deps
env_path = ROOT.parent / ".env.local"
for line in env_path.read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

client = SarvamAI(api_subscription_key=os.environ["SARVAM_API_KEY"])

TERMINAL = {"completed", "partially_completed", "failed", "rejected"}

# What a timetable actually is, in the vocabulary the app needs.
TIMETABLE_SCHEMA = {
    "type": "object",
    "properties": {
        "program": {"type": "string", "description": "Program/class/section code shown on the timetable, e.g. 2BES07"},
        "institution": {"type": "string", "description": "University or college name"},
        "period_headers": {
            "type": "array",
            "description": "Every column header of the grid in left-to-right order, including breaks. Give the period label and its clock time range exactly as printed.",
            "items": {
                "type": "object",
                "description": "One column header of the timetable grid",
                "properties": {
                    "label": {"type": "string", "description": "Period label e.g. '1', '2', 'Break', 'Lunch Break'"},
                    "start_time": {"type": "string", "description": "Start time as printed, e.g. '9:00 AM'"},
                    "end_time": {"type": "string", "description": "End time as printed, e.g. '10:00 AM'"},
                },
            },
        },
        "slots": {
            "type": "array",
            "description": "One entry per class cell in the grid. Skip break columns. If a cell spans multiple period columns, report the full span in period_labels.",
            "items": {
                "type": "object",
                "description": "One class cell from the timetable grid",
                "properties": {
                    "day": {"type": "string", "description": "Day of week e.g. Monday"},
                    "period_labels": {"type": "array", "description": "Every period column this cell occupies, in order. A cell spanning periods 3 and 4 gives ['3','4'].", "items": {"type": "string", "description": "A single period column label"}},
                    "subject_code": {"type": "string", "description": "Subject/course code e.g. ECE2007, or the subject name if no code"},
                    "room": {"type": "string", "description": "Room or venue code if shown"},
                    "faculty": {"type": "string", "description": "Faculty/teacher name if shown"},
                    "batch": {"type": "string", "description": "Batch/division/group tag if the cell is batch-specific, e.g. A, B, Batch 1"},
                },
            },
        },
    },
}


def poll(job_id: str, label: str):
    t0 = time.time()
    while True:
        st = client.doc_ai.get_status(job_id=job_id)
        s = str(st.status).lower()
        if s in TERMINAL:
            print(f"  [{label}] {s} in {time.time()-t0:.1f}s", flush=True)
            return st
        time.sleep(3)


def save(name: str, obj):
    p = OUT / name
    if isinstance(obj, (dict, list)):
        p.write_text(json.dumps(obj, indent=2, ensure_ascii=False))
    else:
        p.write_text(str(obj))
    print(f"  wrote {p.relative_to(ROOT)} ({p.stat().st_size} bytes)")


def fetch_results(job_id: str, stem: str, mode: str):
    res = client.doc_ai.get_results(job_id=job_id)
    raw = res.model_dump() if hasattr(res, "model_dump") else {"result": getattr(res, "result", str(res))}
    save(f"{stem}.{mode}.result.json", raw)
    # Results often arrive as presigned download URLs — pull the actual content too.
    urls = []

    def walk(o):
        if isinstance(o, str) and o.startswith("http"):
            urls.append(o)
        elif isinstance(o, dict):
            [walk(v) for v in o.values()]
        elif isinstance(o, list):
            [walk(v) for v in o]

    walk(raw)
    if urls:
        import urllib.request
        for i, u in enumerate(dict.fromkeys(urls)):
            try:
                with urllib.request.urlopen(u, timeout=60) as r:
                    body = r.read().decode("utf-8", "replace")
                ext = "html" if "<" in body[:200] else ("json" if body.lstrip()[:1] in "[{" else "txt")
                save(f"{stem}.{mode}.download{i}.{ext}", body)
            except Exception as e:
                print(f"  download {i} failed: {e}")


def run(mode: str, path: pathlib.Path):
    stem = path.stem
    print(f"\n=== {mode.upper()} :: {path.name}")
    with open(path, "rb") as f:
        payload = [(path.name, f, "image/jpeg")]
        if mode == "digitise":
            job = client.doc_ai.digitise(
                file=payload, language="en-IN", output_format="html", content_type="printed"
            )
        else:
            job = client.doc_ai.extract(
                file=payload,
                schema=json.dumps(TIMETABLE_SCHEMA),
                language="en-IN",
                output_format="json",
            )
    print(f"  job {job.job_id}")
    st = poll(job.job_id, stem)
    save(f"{stem}.{mode}.status.json", st.model_dump() if hasattr(st, "model_dump") else str(st))
    if str(st.status).lower() in {"completed", "partially_completed"}:
        fetch_results(job.job_id, stem, mode)
    else:
        print(f"  !! terminal state {st.status} — no results")


if __name__ == "__main__":
    mode = sys.argv[1]
    for a in sys.argv[2:]:
        run(mode, pathlib.Path(a))
