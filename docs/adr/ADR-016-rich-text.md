# ADR-016: Rich text
- Status: Proposed — pending S-6
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-016)

## Context
Same document model on all platforms. Fallback: Markdown editor with live preview.

## Decision
Rich text: TenTap (native) + Tiptap (web), stored as ProseMirror JSON + plain-text projection; KaTeX for math.

## Evidence
Spike S-6 (`docs/spec/06-architecture.md` §17) records its evidence here before acceptance.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
Markdown editor with live preview.
