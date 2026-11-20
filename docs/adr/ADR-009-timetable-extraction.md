# ADR-009: Timetable extraction
- Status: Proposed — pending S-4
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-009)

## Context
VLM-VERDICT: pixels beat OCR text; FINDINGS: silent failures must be caught by validation.

## Decision
Timetable extraction: VLM on pixels, single-shot, strict JSON schema + deterministic validation/rejection + confirm UI; second-opinion engine for flagged results.

## Evidence
Spike S-4 (`docs/spec/06-architecture.md` §17) records its evidence here before acceptance.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
See the spec row; a change requires a new ADR approved by the lead and Ohm.
