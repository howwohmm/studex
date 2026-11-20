# ADR-005: Local-first sync
- Status: Proposed — pending S-1
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-005)

## Context
Proven Postgres↔SQLite sync with RN + web SDKs. Fallback: the custom protocol in §6.4.

## Decision
Local-first sync: PowerSync (SQLite on device; per-user sync buckets; uploads → `POST /v1/sync/upload`).

## Evidence
Spike S-1 (`docs/spec/06-architecture.md` §17) records its evidence here before acceptance.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
the custom protocol in §6.4.
