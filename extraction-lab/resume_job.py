"""Resume polling a DocAI job that lost its connection. Usage: resume_job.py <job_id> <stem> <mode>"""
import sys
import time

import run_sarvam as R

jid, stem, mode = sys.argv[1], sys.argv[2], sys.argv[3]
for attempt in range(40):
    try:
        st = R.client.doc_ai.get_status(job_id=jid)
        s = str(st.status).lower()
        print("status:", s, flush=True)
        if s in R.TERMINAL:
            R.save(f"{stem}.{mode}.status.json", st.model_dump())
            if s in {"completed", "partially_completed"}:
                R.fetch_results(jid, stem, mode)
            break
    except Exception as e:
        print("retry", attempt, type(e).__name__, flush=True)
    time.sleep(4)
