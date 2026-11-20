# ADR-007: Document worker
- Status: Accepted
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-007)

## Context
Best open document stack; license-clean.

## Decision
Document worker: Python 3.12 (`apps/worker-docs`): Docling (MIT) for layout/tables/OCR, LibreOffice headless for Office → PDF renditions, pypdfium2 for rendering. No AGPL (no PyMuPDF).

## Evidence
Decided in the master spec on 2026-11-20; no spike required.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
See the spec row; a change requires a new ADR approved by the lead and Ohm.
