# ADR-008: AI gateway (packages/ai, server-only) with a provider regi
- Status: Accepted
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-008)

## Context
Cheap, multimodal, strong; CLAUDE.md forbids Anthropic. Optional fallback provider configured by Ohm.

## Decision
AI gateway (`packages/ai`, server-only) with a provider registry; default provider Google Gemini on a paid, no-training tier (Flash-Lite class for extraction/cheap tasks, Flash class for tutoring, Gemini embeddings). Model IDs in config. No Anthropic.

## Evidence
Decided in the master spec on 2026-11-20; no spike required.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
provider configured by Ohm.
