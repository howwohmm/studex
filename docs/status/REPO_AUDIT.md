# P0-01 — Repository audit (2026-11-20)

Ticket: P0-01 (`docs/spec/08-delivery-plan.md` §4). Author: lead agent. Decisions referenced here
were made by Ohm on 2026-11-20 and are recorded as D-011…D-014 in `docs/spec/11-appendix.md` §4.

## 1. Inventory

### 1.1 This repository (`howwohmm/studex`, public, canonical from 2026-11-20)
| Path | Content | Verdict |
|---|---|---|
| `README.md`, `01_problem.md` … `08_one_pager.md`, `STUDEX_CONTEXT.md`, `grants/`, `studex-pitch-deck.pdf`, `studex_pitch.html`, `udyam-certificate.pdf` | Pitch and business documents (Mar–Jul 2026) | Keep; move under `docs/pitch/` in P0-03 so the root can hold the monorepo |
| `docs/spec/` | Master specification (merged in #2) | Keep — source of truth |
| `extraction-lab/*.md` | Written extraction findings (benchmark, Sarvam evaluation, VLM verdict) | Keep; scripts arrive in P0-03, fixtures stay private (§3) |
| Branch `devin/1795180889-studex-web` — PR #1 (draft) | React 19 + Vite web workspace, 25 files, +3,744 lines, opened by a Devin cloud session | Reference prototype — do not merge (§2) |

### 1.2 Local app repository (Ohm's machine; migrated here by P0-03)
| Path | Content | Verdict |
|---|---|---|
| Root | Expo SDK 57 template: React Native 0.86.2, React 19.2.3, expo-router 57, Reanimated 4.5.1, React Compiler, typed routes; EAS project `@ohmdreams/studex` (`e697e644-7daf-44b5-b8a8-1350e7de0900`); bundle/package `quest.ohm.studex`; npm lockfile | Move to `apps/app`; keep every ID unchanged; npm → pnpm |
| `extraction-lab/` scripts, adapters, scorers | Python benchmark harness (`score_slots_strict.py` is the reference scorer) | Move here |
| `extraction-lab/fixtures/`, `extraction-lab/out/` | Real timetable photos, ground truth, raw provider outputs | Keep private (§3) |
| `CLAUDE.md`, `.claude/settings.json` | Agent rules; contain a personal never-touch list | Publish scrubbed versions; personal list stays local (§3) |
| `packages/core/` | Attendance engine (P0-06, in progress) | Lands by its own PR |

## 2. PR #1 assessment (reference prototype)
- **Right:** attendance core uses an exact integer basis-point boundary, the safe-now and
  consecutive-recovery closed forms, and shows no percentage at zero held — it avoids four of the
  six v1.0 defects (`05` §9). Local-only storage and a review-before-save import match the
  confirm principle.
- **Gaps against the spec:** "Present/Absent" instead of the locked "Attended/Bunked"; no
  Cancelled state; "At risk" verdict labels (banned by the behavioral rules); no units or baseline
  coverage date; budgets not capped by remaining classes; JavaScript rather than TypeScript;
  a second UI stack that contradicts ADR-002.
- **CI failure:** `ubuntu-latest` now resolves to Ubuntu 26.04, where Playwright 1.55.1 cannot
  install Chromium. Our workflows must pin `runs-on: ubuntu-24.04` (or a Playwright release that
  supports 26.04) — input for P0-05.
- **Reuse:** port the timetable-parser test cases into the Phase 1 extraction work (P1-05) and
  keep UI ideas as references for P1 screens. Close PR #1 once that port lands.

## 3. Risks and required handling
| Risk | Handling |
|---|---|
| Personal never-touch list in `CLAUDE.md` / `.claude/settings.json` would become public | Public `CLAUDE.md` keeps every rule with the list generalized ("never touch anything outside this repository"); the named list moves to gitignored `CLAUDE.local.md` and `.claude/settings.local.json` on Ohm's machine (D-013) |
| Real timetable fixtures (other institutions, faculty names) | Never committed here; the extraction gate reads them from a private source in CI (decide in P1-06; D-014) |
| A Devin cloud session may keep spending credits on PR #1 | Ohm pauses or stops that session |
| Local Node is v26.10.0 | CI pins the Node LTS line supported by Expo SDK 57 (verify in P0-04); `.nvmrc` at the root |
| Bot reviewers (Devin Review, capy-ai, CodeRabbit, cubic) comment on every PR | Treat their findings like any review: judge each, fix the real ones (capy-ai found six real spec bugs in #2) |

## 4. Spec-versus-repository gaps (Phase 0)
Not yet built: monorepo and tooling (P0-03/04), CI (P0-05), copy package (P0-07), design system
and app shell (P0-08/09), database and API (P0-10/11), the six spikes (P0-12…17), E2E harness
(P0-18), observability and pipelines (P0-19/20), `docs/adr/` files and `docs/status/WS-*.md` logs
(P0-02). In progress: the attendance engine (P0-06).

## 5. Order of work from here
P0-06 engine PR → P0-03 migration (Expo app into `apps/app`, pnpm + Turborepo, pitch docs to
`docs/pitch/`, scrubbed agent rules) → P0-04/05 tooling and CI → P0-07/08/09 copy, design system,
shell → P0-10/11 database and API → spikes S-1…S-6 → G0.
