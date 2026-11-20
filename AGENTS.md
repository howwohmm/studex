# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Product spec

- Product source of truth: docs/spec/README.md.
- Read docs/spec/09-agent-contract.md before starting any task.

# Repository layout

- `apps/app` — Expo Router universal app (iOS, Android, Web). Run commands from the repo root with pnpm.
- `packages/*` — shared TypeScript packages (`packages/core` = pure domain logic, no runtime dependencies).
- `extraction-lab/` — timetable extraction benchmarks; fixtures are private (ask Ohm).
- `docs/spec/` — the spec · `docs/status/` — audit, progress logs · `docs/pitch/` — pitch and business documents.
