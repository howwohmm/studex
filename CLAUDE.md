# Studex — monorepo

Studex is the personal academic operating system for Indian university students (iOS, Android,
Web). It starts with what students check every day — today's classes, one-tap Attended/Bunked,
the live % and bunk budget under the 75% rule — and grows into the whole academic layer.
Beachhead: RUAS / Bangalore universities. Delight is a requirement, not polish: the previous
native build died because it was hard to get onto phones, looked ugly, and didn't feel good.

@AGENTS.md

## Source of truth

`docs/spec/` is the law (`docs/spec/README.md` §2 sets the authority order). Read
`docs/spec/09-agent-contract.md` before any task. `docs/spec/reference/v1/` holds the shipped iOS
v1.0 briefs; only the parts the spec adopts govern.

## ISOLATION MODE — hard rules

1. **No credentials from anywhere else.** Never read shell profiles (~/.zshrc etc.), ~/.config,
   other projects' .env files, or Keychain. The only key sources are `.env.local` files in this
   repo, which **Ohm edits himself** — agents never read or write them.
2. **Stay inside this repository.** Never touch other projects or services, and never touch any
   email-sending service (Autosend, Resend, any sender API) — a standing hard rule. Ohm's personal
   never-touch list lives in `CLAUDE.local.md` (not committed) and applies in full.
3. **No Claude/Anthropic API in the product.** Extraction and AI use the providers chosen in
   `docs/spec/06-architecture.md` (ADR-008).
4. Read-only references outside the repo (Ohm's machine only):
   `~/projects/studex/studex-hub/studex-vault/` and `~/projects/studex/studex-hub/studex-ios/`.

## Hard-won lessons (do not relearn these)

- **Checkpoint-commit after every green state.** Session limits killed two agent waves
  mid-flight; committed work survived, in-flight context didn't.
- **Screenshot-QA every screen, light + dark.** Two of four ship-blocking bugs were invisible to a
  green test suite.
- **Never weaken a quality gate; make it print its work.** The RUAS fixture gate (keyF1 ≥ 0.90)
  turned "extraction is flaky" into a fixable list of column indexes.
- Keep derived data and build artifacts out of git; never build inside iCloud-synced or
  space-containing paths.

## Build and run (from the repo root)

- `pnpm install`
- `pnpm dev` (Expo dev server) · `pnpm web` · `pnpm ios` · `pnpm android`
- `pnpm typecheck` · `pnpm test`
- Device builds run from `apps/app`: `npx expo run:ios --device` (free team P3UFH9W5C6, 7-day
  resign) · `eas build --profile development --platform android`
- EAS project @ohmdreams/studex (ID e697e644-7daf-44b5-b8a8-1350e7de0900); bundle/package
  `quest.ohm.studex` (permanent after the first Play upload)
