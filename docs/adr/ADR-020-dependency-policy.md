# ADR-020: Dependency policy
- Status: Accepted
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-020)

## Context
Supply-chain safety.

## Decision
Dependency policy: versions published ≥ 7 days ago; license allowlist MIT / Apache-2.0 / BSD / ISC / MPL-2.0 (LibreOffice as a separate process); no AGPL/GPL linked code; Renovate with stability days; lockfile committed.

## Evidence
Decided in the master spec on 2026-11-20; no spike required.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
See the spec row; a change requires a new ADR approved by the lead and Ohm.
