# ADR-010: Search
- Status: Accepted
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-010)

## Context
No extra search infrastructure until scale demands it.

## Decision
Search: Postgres FTS + pg_trgm + pgvector (HNSW), hybrid via reciprocal rank fusion.

## Evidence
Decided in the master spec on 2026-11-20; no spike required.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
See the spec row; a change requires a new ADR approved by the lead and Ohm.
