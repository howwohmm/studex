# 08 — Delivery Plan: Phases, Gates, Workstreams, Backlog

The whole product is in scope. Phases set **dependency order**, not ambition: each phase ships
production quality, and later phases build on the habit and data of earlier ones. No dates are
given; phases end when their gate passes.

---

## 1. Phases and gates

| Phase | Theme | Ships | Gate |
|---|---|---|---|
| **0** | Foundation & audit | Repo audit, monorepo, CI, design-system foundation, schema + RLS skeleton, API skeleton, attendance engine, six spikes → ADRs | **G0a** plan approved by Ohm · **G0** foundation exit |
| **1** | The daily loop (wedge) | Guest mode, onboarding with extraction, Today, marking, subjects, attendance calendar, forecasts, bunk planner, holidays, settings, two daily notifications, Break Mode, semester receipt, PWA, widgets (if S-3 passes) | **G1** closed beta with RUAS students |
| **2** | Accounts, sync & academic workspace | Sign-in + claim, cloud sync, units/topics, notes, tasks, exams, calendar + ICS, extended Today, privacy center + data rights + parental consent, admin v1, entitlements/quotas, push | **G2** public launch v1 |
| **3** | Library & knowledge engine | Uploads, share target, WhatsApp export import, processing worker, viewer + annotations, hybrid search, auto-filing, deletion cascade, syllabus / exam timetable / academic calendar import | **G3** |
| **4** | Intelligence | AI gateway + evals, tutor, quizzes + flashcards, PYQ analyzer + readiness, planner + focus, progress, GPA, AI dashboards + moderation | **G4** |
| **5** | Class spaces & institutions | Spaces, timetable templates, shared resources, announcements, Q&A, moderation + IT Rules, institution portal | **G5** |
| **6** | Monetization, localization & scale | Store billing + web UPI, paywall, Hindi, cost/perf optimization, Google Calendar sync, referrals | **G6** |

Ohm may pull Phase 6 billing forward to launch with Phase 4 (AI cost exposure); see `11` §2.

### Gate criteria (all must hold)

**G0a — plan approval (Ohm).** `docs/status/REPO_AUDIT.md`, the Phase 0–1 ticket backlog in
GitHub Issues, ADR drafts 001–020, and the workstream assignment are reviewed and approved.

**G0 — foundation exit.**
- CI green on `main` with all §14 jobs that apply so far (`06` §14).
- App runs on iOS simulator, Android emulator and web from `apps/app`; 5-tab shell with
  primitives screenshot-QA'd light + dark.
- `packages/core/attendance` passes every `05` §11 test.
- Phase 1–2 migrations + RLS pgTAP suite green; API skeleton deployed to `dev`.
- S-1…S-6 concluded with evidence; ADRs accepted.

**G1 — closed beta.**
- Every Ph1 P0 requirement done (M02; M03/M04/M05/M06/M13/M15/M17/M19/M22/M23 Ph1 parts).
- Golden, property, occurrence and extraction gates green (recorded and live).
- Screenshot QA of every Ph1 screen (light/dark, small Android, large iPhone, web) and the
  accessibility checklist passed; low-end Android budgets met (NFR-PERF-001…004).
- E2E green on Android emulator, iOS simulator and web.
- Ohm has used the build daily for 7 days and signs off (founder dogfood gate).
- Beta: Play closed-testing track with ≥ 12 testers (≥ 14 days, needed anyway for a new personal
  Play account), TestFlight if the Apple account exists, PWA for everyone else.

**G2 — public launch v1.**
- Every Ph2 P0 requirement done; DPDP checklist (`07` §3.2) complete; FR-SET-009 live; legal
  text supplied by Ohm; pen test findings of high/critical severity fixed; store checklists
  (`07` §6) complete; crash-free ≥ 99.5% over 14 days of beta; sync matrix (`10` §8) green.

**G3–G6.** Every P0 requirement of the phase done; the phase's eval gates green (`10` §5–7);
screenshot QA, accessibility and performance re-verified for touched surfaces; feature flags
allow staged rollout (10% → 50% → 100%) and instant kill.

## 2. Release strategy
- **Distribution first:** the previous native build died partly because it was hard to get onto
  phones. Android builds via Play testing tracks and EAS internal APKs; iOS via TestFlight; the
  web PWA is the zero-install path for everyone.
- **Channels:** development builds (agents, Ohm) → `preview` (beta testers) → `production`.
- **OTA:** JS-only fixes via EAS Update; production updates need Ohm's approval.
- **Staged rollouts** for every new server feature through flags; kill switch tested before rollout.

## 3. Workstreams and ownership

Each workstream is one specialist agent (or a sequence of sessions). **Owns** = may write.
Anything outside its ownership goes through the owner (or the lead) by ticket.

| Workstream | Mission | Owns (write) |
|---|---|---|
| **WS-LEAD** | Plan, backlog, ADRs, integration, reviews and merges, status reporting, spec-change proposals | `docs/status/**`, `docs/adr/**`, root `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `CODEOWNERS` |
| **WS-PLATFORM** | Monorepo tooling, CI/CD, EAS, environments, observability, security scanning, performance harness | `.github/**`, `packages/config/**`, `infra/**`, `apps/app/eas.json`, `apps/app/app.config.*` (build-related keys) |
| **WS-CORE** | Pure domain logic with exhaustive tests | `packages/core/**` |
| **WS-DATA** | Schema, RLS, auth, sync, API platform, contracts, admin app | `supabase/**`, `packages/db/**`, `packages/contracts/**` (shared — lead reviews), `apps/api/src/platform/**`, `apps/api/src/modules/{sync,auth,me,flags,entitlements,devices,calendar,support,admin}/**`, `apps/admin/**` |
| **WS-APP** | The client experience: screens, navigation, design system, motion, widgets, notifications scheduling | `apps/app/**` (except build keys), `packages/ui/**`, `packages/copy/**` |
| **WS-EXTRACT** | Extraction pipelines, validation rules, gates | `extraction-lab/**`, `apps/api/src/modules/extraction/**`, `packages/ai/prompts/extraction/**`, `packages/ai/evals/extraction/**`; `packages/core/extraction-validate/**` (with WS-CORE review) |
| **WS-DOCS** | Document worker, storage flows, search | `apps/worker-docs/**`, `apps/api/src/modules/{documents,search}/**` |
| **WS-AI** | AI gateway, tutor, practice, exam intelligence, evals | `packages/ai/**` (except extraction), `apps/api/src/modules/{tutor,practice,exams-ai,planner-ai}/**` |
| **WS-QA** | E2E, screenshot QA, accessibility, performance audits, release checklists, bug filing | `e2e/**`, synthetic fixtures under `fixtures/**`; files bugs, never edits product code to make tests pass |

When WS-APP needs parallel agents, split by route group with explicit ownership:
APP-DAILY (`(today)`, `(onboarding)`, `(subjects)`, settings), APP-WORKSPACE (`(plan)`, notes,
exams), APP-LIBRARY (`(library)`, viewer), APP-AI (`(tutor)`, practice, planner UI).
`packages/ui` changes are serialized through one owner at a time.

**Shared-file protocol.** `packages/contracts`, `supabase/migrations`, `packages/copy` keys and
`packages/ui` primitives change in their own small PR first (lead-reviewed); consumers follow in
separate PRs. Migrations are numbered by timestamp; two agents never edit the same migration.

## 4. Phase 0 backlog (detailed)

`P0-03` is the first PR to land (it moves files). Until it merges, other workstreams work only in
new top-level directories (`packages/core`, `supabase`, `extraction-lab` evaluation code) and
rebase afterwards.

| ID | Title | WS | Depends | Done when |
|---|---|---|---|---|
| P0-01 | Repository audit | LEAD | — | `docs/status/REPO_AUDIT.md`: inventory, dependency versions, what is kept/replaced, risks (verify the 2026-11-20 `.gitignore` fix for `.venv312` and the compiled `visiontt` adapter), spec-vs-repo gaps, and a recommendation for PR #1 in `howwohmm/studex` (React/Vite prototype) vs ADR-002 |
| P0-02 | Backlog + workstream plan | LEAD | P0-01 | Phase 0–1 tickets in GitHub Issues with labels `phase:*`, `ws:*`, `module:*`, `priority:*`, each citing FR IDs and acceptance criteria; ADR stubs 001–020; **G0a** request to Ohm |
| P0-03 | Monorepo conversion | PLATFORM | G0a | pnpm + Turborepo; Expo app moved to `apps/app`; `expo start` works for iOS, Android, web; EAS project ID, owner, bundle/package IDs unchanged; `pnpm-workspace.yaml` with `minimumReleaseAge` 7 days |
| P0-04 | Tooling baseline | PLATFORM | P0-03 | TS strict across packages, ESLint (Expo config + import boundaries forbidding `@studex/ai` in the app), Prettier, Renovate with stability days, gitleaks, osv-scanner, license checker, PR template with DoD + security checklist |
| P0-05 | CI pipeline v1 | PLATFORM | P0-04 | `ci.yml` running lint, typecheck, unit tests, web build, scanners; caching; required on `main` |
| P0-06 | Attendance engine | CORE | — | `packages/core/attendance` implementing `05` §10 with every §11 test passing |
| P0-07 | Copy package | APP | P0-03 | `packages/copy` with the locked strings ported verbatim from `reference/v1/briefs/copy.md`, retired strings removed, ICU plurals, typed keys |
| P0-08 | Design-system foundation | APP | P0-03 | Tokens (color light/dark, type scale, spacing, radii, elevation, motion durations/easings, haptics map, breakpoints) and primitives (Text, Button, IconButton, Card, ListRow, Chip, Badge, Gauge, Sheet, Toast, EmptyState, Skeleton, SegmentedControl); a dev-only gallery route used for screenshots |
| P0-09 | App shell | APP | P0-08 | 5 tabs + avatar header + responsive sidebar/rail; route skeletons; deep-link scheme; error boundary; loading/empty/error components; QA launcher (`?qaScreen=` on web, launch argument on native) to open any screen with fixture data |
| P0-10 | Database foundation | DATA | — | Supabase local project; migrations for Ph1–Ph2 tables (`06` §4); RLS + pgTAP suite; synthetic seed |
| P0-11 | API skeleton | DATA | P0-10 | Hono app: JWKS auth, install tokens, problem+json, request IDs, rate limiting, health, OpenAPI, RLS-scoped DB access (`06` §4.3); deployed to `dev` |
| P0-12 | Spike S-1 sync | DATA | P0-10 | `06` §17 criteria with evidence; ADR-005 accepted or fallback chosen |
| P0-13 | Spike S-2 PDF viewer | APP | P0-09 | `06` §17; ADR-017 |
| P0-14 | Spike S-3 widgets | APP | P0-09 | `06` §17; ADR-018 |
| P0-15 | Spike S-4 extraction model | EXTRACT | — | Port the RUAS keyF1 scorer; run single-shot candidates against all four fixtures × 3 runs with a prototype validation layer; numbers in ADR-009 |
| P0-16 | Spike S-5 auth | DATA | P0-11 | `06` §17; ADR-012 evidence |
| P0-17 | Spike S-6 rich text | APP | P0-09 | `06` §17; ADR-016 |
| P0-18 | E2E + screenshot harness | QA | P0-09 | Maestro flows run on an Android emulator and iOS simulator, Playwright on web; light/dark screenshots uploaded as CI artifacts |
| P0-19 | Observability baseline | PLATFORM | P0-11 | Sentry in app/API (DSN from env), structured logging, release tagging |
| P0-20 | Build & deploy pipelines | PLATFORM | P0-05 | EAS profiles and channels documented; Android preview APK on demand; web preview deploy; API container deploy to `dev` |

## 5. Phase 1 backlog (detailed)

| ID | Title | WS | Depends | FRs |
|---|---|---|---|---|
| P1-01 | Device DB schema v1 + migrations + repositories (guest/local) | DATA, APP | S-1 | FR-SYNC-001, -007 |
| P1-02 | Occurrence engine (weekly, day-order, parity, versions, exceptions, holidays, breaks, extra classes, upcoming set) | CORE | — | FR-CAL-001…006, -014; `05` §3 |
| P1-03 | Standings, Today header logic, forecasts, simulator | CORE | P0-06, P1-02 | FR-ATT-004…008; `05` §6 |
| P1-04 | Extraction endpoint (timetable), install tokens, rate limits, recorded test mode | EXTRACT, DATA | P0-11, S-4 | FR-EXT-002, -008, -009 |
| P1-05 | Validation/rejection layer + unit tests per rule | EXTRACT | P0-15 | FR-EXT-003, -004 |
| P1-06 | Extraction gate in CI (recorded) + nightly live | EXTRACT, PLATFORM | P1-05 | FR-EXT-006 |
| P1-07 | Onboarding: Welcome + Capture (scanner, photos, PDF, web) | APP | P0-09 | FR-ONB-001, -002 |
| P1-08 | Onboarding: Extracting (labor illusion, cancel, timeout, failure) | APP | P1-04 | FR-ONB-003 |
| P1-09 | Onboarding: Check your week (flags first, edits, electives, dates, mode) | APP | P1-08 | FR-ONB-004 |
| P1-10 | Onboarding: Batch, Catch-up, commit, Reveal count-up | APP | P1-03, P1-09 | FR-ONB-005…007, -010 |
| P1-11 | Manual timetable path | APP | P1-09 | FR-ONB-008 |
| P1-12 | Today: header, overall card, class list, chips, states | APP | P1-03 | FR-DASH-001…003, -014, -015 |
| P1-13 | Marking interactions: undo, sweep, unmarked badge, recovered toast, contact-hour 3-way, gestures, haptics | APP | P1-12 | FR-DASH-004…006, FR-ATT-003, -015 |
| P1-14 | Timetable edits ("Just today" / "Every week") + re-scan diff | APP | P1-02 | FR-CAL-004, FR-ONB-011 |
| P1-15 | Subjects list + Subject detail (ledger with audit, standing, forecast) | APP | P1-03 | FR-ATT-004…006, -009 |
| P1-16 | Bunk planner | APP | P1-03 | FR-ATT-007 |
| P1-17 | Attendance calendar + marking streak + backfill | APP | P1-13 | FR-ATT-010 |
| P1-18 | Settings (semester, holidays, breaks, policies, notifications, appearance, export, erase) | APP | P1-01 | FR-SET-001, -004, -005; FR-ATT-001 |
| P1-19 | Holiday datasets (national 2026–2028 + Karnataka) from official notifications, with sources | DATA | — | FR-CAL-005 (Ohm verifies before release) |
| P1-20 | Local notifications (first class, end-of-day), pre-permission, channels, silence rules | APP | P1-02 | FR-NTF-001…004, -010…013 |
| P1-21 | Break Mode, New Semester, semester receipt image | APP | P1-15 | FR-PRG-006, -007; FR-ACA-010 |
| P1-22 | Attendance CSV import/export | CORE, APP | P1-01 | FR-ATT-012 |
| P1-23 | Design system complete for Ph1 + motion + dark mode | APP | P0-08 | `01` §10 |
| P1-24 | Ph1 copy complete + "New copy" list for Ohm | APP | P0-07 | `01` §11 |
| P1-25 | Widgets iOS + Android (if S-3 passed) | APP | P1-03, S-3 | FR-PLT-001, -002 |
| P1-26 | PWA + web layouts for Ph1 screens | APP | P1-12 | FR-PLT-006, -007 |
| P1-27 | Analytics consent + Ph1 events | APP, DATA | P0-19 | `07` §7 |
| P1-28 | In-app feedback (guest-capable) → ticket table | DATA, APP | P0-11 | FR-ADM-004 (minimal) |
| P1-29 | E2E flows: onboarding (recorded extraction), marking, undo, offline, kill/restore | QA | P1-13 | `10` §9 |
| P1-30 | Screenshot QA + accessibility pass for every Ph1 screen | QA | P1-23 | `10` §10 |
| P1-31 | Low-end Android performance pass | QA, APP | P1-12 | NFR-PERF-001…004 |
| P1-32 | Beta distribution (EAS builds, Play closed track docs, TestFlight if available, web deploy) | PLATFORM | G1 prep | `08` §2 |
| P1-33 | Beta runbook, release notes, known issues | LEAD | — | — |

## 6. Phase 2–6 epics (decomposed into tickets by the lead at each phase start)

| Epic | Scope (FR references) |
|---|---|
| E2.1 Accounts | M01 FR-AUTH-002…010 incl. claim |
| E2.2 Cloud sync | M23 FR-SYNC-002…008; sync matrix |
| E2.3 Workspace | M04 FR-ACA-004…006, -008 |
| E2.4 Tasks | M07 |
| E2.5 Exams (records) | M10 FR-EXM-001…003, -009 |
| E2.6 Calendar | M05 FR-CAL-007…011 |
| E2.7 Today extended | M03 FR-DASH-007, -008, -011…013 |
| E2.8 Privacy & rights | M19 FR-SET-002…004, -006…011; `07` §3 |
| E2.9 Admin v1 | M20 FR-ADM-001…004, -006, -009, -011 |
| E2.10 Entitlements | M21 FR-BIL-001, -002 |
| E2.11 Push + inbox | M15 FR-NTF-014, -015 |
| E2.12 Shortcuts | M22 FR-PLT-004, -008 |
| E2.13 Web parity | All Ph1–Ph2 surfaces on web/desktop layouts |
| E2.14 Launch readiness | Store checklists, pen test, runbooks, legal surfaces |
| E3.1–E3.10 Library | M08 all; M16; FR-ACA-007, -009; FR-CAL-013; FR-EXM-004; FR-EXT-010, -011; FR-PLT-003; FR-ADM-008; FR-SYNC-009 |
| E4.1–E4.9 Intelligence | AI gateway + evals (`06` §8, `10` §7); M09; M12; M10 FR-EXM-005…008, -010; M11; M13 FR-PRG-001…005; M14; FR-ADM-005, -007; FR-ATT-014 (P2) |
| E5.1–E5.6 Spaces | M18; FR-ONB-012; FR-ACA-011; FR-ADM-010 |
| E6.1–E6.7 Scale | M21 FR-BIL-003…006; Hindi (`07` §5); FR-CAL-012; cost/perf optimization |
