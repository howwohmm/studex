# ADR-002: One universal client
- Status: Accepted
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-002)

## Context
Existing scaffold; one UI codebase; web via react-native-web. Platform files (`*.web.tsx`, `*.native.tsx`) where needed.

## Decision
One universal client: Expo SDK 57 + Expo Router for iOS, Android and Web; TypeScript strict; New Architecture; React Compiler on.

## Evidence
Decided in the master spec on 2026-11-20; no spike required.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
See the spec row; a change requires a new ADR approved by the lead and Ohm.
