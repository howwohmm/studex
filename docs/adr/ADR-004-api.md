# ADR-004: API
- Status: Accepted
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-004)

## Context
Typed, testable single write path; runs anywhere.

## Decision
API: TypeScript Hono service (`apps/api`) on Node LTS in a container (Mumbai region). zod contracts in `packages/contracts`, OpenAPI generated. All writes with business rules go through it.

## Evidence
Decided in the master spec on 2026-11-20; no spike required.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
See the spec row; a change requires a new ADR approved by the lead and Ohm.
