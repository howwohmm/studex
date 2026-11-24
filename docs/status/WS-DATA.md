# WS-DATA — progress log

Mission: schema, RLS, auth, sync, API platform, contracts, admin app.

Format (`docs/spec/09-agent-contract.md` §10): append one row per checkpoint. A new session
resumes from the last row and the last green commit, never from memory.

| Date | Ticket | State | Branch | Last green commit | Next step |
|---|---|---|---|---|---|
| 2026-11-20 | P0-10 (#13) | done | — | 12aac41 (#65) | 41 tables, RLS everywhere, 211 pgTAP tests, CI database job |
| 2026-11-21 | P0-11 (#14) | in progress | ws/data/P0-11-api-skeleton | — | Hono API, contracts, idempotency, rate limits, Dockerfile, CI api job |
