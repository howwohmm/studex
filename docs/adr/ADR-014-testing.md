# ADR-014: Testing
- Status: Accepted
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-014)

## Context
See `10`.

## Decision
Testing: Vitest (TS packages, API), jest-expo + React Native Testing Library (components), fast-check (properties), Maestro (mobile E2E + screenshots), Playwright (web E2E + axe), pgTAP via `supabase test db` (RLS), pytest (worker).

## Evidence
Decided in the master spec on 2026-11-20; no spike required.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
See the spec row; a change requires a new ADR approved by the lead and Ohm.
