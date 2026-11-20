# Studex — Master Specification

**Version 1.0 · 20 November 2026 · Owner: Ohm (founder) · Status: Draft — pending Ohm's review (gate G0a)**

The source of truth for building **Studex**, the personal academic operating system for
university students in India, on **iOS, Android and Web**. It is written so that a team of
autonomous Devin agents can plan, build, test and integrate the whole product without
re-asking what Studex is supposed to become.

> If you are an agent: read `09-agent-contract.md` before you touch anything. Then follow the
> reading order below. Do not start implementation from this README alone.

---

## 1. Reading order

| File | What it contains | Must read |
|---|---|---|
| `README.md` | Orientation, authority order, human pre-flight | Everyone |
| `09-agent-contract.md` | How agents work: rules, DoD, PRs, escalation, forbidden actions | Every agent, first |
| `01-product.md` | Vision, principles, personas, IA, voice & copy rules, metrics, non-goals | Everyone |
| `02-requirements-core.md` | M01–M08: accounts, onboarding, Today, workspace, timetable, attendance, tasks, library | Module owners |
| `03-requirements-intelligence.md` | M09–M14, M17: tutor, exams/PYQ, planner, quizzes/flashcards, progress, GPA, extraction | Module owners |
| `04-requirements-platform.md` | M15, M16, M18–M23: notifications, search, communities, settings/privacy, admin, billing, platform integrations, offline/sync | Module owners |
| `05-attendance-math.md` | The attendance engine: exact formulas, rounding, copy bands, golden tests | Anyone touching attendance, Today, widgets, notifications |
| `06-architecture.md` | Stack decisions (ADRs), monorepo, data model, API, sync, pipelines, AI, security, environments | Everyone writing code |
| `07-nfr-compliance.md` | Performance, reliability, security, privacy (DPDP), accessibility, store compliance, analytics | Everyone; mandatory for data/AI/platform |
| `08-delivery-plan.md` | Phases, gates, workstreams, file ownership, ticket backlog | Lead; specialists for their tickets |
| `10-test-strategy.md` | Test pyramid, golden suites, eval sets, gates, QA checklists | Everyone |
| `11-appendix.md` | Glossary (Indian academic terms), open questions, risks, decision log | Everyone, as needed |
| `00-kickoff-prompts.md` | Paste-ready prompts for the lead agent and each specialist | Ohm |
| `reference/` | Shipped iOS v1.0 specs, locked copy, psychology brief, engine code + tests | As cited |
| `dist/STUDEX-MASTER-SPEC.md` | Generated single-file copy of README + 00–11 for attaching to a session or pasting. Never edit it; edit the sources and regenerate (command in its first line) | Optional |

## 2. Authority order (when two sources disagree)

1. **`CLAUDE.md` → "ISOLATION MODE — hard rules"** (credential handling, never-touch list, no
   Anthropic API in the product). These always win.
2. **Written decisions by Ohm** dated after this spec (`docs/adr/` with status Accepted, or the
   Decision Log in `11-appendix.md` §4).
3. **This spec.** Within the spec, a specific requirement beats a general one; a requirement
   (`FR-…`/`NFR-…`) beats explanatory prose.
4. **Accepted ADRs** in `docs/adr/`.
5. **`reference/`** — only the parts this spec explicitly adopts (see `reference/README.md`).
6. **Agent judgment** — allowed only where the spec is silent, must follow the principles in
   `01-product.md` §5, and must be recorded as an *Assumption* in the PR (see `09` §4).

## 3. Conventions

- **Requirement IDs:** `FR-<MODULE>-<NNN>` (functional), `NFR-<AREA>-<NNN>` (non-functional),
  `ADR-<NNN>` (decisions), `S-<N>` (spikes), `G0…G6` (phase gates), tickets `P<phase>-<NN>`.
- **Keywords:** MUST / MUST NOT / SHOULD / MAY as in RFC 2119.
- **Priority:** **P0** = required to exit its phase. **P1** = expected in its phase, can slip one
  phase with the lead's written note. **P2** = backlog; build only when scheduled.
- **Phase tag:** every module and FR has a target phase (`Ph1`…`Ph6`, see `08-delivery-plan.md`).
- **Copy:** user-facing strings in this spec are *intent* unless marked **LOCKED**, in which case
  they ship verbatim.
- **Change control:** spec changes happen only through a PR titled `spec: …` approved by Ohm.
  Agents may propose changes; they MUST NOT edit requirements to match their implementation.

## 4. Human pre-flight checklist (Ohm, before kickoff)

These are **human-only** actions. Agents cannot and must not do them.

1. ✅ **Done 2026-11-20 —** venv, compiled adapter and env files ignored; pending work committed.
   Original note: **Fix `.gitignore` before the first push.** `extraction-lab/.venv312/` (~34,000 files, most of
   the lab's 1.1 GB) is not ignored today. Add `.venv*/`, `__pycache__/` and `*.pyc`, then commit
   the pending changes (CLAUDE.md, app.json, eas.json, `extraction-lab/` sources + fixtures +
   `out/`, `docs/`, lockfile).
2. **Create a private GitHub repository**, push `main`, connect it to Devin. Protect `main`
   (PR required, CI green required, no force-push).
3. **Provision accounts and secrets** (never paste keys into a chat; use Devin Secrets, GitHub
   Actions secrets and EAS secrets; local dev uses `.env.local`, edited only by you):
   Supabase project in **ap-south-1 (Mumbai)**, a Google AI (Gemini) key on a **paid tier**
   (free tiers may train on inputs; see `07` §3), Sentry, PostHog, and a container host with a
   Mumbai region for the API and the document worker. The EAS project already exists
   (`@ohmdreams/studex`).
4. **Store accounts:** Apple Developer Program (paid) — required for TestFlight, push
   notifications, Sign in with Apple and widget App Groups. Google Play Console — if it is a new
   personal account, Play requires a closed test with at least 12 testers for 14 days before
   production access; plan the RUAS beta around it.
5. **Answer or accept the defaults** for the open questions in `11-appendix.md` §2.
6. ✅ **Done 2026-11-20 —** `AGENTS.md` now carries the pointer below. Original note: add two lines to `AGENTS.md` so every agent session loads the
   pointer automatically:
   `Product source of truth: docs/spec/README.md.` and
   `Read docs/spec/09-agent-contract.md before starting any task.`
7. **Kick off:** paste the lead prompt from `00-kickoff-prompts.md` into a new Devin session.

## 5. What already exists (2026-11-20)

| Asset | State | Use it for |
|---|---|---|
| Expo app repository (`studex`; local, not yet on GitHub) | Expo SDK 57 template: React Native 0.86.2, React 19.2.3, expo-router 57, Reanimated 4.5.1, React Compiler on, typed routes. EAS project `@ohmdreams/studex` (`e697e644-7daf-44b5-b8a8-1350e7de0900`), bundle/package `quest.ohm.studex` (permanent after first Play upload). Commits so far: initial scaffold, extraction lab, this spec. No backend. | The app shell becomes `apps/app` in Phase 0. |
| Public repository [`howwohmm/studex`](https://github.com/howwohmm/studex) | Pitch documents, grant decks, the published copy of this spec, and [PR #1](https://github.com/howwohmm/studex/pull/1): a React/Vite web workspace prototype opened by a Devin cloud session on 2026-11-20. PR #1 predates this spec and diverges from ADR-002 (one Expo universal app). | Reconcile in P0-01: keep it as a web prototype, port its parser/model tests into `packages/core`, or rebase it onto ADR-002. |
| `extraction-lab/` | Timetable extraction benchmarks: 4 real fixtures with ground truth, strict per-cell scorer `score_slots_strict.py`, written findings. The public copy carries only the written findings; fixtures and raw outputs stay in the app repository. | Extraction design and the CI gate (M17). Read `FINDINGS.md`, `BENCHMARK.md`, `VLM-VERDICT.md`. |
| `docs/spec/reference/v1/` | The shipped native iOS v1.0 spec chain, locked copy, psychology brief, attendance engine and tests, RUAS keyF1 acceptance test. | Adopted parts per `reference/README.md`. |
| Ohm's machine only | `studex-vault` (every prior attempt, decks, waitlist at studex.ohm.quest), `beeper-group-ingest` (WhatsApp group file ingestion prototype). | Not available to cloud agents. Ask Ohm if needed. |

## 6. The one-paragraph brief

Studex earns its daily open with the thing Indian students check most and trust least:
**attendance under the 75% rule**. Snap the timetable once, mark Attended or Bunked in one tap,
and always know your number and your bunk budget. That is the wedge (Phase 1). On that daily
habit, Studex grows into the student's whole academic layer: subjects, syllabus, tasks, exams,
a library of every PDF from every class group, an AI tutor grounded in the student's own
material, a study planner that adapts, and class spaces for sharing (Phases 2–6). Every module
shares one academic context, every machine-made output is confirmable and correctable, and no
number is ever invented.
