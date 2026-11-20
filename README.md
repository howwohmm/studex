# Studex

Timetable, attendance and study workspace for Indian college students — a personal academic
operating system that starts with the 75% rule. Bengaluru · India · launching 2026 ·
[studex.ohm.quest](https://studex.ohm.quest) · [@ohmdreams](https://twitter.com/ohmdreams)

## Status

Phase 0 (foundation) of the [delivery plan](docs/spec/08-delivery-plan.md). Built by Devin agents
working from the [master spec](docs/spec/README.md); every change is reviewed against it.

## Repository

| Path              | What                                                                             |
| ----------------- | -------------------------------------------------------------------------------- |
| `apps/app`        | Expo Router universal app (iOS, Android, Web)                                    |
| `packages/`       | Shared TypeScript packages (`packages/core`: attendance engine and domain logic) |
| `extraction-lab/` | Timetable extraction benchmarks and findings (fixtures are private)              |
| `docs/spec/`      | Product and engineering specification — the source of truth                      |
| `docs/status/`    | Repository audit, progress logs, open questions                                  |
| `docs/pitch/`     | Pitch deck, business documents, grant applications                               |

## Run it

Requires Node 24.22.3 (v22.13+ required by Expo SDK 57) and pnpm 12.20.0.

```sh
pnpm install
pnpm web        # or: pnpm dev · pnpm ios · pnpm android
pnpm typecheck
pnpm test
```
