# WS-PLATFORM — progress log

Mission: monorepo tooling, CI/CD, EAS, environments, observability, security scanning.

Format (`docs/spec/09-agent-contract.md` §10): append one row per checkpoint. A new session
resumes from the last row and the last green commit, never from memory.

| Date | Ticket | State | Branch | Last green commit | Next step |
|---|---|---|---|---|---|
| 2026-11-20 | P0-03 (#6) | in progress | ws/platform/P0-03-monorepo (local working copy studex-monorepo) | — | Expo app into apps/app, pnpm + Turborepo, pitch docs to docs/pitch, scrubbed agent rules |
| 2026-11-20 | P0-03 (#6) | done | — | ace5d22 (#59) | — |
| 2026-11-20 | P0-04 (#7), P0-05 (#8) | done | — | f0c8d12 (#64) | CI: lint, format, typecheck, unit, web build, licenses (ADR-020 + caniuse-lite exception, D-016), gitleaks, OSV; Ohm to protect main + install Renovate |
