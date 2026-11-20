# ADR-020: Dependency policy
- Status: Accepted
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-020)

## Context
Supply-chain safety.

## Decision
Dependency policy: versions published ≥ 7 days ago; license allowlist
MIT / Apache-2.0 / BSD-2-Clause / BSD-3-Clause / ISC / MPL-2.0 / 0BSD /
CC0-1.0 / Unlicense / BlueOak-1.0.0 / Python-2.0 (LibreOffice as a separate
process); no AGPL/GPL linked code; Renovate with stability days; lockfile
committed. Amended 2026-11-20: the allowlist was made exhaustive and
CC-BY-4.0 was removed because the "data only" carve-out cannot be enforced
mechanically; `scripts/check-licenses.mjs` implements this exact list.

### Exceptions
- `caniuse-lite` (CC-BY-4.0) — browser-support data pulled in by
  Babel/Browserslist; data, not linked code, and the package carries its own
  attribution. approved 2026-11-20 by the lead and by Ohm under his delegated authority ("do everything yourself"); recorded as D-016. Any new exception requires an
  ADR change.

## Evidence
Decided in the master spec on 2026-11-20; no spike required.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
See the spec row; a change requires a new ADR approved by the lead and Ohm.
