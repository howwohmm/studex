# ADR-003: Backend platform
- Status: Accepted
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-003)

## Context
Few moving parts, RLS, Mumbai region, Postgres does DB + vectors + queue + cron. Domain logic stays portable (no proprietary features beyond Auth/Storage/RLS).

## Decision
Backend platform: Supabase (Postgres + pgvector, Auth, Storage, Queues/pgmq, pg_cron), region ap-south-1. Separate projects per environment.

## Evidence
Decided in the master spec on 2026-11-20; no spike required.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
See the spec row; a change requires a new ADR approved by the lead and Ohm.
