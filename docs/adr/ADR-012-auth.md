# ADR-012: Auth
- Status: Accepted
- Date: 2026-11-20 · Deciders: lead agent, Ohm
- Spec links: `docs/spec/06-architecture.md` §2 (ADR-012)

## Context
Avoids password flows and agent-touched email senders.

## Decision
Auth: Supabase Auth; Google + Apple native ID-token sign-in; email OTP only after Ohm configures a sender; guest mode is local-only; TOTP MFA for staff roles.

## Evidence
Spike S-5 (`docs/spec/06-architecture.md` §17) records its evidence here before acceptance.

## Consequences
To be completed when the decision is exercised (first ticket that depends on it).

## Fallback / exit plan
See the spec row; a change requires a new ADR approved by the lead and Ohm.
