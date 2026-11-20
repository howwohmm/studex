# ADR-017: PDF viewing
- Status: Proposed — pending S-2
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-017)

## Context
Annotation parity across platforms. Fallback: native PDF view for reading + web-only annotations in Ph3.

## Decision
PDF viewing: pdf.js everywhere (direct on web; in a WebView on native) with scripting disabled; Office files viewed as server-made PDF renditions.

## Evidence
Spike S-2 (`docs/spec/06-architecture.md` §17) records its evidence here before acceptance.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
native PDF view for reading + web-only annotations in Ph3.
