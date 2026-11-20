# ADR-001: Monorepo in the existing studex repo
- Status: Accepted
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-001)

## Context
One repo for agents; shared types. pnpm `minimumReleaseAge` = 7 days (supply-chain policy).

## Decision
Monorepo in the existing `studex` repo: pnpm workspaces + Turborepo; Expo app moves to `apps/app`.

## Evidence
Decided in the master spec on 2026-11-20; no spike required.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
See the spec row; a change requires a new ADR approved by the lead and Ohm.
