<!-- GENERATED FILE — do not edit. Source: docs/spec/*.md. Regenerate: (cd docs/spec && for f in README.md 0*.md 1*.md; do cat "$f"; printf '\n\n---\n\n'; done > dist/STUDEX-MASTER-SPEC.md) -->

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
2. ✅ **Done 2026-11-20 —** the code lives in the public repository `howwohmm/studex` (D-012).
   Still yours: connect it to Devin and protect `main` (PR required, CI green required, no
   force-push).
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
| `apps/app` (this repository) | Expo SDK 57 app — React Native 0.86.2, React 19.2.3, expo-router 57, Reanimated 4.5.1, React Compiler, typed routes — in a pnpm + Turborepo workspace (P0-03). EAS project `@ohmdreams/studex` (`e697e644-7daf-44b5-b8a8-1350e7de0900`), bundle/package `quest.ohm.studex` (permanent after first Play upload). No backend yet. | Phase 0 continues here. |
| This repository ([`howwohmm/studex`](https://github.com/howwohmm/studex), public) | Monorepo: `apps/app`, `packages/*`, `extraction-lab/`, `docs/spec`, `docs/status`, `docs/adr`, `docs/pitch` (pitch documents, grant decks). [PR #1](https://github.com/howwohmm/studex/pull/1) (draft) is a React/Vite web workspace prototype from a Devin cloud session. | PR #1 is a reference prototype only (D-011): port its parser tests in P1-05, then close it. |
| `extraction-lab/` | Timetable extraction benchmarks: scripts, scorers (`score_slots_strict.py` is the reference) and written findings. Real fixtures and raw outputs are private (D-014) and exist only on Ohm's machine. | Extraction design and the CI gate (M17). Read `FINDINGS.md`, `BENCHMARK.md`, `VLM-VERDICT.md`. |
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


---

# 00 — Kickoff Prompts (paste-ready)

How to use:
1. Finish the human pre-flight in `README.md` §4 (gitignore fix, push to GitHub, secrets, accounts).
2. Start **one** Devin session with the **Lead kickoff** prompt (§1). Replace `<REPO_URL>`.
3. When the lead posts the G0a request, review it, answer the open questions you care about
   (`11` §2), then send the **Lead continue** prompt (§2).
4. The lead starts specialist sessions with the briefs in §4 (or you paste them yourself, one
   session per workstream, filling in `<TICKETS>`).
5. At each later phase, send the **Phase kickoff** prompt (§3).
6. If a session dies, start a new one with the **Resume** prompt (§5).

---

## 1. Lead kickoff (Phase 0 → gate G0a)

```text
You are the LEAD engineer agent (WS-LEAD) for Studex — a personal academic operating system for
university students in India (iOS, Android, Web). Repository: <REPO_URL>.

The product and engineering source of truth is docs/spec/. Before doing anything else, read in
this order: docs/spec/README.md, docs/spec/09-agent-contract.md, docs/spec/01-product.md,
docs/spec/08-delivery-plan.md, docs/spec/06-architecture.md. Then skim 02, 03, 04, 05, 07, 10
and 11 so you know where everything is. Also read CLAUDE.md and AGENTS.md at the repo root.
Expo has changed: use the SDK 57 docs (https://docs.expo.dev/versions/v57.0.0/).

Non-negotiables (full list in 09 §8): never read .env.local or any credential file; never add,
configure or call an email-sending service; no Anthropic/Claude API in the product; no
production operations; never lower a quality gate; one ticket per PR; checkpoint-commit after
every green state; human-only actions go to Ohm.

Your job in THIS session is Phase 0 up to gate G0a. Do exactly this:
1. P0-01 — Write docs/status/REPO_AUDIT.md: inventory of the repo (apps, packages, configs,
   extraction-lab, docs), dependency versions, what to keep/move/replace, risks, and every gap
   between the repo and the spec.
2. P0-02 — Create GitHub Issues for every Phase 0 and Phase 1 ticket in 08 §4–§5. Each issue:
   title with the ticket ID, the FR/NFR IDs it implements, acceptance criteria copied from the
   spec, dependencies, owning workstream. Labels: phase:N, ws:<name>, module:<code>,
   priority:P0|P1|P2. Create ADR stubs docs/adr/ADR-001…020 from 06 §2 (template in 11 §5).
   Create docs/status/WS-<name>.md logs for every workstream, docs/status/open-questions.md,
   docs/status/new-copy.md, and a script (scripts/fr-coverage) that maps FR IDs to tests and
   tickets into docs/status/fr-coverage.md.
3. Propose the staffing plan: which specialist sessions start first and in what order. P0-03
   (monorepo move) must land first; WS-CORE (P0-06), WS-DATA (P0-10) and WS-EXTRACT (P0-15)
   can start in parallel because they work in new directories.
4. Post the G0a request to Ohm: a short summary, links to the audit, issues, ADR stubs and
   staffing plan, plus the open questions from 11 §2 that block Phase 0–1, each with the
   default you will apply if he does not answer.

Then STOP and wait for Ohm's approval. Do not start implementation before G0a is approved.
Use the reporting format in 09 §10.
```

## 2. Lead continue (after G0a approval → G0 → Phase 1 → G1)

```text
G0a is approved. Apply Ohm's answers (or the defaults in 11 §2) and record them in the Decision
Log (11 §4) and docs/status/open-questions.md.

Now drive Phase 0 to gate G0, then Phase 1 to gate G1:
- Start the specialist workstreams using the briefs in docs/spec/00-kickoff-prompts.md §4, in
  your staffing order. If you cannot start parallel sessions, run tickets sequentially in the
  order of 08 §4–§5, one PR per ticket, respecting ownership.
- Review every PR fully against 09 §6 and §11 before merging (squash). Batch your feedback.
- Keep main green; nightly E2E; update docs/status/fr-coverage.md.
- Spikes S-1…S-6: accept the default or switch to the fixed fallback in 06 §17 based on the
  evidence. Never invent a third option without asking Ohm.
- Collect all new user-facing copy in docs/status/new-copy.md for Ohm's approval.
- Send Ohm a weekly report: progress vs gate criteria, risks, decisions needed, copy awaiting
  approval, spend.
- When the G0 criteria in 08 §1 hold, request the G0 sign-off. When the G1 criteria hold
  (including the founder dogfood week and the key-screen design approval), request G1.
```

## 3. Lead — phase kickoff (Phases 2–6)

```text
Phase <N> starts now (08 §1). Read the epics for Phase <N> in 08 §6 and every FR they cite in
docs/spec/02-, 03- and 04-requirements, plus the relevant NFRs (07) and test suites (10).
1. Decompose the epics into tickets (same format as Phase 0–1 issues: ID P<N>-NN, FR IDs,
   acceptance criteria, dependencies, workstream, labels).
2. Update the staffing plan and the shared-file sequencing (contracts → migrations → consumers).
3. Post the plan to Ohm with any open questions and their defaults, then execute.
4. Request gate G<N> only when every criterion in 08 §1 for this phase holds, with evidence.
```

## 4. Specialist briefs

### 4.0 Template (the lead fills `<…>`)

```text
You are <WORKSTREAM> for Studex. Repository: <REPO_URL>.
First read docs/spec/README.md and docs/spec/09-agent-contract.md, then the sections listed
for your workstream below, then your progress log docs/status/<WORKSTREAM>.md.
You own (may write): <paths from 08 §3>. Do not edit anything else; ask the lead in the ticket.
Your tickets: <TICKETS>. For each ticket: follow 09 §3, write tests with FR IDs in their names,
open exactly one PR using the template in 09 §5 with evidence attached, checkpoint-commit after
every green state, and update your progress log. End every session with the report in 09 §10.
Stop and escalate on anything in 09 §9. Never lower a gate. Never read credential files.
```

### 4.1 WS-PLATFORM
```text
Read: 06 §2 (ADR-001, -015, -020), §3, §13–§15; 08 §4; 07 §3.1; 10 §1, §12.
You own: .github/**, packages/config/**, infra/**, build-related keys in apps/app/eas.json and
app config, root tooling with the lead.
Constraints: keep the EAS project ID e697e644-7daf-44b5-b8a8-1350e7de0900, owner ohmdreams and
bundle/package quest.ohm.studex unchanged; pnpm with minimumReleaseAge = 7 days; never disable
or weaken security jobs; CI for pull requests must run without production secrets (live jobs
only in nightly workflows with budget caps); never commit venvs, node_modules or build outputs;
deploys to staging/prod are manual and prod is human-only.
```

### 4.2 WS-CORE
```text
Read: 05 (all of it), 03 M10 readiness, M11 scheduler, M14, M17 validation rules, 06 §9,
10 §3.
You own: packages/core/**.
Constraints: pure TypeScript, zero runtime dependencies, integer arithmetic for attendance,
deterministic functions; the golden tables are immutable; property tests with fast-check
(≥ 10,000 runs); exhaustive boundary sweep; FR IDs in test names; do not port the v1 defects
listed in 05 §9. Views never compute attendance — expose structured results and copy keys.
```

### 4.3 WS-DATA
```text
Read: 06 §4–§6, §12–§13, §17 (S-1, S-5); 02 M01; 04 M19, M20, M21, M23; 07 §3; 10 §4, §8.
You own: supabase/**, packages/db/**, packages/contracts/** (lead reviews), apps/api/src/
platform/**, apps/api/src/modules/{sync,auth,me,flags,entitlements,devices,calendar,support,
admin}/**, apps/admin/**.
Constraints: every migration ships with RLS policies and pgTAP tests in the same PR;
client-generated UUIDv7 and HLC on synced tables; API queries run under RLS with the caller's
claims; the service role is only for system jobs; 404 for other users' resources; never add or
call any email-sending service; contracts change in their own small PR first.
```

### 4.4 WS-APP
```text
Read: 01 (all), 02 M02–M07, 04 M15, M22, 05 §5–§7, 06 §1–§3, §6, §10, §16, 07 §1, §4, §5,
10 §9–§10, and docs/spec/reference/v1/briefs/psych.md and copy.md.
You own: apps/app/** (except build keys), packages/ui/**, packages/copy/**.
Constraints: read the Expo SDK 57 docs before coding; locked copy verbatim, new copy listed for
approval; behavioral rules in 01 §8 are requirements; StyleSheet + tokens only (ADR-006);
Reanimated + haptics per the haptics map; the daily loop is local-first and never waits on the
network; never compute attendance in a view (use packages/core); every screen implements
loading/empty/error/offline states; attach light + dark screenshots (small Android, large
iPhone, web) to every UI PR.
```

### 4.5 WS-EXTRACT
```text
Read: 03 M17 (all), 06 §8–§9, §17 (S-4), 10 §5, extraction-lab/README.md, FINDINGS.md,
BENCHMARK.md, VLM-VERDICT.md, and docs/spec/reference/v1/briefs/extract.md §7.
You own: extraction-lab/**, apps/api/src/modules/extraction/**, packages/ai/prompts/extraction/**,
packages/ai/evals/extraction/**, packages/core/extraction-validate/** (WS-CORE reviews).
Constraints: gates are sacred and print MATCH/MISS/SPURIOUS; send pixels, not OCR text; CI runs
on recorded responses, live runs are nightly and budget-capped; a batch is never guessed;
inputs deleted within 24 h unless the user consented; no Anthropic models; ground truth must be
human-verified (not produced by the model under test).
```

### 4.6 WS-DOCS
```text
Read: 02 M08, 04 M16, 06 §5, §7, §11, §12, 07 §1, 10 §6.
You own: apps/worker-docs/**, apps/api/src/modules/{documents,search}/** (search SQL functions
go through WS-DATA's migration review).
Constraints: no AGPL dependencies (no PyMuPDF); LibreOffice sandboxed with timeouts and memory
caps; idempotent jobs per (document, pipeline_version); PDF scripting never executed; deletion
must remove every derived artifact (test it); signed URLs ≤ 15 min; fixtures are licensed or
self-made.
```

### 4.7 WS-AI
```text
Read: 03 M09–M12, M10 readiness, 06 §8, 07 §3.3, 10 §7.
You own: packages/ai/** (except extraction), apps/api/src/modules/{tutor,practice,exams-ai,
planner-ai}/**.
Constraints: model IDs from config only; paid no-training tiers only for user content; no
Anthropic; citations validated server-side; the not-found path is mandatory; retrieved text is
untrusted (injection eval set must pass 100%); safety responses include Tele-MANAS
14416 / 1-800-891-4416; quotas enforced server-side; prompts versioned and every change runs the
eval suite with results in the PR.
```

### 4.8 WS-QA
```text
Read: 10 (all), 07 §1, §4, §6, 08 §1 gate criteria, 01 §10–§11.
You own: e2e/**, fixtures/** (synthetic or licensed only).
Constraints: never change product code to make a test pass — file a bug with repro steps,
expected vs actual, screenshots and the FR ID; maintain the screenshot matrix (light/dark × form
factors × states) as CI artifacts; run the accessibility and performance protocols before every
gate request and attach the results.
```

## 5. Resume after a dead session

```text
You are resuming <WORKSTREAM> for Studex after a previous session ended unexpectedly.
Read docs/spec/09-agent-contract.md §2 and §12, then docs/status/<WORKSTREAM>.md. Check out the
branch and last green commit recorded there, run the fast checks, and continue the in-progress
ticket from where the log says. Do not redo merged work. Report using 09 §10 when done.
```


---

# 01 — Product Definition

## 1. Executive summary

Studex is an AI-assisted **academic operating system** for undergraduate students in India. It
consolidates what students now juggle across college ERP portals, WhatsApp groups, Google Drive,
notebooks, spreadsheets, calendars and generic AI chat apps: timetable, attendance, academic
calendar, assignments, PDFs/PPTs/notes, exam preparation, study schedules, progress, and
resource sharing.

Studex does **not** replace university ERPs, LMSs or portals. It is the student's **personal
layer on top of university life**: it understands their academic context and helps them
organize, navigate and act on it.

## 2. Vision

The most useful personal operating system for university students in India. Opening Studex
answers, within one glance:

- What is happening today? Which classes do I have, where, when?
- Am I safe on attendance? How many can I bunk? What do I need to recover?
- What is due, and what exams are coming?
- What should I study next, and where is the material?
- What am I weak at?

Studex learns the student's academic context progressively and becomes more useful every week
they use it.

## 3. Core thesis — connected context

The differentiation is not the feature count; it is the **relationships between features**.

> Syllabus uploaded → subjects, units, topics identified → lecture notes auto-filed to the right
> subject and topics → exam date entered → time available vs syllabus coverage known → revision
> plan generated → study sessions mark topics done, quizzes reveal weak topics → plan adapts →
> the tutor answers from the student's own notes, citing pages → Today reflects all of it.

Every module reads and writes **one shared academic context** (`06-architecture.md` §4).
A module that needs context another module owns MUST use that module's data, never a private copy.

## 4. Positioning

- **Category:** personal academic operating system.
- **Statement:** For Indian university students who juggle fragmented academic
  responsibilities, Studex is a unified academic workspace that organizes university life,
  understands their study materials and helps them make better academic decisions. Unlike
  generic productivity apps or standalone AI chatbots, Studex is built around the student's real
  structure: semester, subjects, timetable, attendance, syllabus and learning progress.
- **Wedge:** attendance under the 75% rule ("anxiety into arithmetic"). It is the one question
  students ask daily, the one where portals are distrusted, and the habit that carries every
  later module.
- **Beachhead:** RUAS (Ramaiah University of Applied Sciences) and other Bangalore universities.
  The architecture MUST NOT be restricted to any one university, program or degree.
- **Business model (to be confirmed by Ohm):** freemium. The daily attendance loop, timetable,
  tasks and data export are free forever. Studex Pro unlocks AI and storage limits (M21).

## 5. Product principles (binding)

Every product and engineering decision MUST follow these. When a requirement is silent, these
decide. When two principles collide, the lower number wins.

1. **Trust over intelligence.** Never invent attendance records, deadlines, academic policies,
   document contents, exam information or citations. Unknown is shown as unknown.
2. **Confirm is the product.** Every machine-made output that changes the student's data
   (timetable extraction, syllabus parsing, PYQ mapping, auto-filing, plans) lands in an
   editable confirmation surface first. Nothing wrong saves silently.
3. **Numbers, never guilt.** Attendance and progress are arithmetic, not verdicts. No shame, no
   streak mourning, no "danger/at risk/warning" language, no leaderboards.
4. **Manual control always exists.** Users can correct, edit, override, undo and delete anything.
   Every automated path has a manual path.
5. **Reliability before novelty.** A correct bunk calculator beats an impressive, flaky AI
   feature. Ship nothing that fails silently.
6. **Context before intelligence.** AI features run with the relevant academic context
   (subject, topic, the student's documents) and show what context they used.
7. **Action over information.** Help the student finish things, not just read about them.
8. **One connected academic system.** Modules share data; no isolated tools.
9. **Pull, never push, for bad news.** Information a student may dread (below threshold, behind
   on plan) appears when they navigate to it, always with a way forward, never as a push.
10. **Mobile-first, not mobile-only.** The phone is where the daily loop lives; the web app is
    complete and excellent for desk work (library, planner, tutor).
11. **Progressive complexity.** A new student understands Studex in 90 seconds. Advanced
    capability appears when relevant and never blocks the daily loop.
12. **Delight is a requirement.** The previous native build died partly because it looked and
    felt bad. Motion, haptics, typography and speed are acceptance criteria, not polish.

## 6. Users and market

### 6.1 Audience

Indian undergraduate students, roughly 17–22 (note: some first-years are 17 — see the minors
policy in `07` §3.4). WhatsApp-native, Android-majority, often on mid- and low-end phones and
patchy campus connectivity, English-medium at university, frequently Hinglish in casual writing.
Initial programs: engineering/CS, maths/science, commerce/business, design; the model MUST
handle any program.

### 6.2 Personas

| Persona | Problems | Needs | Primary modules |
|---|---|---|---|
| **A. Below-75 student (core)** | Already under or near the line, avoids looking, distrusts portal numbers, does not know the recovery math. | A number that matches their gut and shows its work; a plan, never a scolding. | M06, M03, M15 |
| **B. Disorganized student** | Material scattered across WhatsApp and Drive; forgets assignments; no single dashboard. | One workspace, reminders, simple timetable, auto-filed documents. | M08, M07, M03 |
| **C. Attendance-conscious planner** | Wants to plan bunks for fests, trips, sleep; checks portals repeatedly. | Bunk budget, day-bunk planner, forecasts. | M06 |
| **D. Exam-oriented student** | Huge syllabus, too many PDFs, poor revision planning, generic AI without context, lives on PYQs. | Syllabus structure, PYQ analysis, grounded tutor, quizzes, revision plans. | M10, M09, M11, M12 |
| **E. Organized power user** | Uses five tools to stay organized; wants analytics and desk-grade workflows. | Calendar, planner, search, insights, web app. | M05, M11, M13, M16 |
| **F. Collaborative student / class representative (CR)** | Same notes requested daily in groups; timetable updates relayed by hand. | Class spaces, shared timetable templates, shared resources. | M18 |

### 6.3 Roles

| Role | Who | Can | Cannot |
|---|---|---|---|
| `student` | Default | Everything on their own data | See anyone else's private data |
| `space_moderator` | CR or trusted student in a class space | Manage members, pin, remove content, publish timetable template **in that space** | Access members' private data (attendance, notes, files outside the space) |
| `institution_admin` | Verified university staff (Phase 5+) | Curate official institution data: calendars, holidays, course catalog, official timetable templates | See individual student data of any kind |
| `support` | Studex support operator | View account metadata, entitlement, sync health; act on support tickets | Read document contents, notes, tutor messages, attendance details — unless the user grants time-boxed diagnostic access |
| `studex_admin` | Studex staff | Platform operations: flags, catalog, moderation queue, quotas | Bypass audit logging; act without MFA |

Administrative capabilities MUST NOT ship in the student app bundle (see M20).

## 7. Core loops (what the product must make effortless)

| Loop | Cadence | Steps | Owning modules |
|---|---|---|---|
| **Daily** | Every class day | Glance (widget/notification/Today) → attend → one-tap mark → budget updates → end-of-day sweep | M03, M06, M15, M22 |
| **Weekly** | Weekly | Review tasks and upcoming deadlines → plan study blocks → file new material from groups | M07, M11, M08 |
| **Exam** | Per assessment | Add exam + scope → PYQ analysis → revision plan → study + quizzes → readiness → exam day → record marks | M10, M11, M12, M09, M14 |
| **Semester** | Per term | New semester → snap timetable → catch-up → … → semester receipt → archive | M02, M04, M13 |

## 8. Behavioral rules (from the psychology brief — binding)

Source: `reference/v1/briefs/psych.md`. These rules are requirements; the brief explains why.

1. **First-90-seconds aha.** Install → timetable snapped → confirmed → catch-up → first real
   number on screen within a 90-second budget. No login wall, no API keys, no profile forms
   before the first number (M02).
2. **Labor illusion during extraction.** Show subjects materializing as they are found, not a
   bare spinner.
3. **Catch-up seeding.** Pre-compute "classes held" per subject from semester start × timetable;
   ask only "attended"; microcopy "Not sure? Round down."
4. **The one animated moment.** The first Today render counts the overall % up from 0. Spend no
   other big animation budget anywhere else.
5. **Every percentage discloses its fraction** ("34 of 42 attended") on tap.
6. **Budget framing.** Decision surfaces (Today header, Today rows) lead with the budget; status
   surfaces (Subjects rows, detail) lead with %. Budget zero flips to recovery voice.
7. **Four honest marking states.** Unmarked (counts nowhere), Attended, Bunked (equal size,
   adjacent, identical haptic to Attended), Cancelled (excluded). No auto-marking.
8. **Reward accuracy, not virtue.** A Bunked tap immediately pays out an updated budget.
9. **Mistake tolerance.** Every mark has Undo; every past day is editable.
10. **Below threshold = number + plan, atomically.** Never a bare bad number. Red only on the
    small status dot or percentage tint. No warning icons, no red cards.
11. **Honest impossibility.** If the threshold is unreachable this term, say so with the maximum
    reachable %.
12. **Marking streak, not attendance streak.** Counts consecutive scheduled days fully marked
    (any state). Holidays and breaks pause it; 48-hour retro-mark grace; lives only on the
    attendance calendar screen; no loss-mourning copy.
13. **Notifications carry information, never judgment.** Defaults: one before the first class,
    one end-of-day unmarked summary. Never below-threshold or streak pushes (M15).
14. **Retention cliffs.** Break Mode for vacations, one-swipe timetable fixes ("Just today" vs
    "Every week"), New Semester flow ending in a shareable semester receipt.

## 9. Information architecture

### 9.1 Primary navigation

| Mobile tab (max 5) | Desktop sidebar | Contains |
|---|---|---|
| **Today** (Home) | Today | Overall number + budget, today's classes with marking, due tasks, exams soon, study blocks, next best action, quick actions |
| **Subjects** (Academics) | Subjects | Subject list (attendance status), subject workspaces, attendance calendar, exams, results/GPA |
| **Plan** (Planner) | Plan | Calendar (day/week/month/agenda), tasks (list/board), study plan, focus timer |
| **Library** | Library | All files, by subject/folder, imports, highlights, search |
| **Tutor** | Tutor | Threads, new question with scope picker, quick actions |
| Profile (avatar in header) | Profile & Settings (sidebar footer) | Account, semester, attendance rules, notifications, privacy & data, subscription, help, about |

Secondary destinations reachable from context and global search: Attendance calendar, Exams,
Assignments, Topics/syllabus, Progress, Class spaces, Notifications inbox.

Desktop web (≥ 1024 px) uses a sidebar and list–detail panes; tablet (600–1023 px) uses a rail;
phone (< 600 px) uses the bottom tab bar. Breakpoints are tokens in `packages/ui`.

### 9.2 Academic hierarchy

```
Institution ─ Campus ─ Program/Degree ─ Department
                                   │
Student ─ Term (semester; dates, timezone, threshold rules, holidays, breaks)
             ├─ Subject (code, name, credits, faculty, kind, color)
             │    ├─ Unit ─ Topic ─ (linked documents, notes, sessions, quiz items, PYQ items)
             │    ├─ Class slots (weekly or day-order pattern, versions, exceptions)
             │    ├─ Attendance (baseline + marks + audit)
             │    ├─ Tasks, Exams (scope → units/topics), Assessments (marks)
             │    └─ Documents, Notes, Flashcards, Quizzes
             └─ Events, Study plan & blocks, Focus sessions
```

- Every document, note, task, exam, study session, quiz and progress record MUST be linkable to
  the academic entities above (any level), and MUST still work with no link at all.
- A student can create personal subjects with no institution.
- Institution entities are a shared catalog; student entities are private and only *reference*
  catalog entries.

### 9.3 Global screen behavior

Every screen MUST implement: loading (skeletons, never layout jump), empty (explains the value +
one primary action), error (plain-language cause + retry + offline hint), offline/degraded
(state is visible and actions queue where supported), responsive layout, accessible
interactions, consistent navigation, and explicit feedback after every action (toast, haptic,
or inline change). No screen is ever blank because data is missing.

## 10. Experience quality bar

- **Motion:** Reanimated 4; durations and easings are tokens; ≤ 300 ms for marking feedback;
  respect Reduce Motion (the count-up becomes a fade). The count-up on first reveal is the one
  hero animation.
- **Haptics:** a single haptics map (light impact on mark, success on completion, warning only for
  destructive confirmation). Identical haptics for Attended and Bunked. Toggle in settings.
- **Visual identity:** a distinctive, calm design system (not stock components), light and dark,
  designed from Mobbin-grade references; Indian-English typography sizes that keep numbers huge
  and legible on small Android screens.
- **Speed:** the daily loop never waits on the network (local-first).
- **Screenshot QA:** every screen, light and dark, small Android and large iPhone, attached to the
  PR that changes it (`09` §6). Two of four ship-blocking bugs in July were invisible to tests.

## 11. Voice and copy

### 11.1 Rules

- Indian English, sentence case, short sentences, contractions welcome, numbers as digits.
- **"Bunked" is LOCKED.** Never "Skipped", "Missed" or "Absent" in UI copy (CSV import may map
  "Absent" → Bunked).
- Below-threshold tone: number + math, never verdicts ("You're at 71%. Attend the next 3 to
  reach 75%.").
- **Exactly one exclamation mark exists in the product:** `today.toast.recovered` — "You're back
  above {threshold}%!" (fires once, on crossing up through the threshold).
- Errors blame the input, never the person ("Couldn't read that. Try a flatter, brighter shot —
  or type it in.").
- AI copy never claims certainty it does not have; generated content is labeled.
- All strings live in `packages/copy` with keys; no string literals in components.

### 11.2 Locked strings (port verbatim from `reference/v1/briefs/copy.md`)

Port the full pack; the most important LOCKED lines are:

| Key | Text |
|---|---|
| `onboarding.headline` | What do you have today? |
| `onboarding.feature.1/2/3` | Your day, sorted. · Know your number. Always. · Never lose a file again. |
| `today.verdict.above` | You're at {percent}%. You can bunk {n} more and stay above {threshold}%. |
| `today.verdict.close` | You're at {percent}%. One bunk puts you under {threshold}%. |
| `today.verdict.below` | You're at {percent}%. Attend the next {n} to reach {threshold}%. |
| `today.empty` | Nothing today. Go touch grass. |
| `today.toast.recovered` | You're back above {threshold}%! |
| `subjects.empty` | Set up your subjects to see your %. |
| `detail.empty` | Empty folder. Drop something in. |
| `mark.attended` / `mark.bunked` / `mark.cancelled` | Attended / Bunked / Cancelled |

### 11.3 Retired or conditional strings

- **Retired:** every Claude-key string (`extract.step.boost`, `settings.row.claudekey`,
  `settings.footer.claudekey`, `toast.key.invalid`, `key.remove.*`). There is no bring-your-own-key.
- **Conditional:** strings that promise local-only storage ("Stays on your phone…", "Local-only.
  No account, no cloud, nobody watching.", "It only lives on this phone. Gone is gone.") MAY only
  render in guest mode. Signed-in equivalents are **new copy requiring Ohm's approval**.
- **Adapted:** Siri/TipKit/widget strings are re-used where the platform feature exists (M22).
- New strings: write them in this voice, add them to `packages/copy`, list them in the PR under
  "New copy" for Ohm's review.

## 12. Success metrics

| Metric | Definition | Target (beta → launch) |
|---|---|---|
| **North star: Weekly Active Markers** | Students who mark attendance on ≥ 3 distinct days in a week | Grow week over week; this is the habit everything else builds on |
| Activation | % of installs that see their first real number | ≥ 60% → ≥ 70% |
| Time to first number | Install → number revealed (median) | ≤ 3 min → ≤ 90 s |
| Extraction acceptance | % of timetable extractions confirmed with ≤ 2 edits | ≥ 70% → ≥ 85% |
| Marking coverage | % of scheduled classes marked within 48 h (active users) | ≥ 80% |
| Retention | D1 / D7 / D30 for activated users | 60% / 40% / 25% → higher |
| Trust | % of users whose portal reconciliation delta ≤ 2 classes per subject (M06, P2) | ≥ 90% |
| Quality | Crash-free sessions | ≥ 99.5% → ≥ 99.8% |
| AI quality | Tutor thumbs-up rate · citation precision (eval) | ≥ 80% · ≥ 0.90 |
| AI cost | AI spend per monthly active user | Within Ohm's budget (set in `11` §2) |

Every metric MUST be computable from the analytics dictionary (`07` §7) without collecting PII.

## 13. Non-goals

- Replacing or scraping university ERPs/LMSs/portals; storing portal credentials; automating
  WhatsApp or any messaging app (WhatsApp bans automation).
- Public social feeds, attendance leaderboards, public profiles, dating/marketplace features.
- Ads of any kind; selling or sharing personal data.
- Proctoring, plagiarism-detection evasion, or completing graded work on the student's behalf
  as a product goal (policy in M09).
- Teacher/faculty attendance tools (a different product).
- Email-sending features built by agents (standing rule; see `09` §8).


---

# 02 — Functional Requirements: Core (M01–M08)

Format per module: objective · phase · owning workstreams · requirements (`FR-…`, priority,
phase) · edge cases · acceptance criteria · out of scope. Workstream codes are defined in
`08-delivery-plan.md` §3. Attendance math lives in `05-attendance-math.md` and is not repeated.

---

## M01 — Identity & Accounts (`AUTH`)

**Objective.** Let students start instantly without an account, then securely create one to back
up, sync across devices and unlock server features.
**Phase.** Guest mode Ph1 · Accounts Ph2. **Owners.** WS-DATA (auth, claims, RLS), WS-APP (UI).

### Requirements

- **FR-AUTH-001 (P0, Ph1) Guest mode.** The whole daily loop (M02, M03, M05, M06, M15 local
  reminders, M22 widgets) MUST work with no account, storing data in the on-device database.
  Profile shows "Not backed up — sign in to sync". No login wall anywhere in the daily loop.
  Server-dependent features (library processing, tutor, cross-device sync) show a sign-in
  explainer. Guests MAY use timetable extraction (anonymous, rate-limited; M17).
- **FR-AUTH-002 (P0, Ph2) Social sign-in.** Sign in with Google (native ID-token flow on iOS and
  Android, OAuth redirect on web) and Sign in with Apple (mandatory on iOS whenever Google is
  offered; OAuth on web/Android P1), via the auth provider's ID-token exchange.
- **FR-AUTH-003 (P1, Ph2, HUMAN-GATED) Email one-time code.** Needs an email sender that only
  Ohm configures inside the auth provider. Agents MUST NOT add, configure or call any
  email-sending service. Until Ohm enables it, email sign-in is hidden. No password accounts
  are planned, so there is no password-reset flow; if Ohm later adopts passwords, reset uses only
  the provider's built-in flow.
- **FR-AUTH-004 (P0, Ph2) Guest → account claim.** First sign-in on a device with guest data:
  - Account empty → upload all guest data under the new user: idempotent, resumable, progress shown.
  - Account already has data → choose: **Use account data** (default; guest data first saved as
    an on-device JSON backup), **Use this phone's data** (account's active term archived, not
    deleted, then guest data uploaded), or **Merge** (subjects paired by normalized code, then
    normalized name; user confirms pairs; for each pair the user picks which attendance history
    wins — histories are never summed; unpaired subjects added; tasks and notes unioned).
- **FR-AUTH-005 (P0, Ph2) Sessions.** Tokens in platform secure storage (Keychain / Keystore);
  web uses the provider SDK under a strict CSP. Offline launch with a cached session works.
  Failed refresh → keep working on local data and show "Sign in again to sync"; never discard
  local data silently. Logout flushes pending uploads first; if unsynced changes remain:
  "3 changes haven't synced. Log out anyway?"; then wipes synced local data. "Log out of all
  devices" revokes every refresh token.
- **FR-AUTH-006 (P0, Ph2) Profile.** Display name, optional avatar, institution, campus,
  program, department, year of study, current term, timezone (default `Asia/Kolkata`), locale
  (default `en-IN`). Collected progressively (FR-ONB-009). No date of birth is stored.
- **FR-AUTH-007 (P0, Ph2) Age gate and minors.** Account creation asks for confirmation of 18+.
  Under-18 users stay in guest mode (data never leaves the device) until the verifiable parental
  consent flow ships (FR-SET-009). After it ships: consent verified per the DPDP Rules, product
  analytics and behavioral features off, communities unavailable.
- **FR-AUTH-008 (P0, Ph2) Account management.** Edit profile, view and link sign-in methods
  (link P1), export data and delete account (M19), list active sessions (P2).
- **FR-AUTH-009 (P0, Ph2) Roles.** Role claims are issued server-side only. Every non-student
  role requires TOTP MFA. Role grants and revocations are made by `studex_admin` only and are
  audit-logged.
- **FR-AUTH-010 (P1, Ph2) Abuse protection.** Rate limits on auth and anonymous endpoints; bot
  challenge on web for anonymous endpoints.

### Edge cases
Sign-in cancelled mid-flow · Apple "hide my email" relay addresses · same Google account on
phone and web simultaneously · clock skew causing JWT `iat` errors · sign-in while an upload
queue is non-empty · revoked session on another device.

### Acceptance criteria
- Protected API routes return 401 for missing, invalid or expired JWTs and 404 (never 403) for
  other users' resources.
- RLS tests prove user A cannot select, insert, update or delete user B's rows in every
  user-owned table (`10` §4).
- Claim of 1,000 local records completes exactly once even if the app is killed three times
  mid-upload.
- Offline launch with an expired access token still shows all local data.
- Account deletion signs out every session and starts the M19 pipeline.
- Every auth error shows a plain-language cause and a next step.

### Out of scope
Phone OTP (SMS sender is also human-gated; P2 if Ohm wants it). University SSO (Phase 5+ with
institution partnerships).

---

## M02 — Onboarding (`ONB`)

**Objective.** Install → first real number in ≤ 90 seconds, then progressive profile completion.
**Phase.** Ph1. **Owners.** WS-APP, WS-EXTRACT.

**First-run order (LOCKED):** Welcome → Capture → Extracting → Check your week → Batch
(conditional) → Catch-up → Reveal on Today. Deferred until after the reveal: notification
pre-prompt, profile checklist (institution, program, semester label, threshold), back-up
prompt, syllabus upload.

> **Deliberate change from the draft.** The draft's 10-step order (personal info → university →
> degree → year → subjects → timetable → threshold → preferences → dashboard) is reordered.
> Profile forms before value kill activation (behavioral rule 1), and subjects come from the
> timetable instead of a separate picker. Every draft field is still collected — after the number.

### Requirements

- **FR-ONB-001 (P0) Welcome.** Headline and the three locked feature lines, "Get started", and
  (Ph2) "I already have an account".
- **FR-ONB-002 (P0) Capture.** "Scan timetable" (system document scanner: VisionKit on iOS, ML Kit
  Document Scanner on Android, via a maintained module; fallback camera capture), "Choose from
  Photos" (system photo picker; no broad media permission), "Pick a PDF"; caption "Crumpled paper,
  PDF, screenshot from the class group — all fine."; link "No timetable handy? Type it in" → empty
  Check-your-week in add mode. Web: drag-and-drop or file picker. Multi-page PDF → page picker
  with thumbnails (auto-select the page that looks like a timetable).
- **FR-ONB-003 (P0) Extracting.** Three locked step labels; real found subjects appear as chips
  (labor illusion — chips MUST come from the real result, staged over ≤ 1.5 s if the model does
  not stream; never fake names); Cancel; timeout 30 s; failure → "Couldn't read that" with "Try
  another photo" / "Type it in". Success haptic.
- **FR-ONB-004 (P0) Check your week.** Editable list by day (Mon–Sat; Sun only if a class landed
  on it). Flagged items pinned first under "Check these" with the reason ("Best guess — tap to
  check"). Add, edit, delete classes (subject, kind, start, end, room, faculty, batch). Edit the
  subject list (rename, merge duplicates, code). Resolve electives (pick yours). Semester dates:
  start prefilled from document metadata if found, else today − 6 weeks; end = start + 4 months,
  editable. Schedule mode: weekly by default; day-order if detected or chosen. CTA "Looks right".
- **FR-ONB-005 (P0) Batch.** Only if ≥ 2 distinct batch tags. "No batches" or a batch. Other
  batches' slots are kept but excluded from Today and all math; switchable later in Settings.
- **FR-ONB-006 (P0) Catch-up.** Per subject: "Classes held" prefilled from schedule (term start →
  yesterday, holidays excluded, contact hours excluded) and editable; "You attended" stepper
  defaulting to held. Copy: "Rough numbers are fine — you can fix them later." and "Not sure?
  Round down." "Start from today" sets baselines to 0/0. CTA "Show my number". Validation:
  0 ≤ attended ≤ held. Commit sets each subject's baseline `asOf` to yesterday, so earlier days
  are covered by these numbers and never double-counted (`05` §2).
- **FR-ONB-007 (P0) Reveal.** Commit → Today with the overall % counting up from 0 (Reduce
  Motion: fade) and the verdict sentence. One-time tip on the first class row: tap to mark,
  swipe right = Attended, swipe left = Bunked.
- **FR-ONB-008 (P0) Manual path.** Everything above works without extraction and without
  network, including catch-up and reveal.
- **FR-ONB-009 (P1) Profile checklist.** Card on Today after the reveal (dismissible, at most once
  a day, disappears when done): institution (search by name, city or abbreviation; browse;
  "Can't find it? Add it" free text → pending catalog entry), program, department, year,
  semester label, threshold (default 75%), notifications.
- **FR-ONB-010 (P0) Persistence and resume.** Each step's state saves locally on change; a
  killed app resumes at the same step with data intact; back navigation never loses edits.
- **FR-ONB-011 (P0) Re-scan.** Settings → "Scan timetable again" runs Capture → Check (skips
  Welcome and Catch-up) with a diff view (added / removed / changed). Subjects match by
  normalized code, then name. History, baselines and files are kept. Slot changes apply from a
  chosen date (default today) through slot versioning (FR-CAL-004).
- **FR-ONB-012 (P1, Ph5) Section templates.** "Your classmates already set this up" — join a
  class-space timetable by link or QR instead of scanning (M18).
- **FR-ONB-013 (P0) Instrumentation.** `onboarding_step_*` events with durations so the 90-second
  budget is measurable (`07` §7).

### Edge cases
Zero classes found → failure state · landscape or rotated photos · very dark or blurred images
(guidance copy) · duplicate subjects with the same code but different names (merge suggestion) ·
term already ended (warn and offer a new term) · Sunday classes · a timetable with only labs.

### Acceptance criteria
- A new user reaches Today with a real number with no account, no network (manual path) and no
  optional step completed.
- With `extraction-lab/fixtures/ruas-cse-sem4.jpg`, Check-your-week shows all 25 slots, and the
  two Saturday split-room / ambiguous-batch slots are flagged (consistent with the M17 gate).
- Killing and relaunching the app at every step preserves state (E2E).
- In moderated tests with ≥ 5 RUAS students, median time to first number ≤ 3 min in beta
  (measured from events), trending to ≤ 90 s.
- No fabricated university, timetable or attendance data; every default is visible and editable.

### Out of scope
Importing from university ERPs. Account creation inside the first-run flow.

---

## M03 — Today (Home dashboard) (`DASH`)

**Objective.** One glance answers today: classes, number, budget, what is due, what is next.
**Phase.** Ph1 (header, number, classes) · Ph2–Ph4 (cards). **Owner.** WS-APP.

### Requirements

- **FR-DASH-001 (P0, Ph1) Header.** Greeting by time of day, date ("Fri, 20 Nov"), term label,
  day-order label in day-order mode ("Day 3"), state banners (Holiday, Break Mode, Exam day).
- **FR-DASH-002 (P0, Ph1) Overall card.** Caption "Overall", large percentage (display rules
  `05` §5), verdict sentence (budget-led, `05` §6). Tap → fraction and per-subject breakdown
  sheet. First reveal counts up.
- **FR-DASH-003 (P0, Ph1) Today's classes.** Sections "Now", "Coming up", "Earlier". Each row:
  time, subject short name, kind, room, faculty (if known), "NOW" badge. Mark controls:
  Attended and Bunked as equal-size, adjacent, one-tap targets with identical haptics.
  Long-press / context menu: Cancelled, Excused (if enabled), "Edit class" ("Just today" /
  "Every week"), "Open subject". Contact-hour rows: three-way "Attended / Happened — I missed it /
  Didn't happen" (default not held). Past unmarked rows: "Did you make it?". Per-row budget chip
  ("2 to spare" / "0 to spare" / "attend next 1") from that subject's standing.
- **FR-DASH-004 (P0, Ph1) Mark feedback.** Visual change ≤ 100 ms; % and budget animate with a
  numeric transition ≤ 300 ms; undo toast ("FM marked Bunked — Undo", 5 s); crossing up through
  the threshold fires the recovered toast once (FR-ATT-015).
- **FR-DASH-005 (P0, Ph1) End-of-day sweep.** After the last class ends: "Mark remaining {n}
  Attended" (one tap, per-row override visible, undo).
- **FR-DASH-006 (P0, Ph1) Unmarked badge.** Count of unmarked past occurrences in the last 48 h;
  tap → resolve list.
- **FR-DASH-007 (P0, Ph2) Due soon.** Overdue + due today + next 3 days (max 5, "See all");
  complete with one tap (undo).
- **FR-DASH-008 (P0, Ph2) Exams soon.** Exams within 14 days with countdown ("DBMS IA-2 · in 3
  days"); readiness once M10 ships.
- **FR-DASH-009 (P1, Ph4) Study today.** Planned study blocks with Start / Done / Skip.
- **FR-DASH-010 (P1, Ph3) New files.** Last 3 files, including auto-filed imports awaiting
  confirmation ("Filed under DBMS — change?").
- **FR-DASH-011 (P1, Ph2) Next best action.** At most one card, chosen by the deterministic rules
  below, always with a one-line reason; dismissible; never guilt-framed; never about
  below-threshold status.
- **FR-DASH-012 (P0, Ph2) Quick actions.** Mark attendance (scrolls to now), Add task, Scan or
  upload, Ask tutor, Add exam, Start focus.
- **FR-DASH-013 (P1, Ph2) Personalization.** Reorder or hide optional cards (the overall card and
  classes stay pinned at the top); synced per user.
- **FR-DASH-014 (P0, Ph1) States.** No timetable → onboarding CTA. No classes today → "Nothing
  today. Go touch grass." plus tomorrow's first class. Holiday → "Holiday — nothing counts
  today." Break → "On break. See you {date}." Skeletons while loading; each card loads and fails
  independently.
- **FR-DASH-015 (P0, Ph1) Speed.** Today renders from the local database within 1 s of launch on
  the reference low-end Android device (`07` §1), with no network dependency.

**Next-best-action rules** (evaluate in order, first match wins):

| # | Condition | Card | Reason line |
|---|---|---|---|
| 1 | Exam within 48 h with a defined scope | "Revise {topic}" | "{exam} in {n} days · {k} topics not revised" |
| 2 | Task due today, not completed | "Finish {task}" | "Due today {time}" |
| 3 | Unmarked classes from yesterday | "Mark yesterday's {n} classes" | "Keeps your number real" |
| 4 | Study block starts within 60 min | "Start {topic} at {time}" | "Planned for today" |
| 5 | Files awaiting filing confirmation | "Check {n} new files" | "Auto-filed from your imports" |
| — | None | (hidden) | — |

### Acceptance criteria
- All dashboard data comes from real records; changes in M05/M06/M07/M10/M11 reflect on Today
  within 1 s locally.
- Fully usable at 360×640 dp with font scale 1.3, light and dark (screenshot QA of every state).
- A failing card never blocks other cards.

---

## M04 — Academic Workspace (`ACA`)

**Objective.** A structured home for each term and subject that every other module links into.
**Phase.** Ph1 (terms, subjects) · Ph2 (units, topics, notes) · Ph3 (syllabus import).
**Owners.** WS-APP, WS-DATA.

### Requirements

- **FR-ACA-001 (P0, Ph1) Terms.** Label ("Sem 4"), academic year ("2026–27"), start/end dates,
  timezone, schedule mode, attendance policy, holidays, breaks. Exactly one active term; past
  terms retained (read-only by default, editable on request).
- **FR-ACA-002 (P0, Ph1) Subjects.** Name, short name (≤ 8 chars, auto-derived, editable), code,
  color (auto from palette, editable), kind (theory / lab / elective / audit / other), credits,
  faculty (one or more), description, per-subject attendance overrides (M06).
- **FR-ACA-003 (P0, Ph1) Archive vs delete.** Archive hides from active lists and keeps all
  history. Delete removes the subject with its slots, attendance and links; its documents become
  unfiled, not deleted, unless the user ticks "Delete its files too". Confirmation copy states
  exactly what goes.
- **FR-ACA-004 (P0, Ph2) Subject workspace.** Tabs: Overview (standing, next classes, next exam,
  due tasks), Syllabus (units/topics and progress), Files, Tasks, Exams, Notes, Practice
  (Ph4), Progress (Ph4). Empty tabs teach what they are for.
- **FR-ACA-005 (P0, Ph2) Units.** Number, title, order, optional hours/weightage; reorderable.
- **FR-ACA-006 (P0, Ph2) Topics.** Title, description, unit, order, status (not started /
  learning / revised / confident), difficulty (easy / medium / hard), priority (normal / high),
  linked documents with page ranges, study history (sessions, quiz results), notes; bulk status
  edit.
- **FR-ACA-007 (P0, Ph3) Syllabus import.** Upload a syllabus PDF or photo → M17 extraction →
  confirm → units and topics created. Re-import shows a diff and keeps progress on matched topics.
- **FR-ACA-008 (P0, Ph2) Notes.** Rich text (headings, bold/italic, lists, checklists, code,
  inline and block LaTeX, images, links), attachments, links to subject / unit / topic /
  document page / session; backlinks shown on linked entities; offline create and edit; stored as
  structured document JSON plus a plain-text projection for search and AI.
- **FR-ACA-009 (P1, Ph3) Note from selection.** From the viewer: a note with the quoted text and
  a page link.
- **FR-ACA-010 (P0, Ph1) New semester.** Offered when the term end date passes or after 7+
  consecutive no-class days. Archives the old term (files stay), shows the semester receipt
  (M13), runs Capture for the new timetable, and offers to reuse subjects whose codes match.
- **FR-ACA-011 (P1, Ph5) Catalog link.** A subject can link to a shared course-catalog entry
  (institution + code) to enable class spaces and shared resources; never required.

### Acceptance criteria
Every subject belongs to exactly one term · archived subjects remain in history and analytics ·
changes sync across devices · RLS enforced · deleting a subject never deletes documents unless
explicitly chosen (test).

---

## M05 — Timetable & Calendar (`CAL`)

**Objective.** A reliable, correct schedule that every surface derives from.
**Phase.** Ph1 (timetable, holidays, edits) · Ph2 (calendar views, events, ICS).
**Owners.** WS-CORE (occurrence math), WS-APP, WS-DATA.

### Requirements

- **FR-CAL-001 (P0, Ph1) Class slots.** Subject, kind (lecture / lab / tutorial / contact hour /
  other), weekday (Mon = 1 … Sun = 7) or day-order index, start and end as local wall-clock
  minutes, room, faculty, batch tag, units (default 1), validity (`valid_from`, `valid_until`)
  for versioning, notes.
- **FR-CAL-002 (P0, Ph1) Schedule modes.** (a) Weekly (default). (b) Day-order: an N-day cycle
  (N = 4–7) that advances one step per working day, skipping holidays and breaks, with manual
  override ("Today follows Day 3") that re-anchors the following days. (c) Week parity
  (odd/even weeks) per slot (P1). (d) Slot-code timetables (FFCS style): weekly slots generated from a slot
  template plus the student's course-to-slot registration (FR-EXT-015).
- **FR-CAL-003 (P0, Ph1) One source of occurrences.** Class occurrences come only from
  `packages/core` occurrence math (`05` §3). Today, catch-up, budgets, notifications, widgets and
  the calendar all call it; no surface re-derives occurrences.
- **FR-CAL-004 (P0, Ph1) Edits.** "Just today": an exception on one occurrence (cancel, move
  time, change room) or an extra one-off class (subject + kind + time). "Every week": a new slot
  version from a chosen date; history stays attached to the old version. Deleting a slot ends
  its validity at a date; past occurrences and marks remain.
- **FR-CAL-005 (P0, Ph1) Holidays.** Per-term list, seeded from a bundled national gazetted list
  for the term's years, an optional state list (Karnataka first) and the institution list when
  available. Add single dates or ranges with names. Holidays remove occurrences from Today and
  the math. Declaring a holiday on a day that already has marks asks: keep or clear.
- **FR-CAL-006 (P0, Ph1) Breaks.** Date ranges (mid-sem break, vacation) behave like holidays and
  pause streaks and notifications (Break Mode, FR-PRG-006).
- **FR-CAL-007 (P0, Ph2) Calendar views.** Day, week (time grid), month, agenda; shows class
  occurrences, events, timed tasks, exams and study blocks, colored by subject; tap opens the
  entity.
- **FR-CAL-008 (P0, Ph2) Events.** Types: exam, deadline, study session, personal, academic,
  holiday. All-day or timed, location, notes, links. Recurrence via an RFC 5545 RRULE subset
  (DAILY / WEEKLY / MONTHLY, INTERVAL, BYDAY, COUNT / UNTIL, EXDATE). Edit scopes: this / this
  and following (series split) / all.
- **FR-CAL-009 (P0, Ph2) Conflicts.** Warn on overlaps (class vs event, event vs event, study
  block vs class) before saving; never block; list conflicts in the week view.
- **FR-CAL-010 (P0, Ph2) ICS export.** Private, revocable per-user subscription URL containing
  classes (expanded with EXDATEs for holidays and cancellations), exams, deadlines and optionally
  study blocks, refreshed within 15 minutes of changes; one-off `.ics` export of a date range.
- **FR-CAL-011 (P1, Ph2) ICS import.** Import a file into a chosen category; duplicates detected
  by UID.
- **FR-CAL-012 (P2, Ph6) Google Calendar two-way sync.** OAuth; requires Google verification for
  sensitive scopes.
- **FR-CAL-013 (P1, Ph3) Academic calendar import.** Extract holidays and exam windows from the
  institution calendar PDF via M17 → confirm → applied to the term.
- **FR-CAL-014 (P0, Ph1) Time rules.** Academic dates are local dates in the term's timezone.
  Class times are wall-clock minutes in that timezone. Occurrence key = `{slotId}:{YYYY-MM-DD}`
  (extra classes: `x:{exceptionId}`). Changing the device timezone never moves classes.
  DST-correct for non-IST zones.

### Acceptance criteria
Occurrence math passes the golden and property suites (`10` §3) including holidays, Saturday
classes, day-order shifting, parity, versions, exceptions and timezone traps (marking at 00:30
IST lands on the correct date) · no duplicate occurrences · edits propagate across devices · ICS
validates against an RFC 5545 validator and subscribes correctly in Google Calendar and Apple
Calendar (manual check recorded in the PR).

---

## M06 — Attendance Intelligence (`ATT`) — flagship

**Objective.** A trustworthy attendance ledger with budgets, recovery plans and forecasts that
match the student's gut and show their work.
**Phase.** Ph1. **Owners.** WS-CORE (engine), WS-APP (surfaces). Math: `05-attendance-math.md`.

### Requirements

- **FR-ATT-001 (P0) Policies.** Per term, with per-subject overrides: threshold (basis points; UI
  50–95% in steps of 1, default 75%), rounding policy (`exact` default | `half_up_integer`),
  eligibility basis (`per_subject` default | `overall` | `both`), contact hours (excluded until
  marked, default), units per class kind (default 1), Excused policy (off by default; when on:
  on-duty counts as attended, medical is excluded; both configurable).
- **FR-ATT-002 (P0) Baselines.** Per subject prior attended/held units from catch-up, CSV or
  reconciliation, with change history; 0 ≤ attended ≤ held. Each baseline has a coverage date
  `asOf`: marks on or before it are ignored and those days cannot be marked (`05` §2). Editing the
  baseline is how earlier days are corrected.
- **FR-ATT-003 (P0) Marking.** States: Unmarked (no record), Attended, Bunked, Cancelled, and
  Excused (if enabled; kind on-duty / medical / other). Exactly one current mark per occurrence;
  re-marking replaces; unmarking returns to Unmarked. Sources: Today row, subject ledger,
  calendar day sheet (backfill, only for dates after the baseline `asOf`), widget, notification action, end-of-day sweep, CSV import.
- **FR-ATT-004 (P0) Standings.** Per subject and overall exactly per `05`. Overall = aggregate
  units, never a mean of percentages. Raw counts are always one tap away.
- **FR-ATT-005 (P0) Sentences.** Budget and recovery sentences per `05` §6 (locked copy) on the
  Today header (overall), Today rows (chip), Subjects rows and Subject detail.
- **FR-ATT-006 (P0) Forecast and simulator.** On subject detail and overall: term-end line ("To
  finish the semester at 75%, attend at least 24 of the remaining 30."); presets (attend all
  remaining · bunk the next class · bunk the next 2 · custom N attended / M bunked); live result;
  every forecast states its assumptions ("Assumes your timetable and holidays stay as they are.").
- **FR-ATT-007 (P0) Bunk planner.** Pick a date or range (fest, trip) → per-subject impact
  (classes affected, resulting %, safe-now yes/no, term-end impact) and an overall line; "Plan
  it" optionally adds a personal event.
- **FR-ATT-008 (P0) Honest impossibility.** Per `05` §6.4.
- **FR-ATT-009 (P0) History and audit.** Per-subject ledger (date, slot, status, source, marked
  at, modified). Every change appends an audit event (old → new, source, device, time).
  Corrections never silently erase history; the ledger shows "Changed from Bunked on 12 Sep".
- **FR-ATT-010 (P0) Attendance calendar ("Your semester").** Day cells: attended / mixed /
  bunked / no classes / holiday / unmarked (hollow); filter by subject; tap a day → sheet to mark
  or backfill; marking streak and best streak per behavioral rule 12 with a one-line explainer.
- **FR-ATT-011 (P0) Alerts policy.** **No push notification ever reports approaching or falling
  below the threshold** (principle 9 in `01` §5; behavioral rule 13).
  > **Deliberate change from the draft.** The draft's threshold alerts are replaced by in-app
  > pull surfaces (status dots, verdict lines) and the opt-in weekly digest (FR-PRG-005). The
  > draft's "no attendance record for a class" alert is the end-of-day summary (FR-NTF-003).
- **FR-ATT-012 (P0) CSV import/export.** Columns `date,subject_code,subject_name,status,units,slot_start`;
  status ∈ attended | bunked | cancelled | excused (aliases: present → attended, absent →
  bunked); preview with row-level errors before commit (rows dated on or before the baseline `asOf` are
  rejected: "Covered by your catch-up numbers"); atomic import; export includes baselines
  and marks.
- **FR-ATT-013 (P1, Ph2) Checkpoints.** User-defined cut-off dates ("IA-1 attendance check, 15
  Sep") → standing as of the checkpoint and forecast to it.
- **FR-ATT-014 (P2, Ph4) Portal reconciliation.** Import a screenshot of the college portal's
  attendance page → M17 extraction → side-by-side "Portal 34/42 · Studex 33/41" per subject →
  adjust the baseline in one tap, moving its `asOf` to the screenshot date (audit-logged). Never ask for or store portal credentials.
- **FR-ATT-015 (P0) Recovered toast.** Fires once when a subject or overall crosses up through
  the threshold because of a mark (never because of a settings change).

### Acceptance criteria
- The engine passes `05`'s golden table and property tests.
- No percentage is shown when held = 0.
- Display never shows a value at or above the threshold while the student is below it.
- Corrections are auditable; per-subject thresholds work concurrently.
- Forecasts state assumptions.
- A test asserts that no notification template references attendance status.

---

## M07 — Tasks & Assignments (`TASK`)

**Objective.** Students never lose track of academic responsibilities.
**Phase.** Ph2. **Owners.** WS-APP, WS-DATA.

### Requirements

- **FR-TASK-001 (P0) Create.** Title (required), notes (rich text), type (assignment / homework /
  project / lab record / reading / revision / personal), subject (optional), due (date only =
  all-day local, or date-time), priority (none / low / medium / high), status, estimated effort
  (minutes), attachments (library documents or new uploads), links (topic, exam, document page,
  study block).
- **FR-TASK-002 (P0) Quick add.** Natural-language dates in Indian English ("DBMS record fri
  5pm", "tomorrow", "next mon", "in 3 days", "20 nov", "20/11"); parsed parts shown as editable
  chips before save; ambiguity is asked, never guessed (DD/MM is the default reading).
- **FR-TASK-003 (P0) Status.** Not started / in progress / completed / cancelled; `completed_at`
  recorded; undo.
- **FR-TASK-004 (P0) Views.** List grouped Overdue / Today / Tomorrow / This week / Later / No
  date; board by status; calendar (M05); by subject; filters (type, subject, priority, status);
  sort.
- **FR-TASK-005 (P1) Recurrence.** RRULE subset; completing an instance creates the next; edit
  scope this / all future.
- **FR-TASK-006 (P0) Reminders.** Timed tasks: 24 h and 2 h before by default; all-day tasks:
  09:00 on the due date; configurable per task and globally; local notifications (M15).
- **FR-TASK-007 (P0) Subtasks.** One level of subtasks plus checklists; progress "2/5".
- **FR-TASK-008 (P0) Overdue visibility.** Overdue tasks stay visible until completed or
  cancelled; never auto-hidden.
- **FR-TASK-009 (P1, Ph4) Analytics.** On-time completion %, overdue trend (M13).
- **FR-TASK-010 (P2, Ph3) Assignment from photo or message.** Snap a notice or share a WhatsApp
  message → M17 extracts title, subject, due → confirm.
- **FR-TASK-011 (P0) Offline.** Create, edit and complete offline; conflict policy per M23.

### Acceptance criteria
Tasks sync across devices · completed tasks never reappear as pending after sync (conflict
test) · due dates respect the term timezone · the natural-language parser passes a golden set of
≥ 60 phrases including Indian date formats ("20th Nov", "20/11", "Monday 5pm").

---

## M08 — Library & Knowledge Engine (`KNO`)

**Objective.** Every academic file in one searchable, organized place: the foundation for the
tutor, exam intelligence and planner.
**Phase.** Ph3. **Owners.** WS-DOCS (pipeline, search), WS-APP (UI), WS-DATA (storage, RLS).

### Requirements

- **FR-KNO-001 (P0) Sources.** File picker; camera scan → multi-page PDF with auto-crop; share
  sheet / share intent from any app (WhatsApp, Drive, Files, browsers); web drag-and-drop
  (multi-file); **WhatsApp chat export import** (`.zip` from "Export chat → Attach media"):
  unzipped on device, media listed with sender, date and caption parsed from `_chat.txt`, user
  assigns a subject per group or per file, imports the selection. Never automate WhatsApp or
  read chats without the user's explicit export.
- **FR-KNO-002 (P0) Formats and limits.** PDF, PPT, PPTX, DOC, DOCX, TXT, MD, JPG/JPEG, PNG,
  WebP, HEIC (converted), ZIP (WhatsApp export only). Validation: magic-byte MIME sniffing that
  must agree with the extension; size limits (default 50 MB/file free, 200 MB Pro); page limits
  (default 300 free, 1,500 Pro); encrypted PDFs rejected with an explanation; ZIP limits (≤ 2,000
  entries, ≤ 2 GB uncompressed, ratio ≤ 100:1). Limits are server config.
- **FR-KNO-003 (P0) Organization.** Term, subject, unit, topic, custom folders (nesting ≤ 3).
  Auto-filing suggestions from filename, WhatsApp caption, subject codes/names and (after
  processing) content classification, shown as a confirmable chip ("Filed under DBMS · Unit 3 —
  change?"). Never moves a file the user placed without consent.
- **FR-KNO-004 (P0) Metadata.** Original filename, display name, MIME, size, page count, sha256,
  source, uploaded at, owner, links, processing status, extraction status, pipeline version,
  detected language.
- **FR-KNO-005 (P0) Viewer.** PDF and Office renditions: page navigation, thumbnails, zoom,
  in-document search with hit highlighting, text selection, colored highlights, annotations,
  bookmarks, page deep links, download/share original, open-at-page from citations with the cited
  passage highlighted. Images: zoom plus an OCR text layer. TXT/MD rendered.
- **FR-KNO-006 (P0) Processing pipeline.** Statuses: Uploaded → Queued → Processing → Ready |
  Partially processed | Failed; Deleted. Steps: validate → store original → convert (Office →
  PDF rendition; HEIC → JPEG) → per-page text with layout (headings, lists, tables) → OCR for
  low-text pages → section detection → heading-aware, page-referenced chunking → embeddings →
  index (full-text + vector) → link suggestions → Ready. Partial lists the failed pages. Failed
  shows a plain reason ("This PDF is password-protected") and Retry. Processing is idempotent
  per (document, pipeline version).
- **FR-KNO-007 (P0) Search.** Fuzzy filename, full-text (snippet + page) and semantic, with
  hybrid ranking; filters: subject, unit, topic, type, source, date; results open at the page.
- **FR-KNO-008 (P1) Topic linking.** Suggested topic links per document or page range
  (chunk-to-topic similarity), bulk confirm/reject. Links feed tutor scope and the planner.
- **FR-KNO-009 (P0) Selection actions.** Note from selection (M04), flashcard from selection
  (M12), "Ask tutor about this" (M09).
- **FR-KNO-010 (P0) Duplicates.** Exact (sha256): "Already in your library (added 12 Sep) — open
  it / keep both". Near-duplicates (P2, text-shingle similarity ≥ 0.9): suggestion only. Never
  auto-delete.
- **FR-KNO-011 (P0) Deletion.** Two stages. **Delete** moves the document to "Recently
  deleted" (FR-SYNC-008): it disappears at once from the library, search, tutor retrieval and
  sync views; its derived AI data (extracted text, chunks, embeddings, index entries, AI caches)
  is removed immediately and rebuilt by reprocessing if the user restores it within 30 days; the
  original, rendition and thumbnails are kept for those 30 days and do not count toward the
  quota. **Permanent erasure** happens after 30 days, on "Delete permanently", or on account
  deletion: every remaining artifact is purged within 24 h. Tutor citations render "Source
  deleted"; notes keep their quoted text but lose the link. An audit event without content is
  retained.
- **FR-KNO-012 (P0) Upload progress.** Resumable chunked uploads (TUS-compatible) that survive
  backgrounding and flaky networks; multi-file queue with per-file progress, pause, retry and
  cancel; a completion notification only when processing took > 30 s and the app is backgrounded.
- **FR-KNO-013 (P1) Offline.** Recently opened and pinned ("Available offline") documents cached
  (LRU, default cap 1 GB, configurable); offline viewing, highlights and notes sync later.
- **FR-KNO-014 (P0) Storage quota.** Used / available, per-subject breakdown, largest files;
  in-app notice at 80%.
- **FR-KNO-015 (P2, Ph4) Saved links.** Save a web or YouTube URL as a resource (title, notes,
  subject); fetch only page metadata.

### Acceptance criteria
- The fixture corpus (`10` §6) processes to Ready or Partial for ≥ 98% of files (designed-to-fail
  files excepted).
- Search returns the gold page in the top 5 for ≥ 90% of fixture queries.
- A deletion test queries every derived table and bucket and finds nothing.
- Share-to-Studex from WhatsApp works on Android and iOS (manual QA, recorded).
- No file can execute code: PDF JavaScript is never executed in the viewer and is stripped from
  renditions.

### Out of scope
Handwriting recognition beyond best effort in Ph3. Real-time collaborative note editing.


---

# 03 — Functional Requirements: Intelligence (M09–M14, M17)

AI features MUST obey `06-architecture.md` §8 (AI architecture) and the AI rules in
`07-nfr-compliance.md` §3.3. All model IDs come from server configuration, never code.
**No Anthropic/Claude API anywhere in the product** (CLAUDE.md hard rule).

---

## M09 — AI Tutor (`TUT`)

**Objective.** A tutor that answers from the student's own material, cites pages, admits when
something is not in their notes, and turns understanding into practice.
**Phase.** Ph4. **Owners.** WS-AI (retrieval, generation, evals), WS-APP (UI).

### Requirements

- **FR-TUT-001 (P0) Entry points.** Tutor tab; subject workspace ("Ask about {subject}");
  document selection ("Ask tutor about this"); topic page; exam page ("Prep for {exam}").
- **FR-TUT-002 (P0) Scope.** All my materials · This subject · Selected documents · This unit or
  topic · This exam's scope. Shown as a chip on the thread; changeable mid-thread (applies to the
  next answer).
- **FR-TUT-003 (P0) Grounded answers.** Retrieval over the user's indexed material within scope
  (hybrid retrieval + rerank, `06` §8.3). Every claim drawn from material carries a citation
  `[Title · p.N]` that opens the viewer at that page with the passage highlighted.
- **FR-TUT-004 (P0) Not-found honesty.** Without sufficient support the answer starts "I couldn't
  find this in your materials." It MAY continue with a block labeled "General explanation (not
  from your materials)". General knowledge is never cited.
- **FR-TUT-005 (P0) Citation validator.** Server-side, before the answer is finalized: every
  citation must reference a chunk that was in that answer's retrieved context, and every shown
  quote must match the chunk text after normalization. Invalid citations are removed and the
  event is logged for evals.
- **FR-TUT-006 (P0) Modes.** Ask · Explain (Simple / Exam-ready / Deep) · Summarize (document,
  page range, unit, topic; short or detailed) · Solve step by step (LaTeX-rendered math, working
  shown) · Quiz me (→ M12) · Make flashcards (→ M12) · Exam prep (→ M10/M11).
- **FR-TUT-007 (P0) Threads.** Auto titles (editable); follow-ups use recent turns plus a rolling
  summary; regenerate; stop; copy; "Save as note" (citations kept as links); delete; search.
- **FR-TUT-008 (P0) Streaming and latency.** First token ≤ 2.5 s p75; full standard answer
  ≤ 12 s p75.
- **FR-TUT-009 (P0) Feedback and reporting.** Thumbs up/down with an optional reason (wrong · not
  from my notes · unclear · harmful); "Report" on any AI output → moderation queue (M20). This
  also satisfies Google Play's AI-generated content reporting requirement.
- **FR-TUT-010 (P0) Language.** Replies in the language of the question (English, Hindi, or
  Hinglish in Latin script) where the model supports it; UI stays in the app locale.
- **FR-TUT-011 (P0) Safety.** Refuses harmful requests. On self-harm or crisis signals: responds
  with care, shows **Tele-MANAS 14416 / 1-800-891-4416 (free, 24×7)**, encourages reaching out to
  someone they trust; never diagnoses; records only a content-free safety flag for aggregate
  monitoring.
- **FR-TUT-012 (P0) Academic integrity default — "Learning mode".** Explains, hints, works
  examples, gives full solutions to practice problems. For content the user labels as a graded
  assignment, it guides with hints first and shows a full solution only on an explicit second
  request. Never lectures or moralizes. (Policy confirmable by Ohm — `11` §2.)
- **FR-TUT-013 (P0) Quotas.** Per-plan limits (messages/day; long-context actions/day).
  Remaining count appears in the composer below 20%. At the limit: a clear message with the reset
  time. Never silently downgrade quality.
- **FR-TUT-014 (P0) Privacy.** User content is never used to train models (`07` §3.3). Threads
  are deletable. Document deletion cascades (citations show "Source deleted").
- **FR-TUT-015 (P0) Offline.** "Tutor needs internet. Your notes and files are still here." No
  queued questions.
- **FR-TUT-016 (P1) "What I used".** Per-answer disclosure of scope and the documents/pages
  retrieved.
- **FR-TUT-017 (P0) Prompt-injection resistance.** Retrieved text is untrusted data. Instructions
  inside documents are never followed. The model has no tool that can reach other users' data.
  Retrieval is filtered by `user_id` in SQL, never by the model.
- **FR-TUT-018 (P1) Image questions.** Attach a photo of a problem or diagram → vision model
  answer; the image lives in the thread and is deleted with it.

### Acceptance criteria
Eval gates in `10` §7 pass (retrieval recall@8 ≥ 0.90 · citation precision ≥ 0.90 · unanswerable
handling ≥ 0.90 · injection resistance 100% · faithfulness ≥ 0.90) · a validator test proves no
answer can display a citation outside its retrieved set · safety prompts produce the helpline
response · quotas enforced server-side · offline state rendered.

### Out of scope
Voice tutor (P2) · live web browsing (P2) · tutoring over other users' documents (except
class-space resources in Ph5, explicitly scoped).

---

## M10 — Exams & Exam Intelligence (`EXM`)

**Objective.** Turn "exam in 9 days, huge syllabus, folder of PYQs" into a clear, honest plan.
**Phase.** Ph2 (exam records) · Ph3 (import) · Ph4 (intelligence). **Owners.** WS-APP, WS-AI,
WS-CORE.

### Requirements

- **FR-EXM-001 (P0, Ph2) Exams.** Subject, type (internal assessment / CIA — IA-1, IA-2… ·
  mid-semester · end-semester / SEE · practical / lab · viva · quiz · assignment-based ·
  supplementary / backlog), title, date and start time, duration, venue, seat number, max marks,
  weightage %, notes.
- **FR-EXM-002 (P0, Ph2) Scope.** Units/topics or "Whole syllabus". Scope drives readiness, the
  planner and tutor exam prep.
- **FR-EXM-003 (P0, Ph2) Surfaces and reminders.** Today card ≤ 14 days out, calendar, subject
  workspace; reminders 7 days, 1 day and the morning of (configurable).
- **FR-EXM-004 (P1, Ph3) Exam timetable import.** PDF/photo → M17 → confirm → exams created for
  matched subjects (code, then name); unmatched rows mapped manually.
- **FR-EXM-005 (P0, Ph4) Readiness.** Formula below; shown only when a scope exists; always with
  an explanation and the weakest topics; "How is this calculated?" disclosure.
- **FR-EXM-006 (P0, Ph4) PYQ analyzer.** Upload past papers → M17 extracts questions (number,
  sub-parts, text, marks, year, exam type) → confirm → map each question to topics (AI
  suggestion + user confirmation) → analytics: frequency per unit/topic, share of marks,
  repeated questions across years (near-duplicate detection), question-type mix. Labeled
  "Patterns from past papers, not predictions". Every statistic links to its source papers.
- **FR-EXM-007 (P0, Ph4) Revision plan.** "Plan my revision" opens M11 with the exam scope and
  PYQ-weighted priorities prefilled.
- **FR-EXM-008 (P1, Ph4) Mock test.** Timed mock in the exam's pattern (sections, marks) from
  PYQs + materials (M12), labeled as practice.
- **FR-EXM-009 (P0, Ph2) Exam day.** Today shows the exam card (time, venue, seat); non-essential
  notifications suppressed in the 3 hours before (user-set reminders still fire); "Last-minute
  review" opens due flashcards for the scope.
- **FR-EXM-010 (P1, Ph4) After the exam.** One prompt to record marks (→ M14) and an optional
  reflection; skippable; never repeated.

**Readiness (normative).** For each topic *t* in scope:

- Self status *s<sub>t</sub>*: not started 0 · learning 0.33 · revised 0.67 · confident 1.0.
- Practice *q<sub>t</sub>*: recency-weighted accuracy of the last 10 responses on *t* (weights
  1.0 for the newest, decaying by 0.85 per step); undefined below 3 responses.
- Mastery *m<sub>t</sub>* = max(*s<sub>t</sub>*, *q<sub>t</sub>*) (or *s<sub>t</sub>* if
  *q<sub>t</sub>* undefined).
- Weight *w<sub>t</sub>* = (2 if priority high else 1) × (1 + *f<sub>t</sub>*), where
  *f<sub>t</sub>* ∈ [0, 1] is topic *t*'s PYQ marks share divided by the maximum share in scope
  (0 without PYQs).
- **Readiness = floor(100 × Σ *w<sub>t</sub>m<sub>t</sub>* / Σ *w<sub>t</sub>*)**, explained as
  "{k} of {n} topics revised or better · weakest: {topic} ({reason})".

### Acceptance criteria
Readiness golden tests (`10` §3.6) · PYQ statistics always traceable to source questions · exam
day mode suppresses only non-essential notifications (test).

---

## M11 — Study Planner & Focus (`PLN`)

**Objective.** A plan that fits real free time, adapts when life happens, and explains itself.
**Phase.** Ph4. **Owners.** WS-CORE (scheduler, pure), WS-APP.

### Requirements

- **FR-PLN-001 (P0) Availability.** Free time = term days − class occurrences (with 10-min
  buffers either side) − events − quiet hours (default 23:00–07:00), within study windows
  (default weekdays 17:00–22:00; weekends 10:00–13:00 and 16:00–21:00), under a daily cap
  (default 180 min weekdays, 300 min weekends), minus days off. All editable.
- **FR-PLN-002 (P0) Generate.** Goal = one exam, all upcoming exams, or a custom topic set with a
  target date. Deterministic algorithm below. Preview before applying with a summary ("21 blocks
  over 9 days · 14 h · covers 13 of 13 topics").
- **FR-PLN-003 (P0) Blocks.** On calendar and Today. Start (opens focus timer) · Done (actual
  minutes) · Skip · Move (drag on calendar or pick time) · Pin (fixed during replans).
- **FR-PLN-004 (P0) Replan.** Triggers: a block missed (end + 2 h without Done) or skipped, new
  tasks or exams, scope change, user request. Recomputes the future only; completed, past and
  pinned blocks are frozen. Shows a change summary ("Moved Eigenvalues to Thu because Tue's
  block was skipped.").
- **FR-PLN-005 (P0) Infeasibility honesty.** When demand exceeds capacity before an item's latest end (scheduler step 1):
  schedule by priority, state the shortfall ("Not enough time to cover 4 topics before DBMS IA-2
  — about 3 h short"), offer options (add time, widen windows, narrow scope). Never drop topics
  silently.
- **FR-PLN-006 (P0) Focus timer.** Pomodoro 25/5, long break 15 after 4 (configurable);
  timestamp-based so backgrounding is safe; local notification at the end; logs a study session
  (subject, topic, block, minutes); link to OS Do Not Disturb settings.
- **FR-PLN-007 (P0) Manual sessions.** Log, edit and delete study time after the fact.
- **FR-PLN-008 (P1) Plan health.** "2 blocks behind for DBMS IA-2" on the plan screen and subject
  workspace — pull only, never pushed.
- **FR-PLN-009 (P1) Spaced revision.** Optional 20-min revision blocks 3 days and 1 day before
  the exam for topics already studied.
- **FR-PLN-010 (P0) Explainability.** Each block shows its reason codes ("High PYQ frequency ·
  weak in quiz · exam in 4 days").

**Scheduler (normative; `packages/core/planner`; pure and deterministic):**

1. **Items.** Topic *t* in scope: remaining effort E = base(difficulty) × (1 − *m<sub>t</sub>*),
   base = easy 30 / medium 60 / hard 90 min (per-topic override allowed); drop items with
   E < 10. Open linked task: E = remaining estimate (default 60). Each item has due D (exam
   start or task due), latest end L (exam: D − 30 min, configurable; task: D; an all-day due date
   means 23:00 local) and importance I = (exam weightage ÷ 100, or task priority weight none
   0.5 / low 0.75 / medium 1 / high 1.5) × (1 + weakness), weakness = 1 − *m<sub>t</sub>* (tasks 0).
2. **Slots.** Free intervals (FR-PLN-001) from now (rounded up to 5 min) to max(L); discard slots
   < 25 min; hold back 10% of each day's cap as buffer.
3. **Fill.** Walk slots chronologically with a cursor. At the cursor pick, among items with
   remaining effort and L ≥ cursor + 25 min, the max S = I ÷ (days until D + 1); ties → earlier D
   → lexically smaller item id. Block = min(remaining E, preferred session (default 50), slot
   remaining, daily cap remaining, L − cursor), so a block may end exactly at L but never after it. Continue inside the slot while ≥ 25 min remain (5-min gap between blocks).
4. **Revision blocks** (FR-PLN-009) are inserted before step 3 as soft pins.
5. **Output** blocks with reason codes. Identical inputs (including "now") → identical output.
6. **Shortfall** = remaining effort of items whose L passes without full allocation → FR-PLN-005.

### Acceptance criteria
Golden plans for the seven fixture scenarios (`10` §3.4) · properties: no overlap with classes,
events or quiet hours; daily cap never exceeded; no block ends after its item's latest end L; determinism;
replans never alter completed, pinned or past blocks; shortfall reported if and only if capacity
< demand.

---

## M12 — Practice: Quizzes & Flashcards (`LRN`)

**Objective.** Convert material into retrieval practice that measurably improves mastery.
**Phase.** Ph4. **Owners.** WS-AI (generation), WS-CORE (FSRS), WS-APP.

### Requirements

- **FR-LRN-001 (P0) Quiz generation.** From scope (documents, page ranges, topics, PYQs);
  5–30 questions; types: MCQ single, MCQ multiple, true/false, numeric with tolerance, short
  answer; difficulty mix. Every question has a topic tag, difficulty, explanation and a citation
  to its source chunk (or "PYQ {year} Q{n}").
- **FR-LRN-002 (P0) Validation before display.** Schema-valid · exactly one correct option for
  single choice · distinct options · answer supported by the cited chunk (cheap-model check plus
  string heuristics) · no duplicate stems. Invalid items are regenerated (≤ 2 tries) or dropped;
  a quiz may be shorter, never broken.
- **FR-LRN-003 (P0) Taking a quiz.** One question per screen, optional timer, flag for review,
  submit, results with explanation and citation per question, retake. Already-generated quizzes
  work offline; results sync later.
- **FR-LRN-004 (P1) Short answers.** Self-graded by default (model answer shown; user marks right
  / partial / wrong). AI grading with a rubric is P2.
- **FR-LRN-005 (P0) Mastery.** Responses update topic practice accuracy (feeds M10 and M11).
- **FR-LRN-006 (P0) Flashcards.** Manual, from selection, or generated from scope (front/back,
  optional cloze, citation, topic); edit/delete; automatic deck per subject plus custom decks.
- **FR-LRN-007 (P0) Spaced repetition.** FSRS (`ts-fsrs`, MIT, or equivalent); ratings Again /
  Hard / Good / Easy; daily queue with counts; new-cards-per-day limit (default 20); offline
  reviews with an append-only review log.
- **FR-LRN-008 (P1) Import/export.** CSV in/out; Anki `.apkg` import P2.
- **FR-LRN-009 (P1) Mock exams.** Per FR-EXM-008.

### Acceptance criteria
Automated validation passes on 100% of displayed items · human spot check of 50 generated items
on fixture documents finds ≥ 95% correct and well-formed · FSRS scheduling matches the library's
reference vectors · offline reviews never lose or duplicate review logs after sync.

---

## M13 — Progress & Insights (`PRG`)

**Objective.** Show progress honestly, with data provenance, never as comparison or shame.
**Phase.** Ph1 (Break Mode, semester receipt) · Ph4 (insights). **Owners.** WS-APP, WS-CORE.

### Requirements

- **FR-PRG-001 (P0, Ph4) Attendance trends.** Per subject weekly %; bunks used vs budget.
- **FR-PRG-002 (P0, Ph4) Study.** Minutes per subject per week; sessions; blocks done vs planned.
- **FR-PRG-003 (P0, Ph4) Tasks.** On-time completion %; overdue trend.
- **FR-PRG-004 (P0, Ph4) Mastery map.** Per subject, units/topics colored by mastery with counts.
- **FR-PRG-005 (P1, Ph4) Weekly digest (opt-in, off by default).** Sunday in-app card (push only
  if opted in): numbers + one plan line, e.g. "This week: 18 classes · 2 Bunked, within budget
  · 6 h studied · 3 topics revised."
- **FR-PRG-006 (P0, Ph1) Break Mode.** Offered after 7+ consecutive no-class days or on
  user-set dates; streak and notifications freeze; Today reads "On break. See you {date}."; on
  return, offers New Semester (FR-ACA-010).
- **FR-PRG-007 (P0, Ph1) Semester receipt.** "Sem 4: 312 classes · 84% · 21 Bunked, all within
  budget" (plus study hours, topics, tasks when available) → shareable image, user-initiated only,
  containing no identifiers the user did not choose.
- **FR-PRG-008 (P0) Insight rules.** Every insight states its data window and source. No
  comparisons with other students, no leaderboards, no "you're falling behind" pushes.

---

## M14 — Results & GPA (`GPA`)

**Objective.** Marks, SGPA/CGPA and what-if planning with the student's own grading rules.
**Phase.** Ph4. **Owners.** WS-CORE (math), WS-APP.

### Requirements

- **FR-GPA-001 (P0) Grade scales.** Per term, from templates (default 10-point CBCS-style: O 10,
  A+ 9, A 8, B+ 7, B 6, C 5, P 4, F 0, Ab 0) or custom (letter, min %, max %, points).
  Institution templates are curated in M20.
- **FR-GPA-002 (P0) Assessment structure.** Per subject components with weightage (e.g. CIA 50 =
  IA-1 20 + IA-2 20 + assignments 10; SEE 50), max marks, scaling to weight; institution templates.
- **FR-GPA-003 (P0) Marks entry.** Per component (obtained / max); auto-filled from M10 when
  entered there.
- **FR-GPA-004 (P0) Computation.** Subject weighted %, grade, grade points. SGPA = Σ(credits ×
  points) ÷ Σ credits over graded subjects with credits > 0. CGPA = credit-weighted over terms;
  treatment of failed/backlog subjects follows the institution policy setting. Rounding policy
  configurable (default: half-up to 2 decimals).
- **FR-GPA-005 (P0) What-if.** "What do I need in SEE for an A?" → minimum marks or "Not reachable
  this time"; simulate grade changes on SGPA.
- **FR-GPA-006 (P1) Backlogs.** Track failed subjects and supplementary results; recompute per policy.
- **FR-GPA-007 (P0) Disclaimer and transparency.** "Your university's official result is final."
  and "How is this calculated?" on every GPA screen.

### Acceptance criteria
Golden tests for SGPA, CGPA and what-if including zero-credit and audit courses, absent grades,
and rounding (`10` §3.7).

---

## M17 — Extraction Service (`EXT`)

**Objective.** Turn messy institutional documents (timetables first) into structured data that
the student confirms. Silent wrongness is the enemy: a wrong timetable is a wrong denominator.
**Phase.** Ph1 (timetable) · Ph3 (syllabus, exam timetable, academic calendar, assignment) · Ph4
(PYQ, portal screenshot). **Owners.** WS-EXTRACT, WS-AI (shared gateway), WS-APP (confirm UIs).
**Required reading:** `extraction-lab/FINDINGS.md`, `BENCHMARK.md`, `VLM-VERDICT.md`,
`reference/v1/briefs/extract.md` §7.

### Requirements

- **FR-EXT-001 (P0) Typed contracts.** zod schemas in `packages/contracts` for `timetable`,
  `syllabus`, `exam_timetable`, `academic_calendar`, `pyq_paper`, `assignment_notice`,
  `portal_attendance`. The timetable contract MUST represent: schedule mode (weekly/day-order),
  period axis (index, start, end, label, is_break), slots (day or day-order, period indices,
  start, end, subject code/name, kind, room, alternate rooms per batch, faculty, batch or null,
  elective options, confidence, issues[], source cells with row/col spans), subject legend, and
  document metadata (institution, program, section, term, effective date). Batch-partitioned
  timetables (one row per batch) MUST be representable (VLM-VERDICT §6.4).
- **FR-EXT-002 (P0, Ph1) Timetable pipeline.** Normalize input (EXIF rotation, downscale to
  ≤ 2,000 px long side, PDF page render at 200 dpi) → **VLM on pixels**, single-shot, strict JSON
  schema (model chosen by spike S-4, ADR-009) → schema validation → domain validation and
  rejection (FR-EXT-003) → confidence and issue flags → optional second opinion (FR-EXT-005) →
  confirm UI. Send pixels, not OCR text (text-only inputs fail by silent row drift).
- **FR-EXT-003 (P0) Validation and rejection rules.** Each failure flags or rejects; none is silent.
  1. Distinct-day count matches the grid's day axis; a fully empty weekday while others are
     populated → flag "Is {day} really free?".
  2. Periods strictly increasing, non-overlapping, within 06:00–21:00 (else flag); merged-cell
     spans equal the covered periods; a slot's start/end equal its first period start / last
     period end. Duration comes from geometry, never from de-duplicated text.
  3. Row colspan sums equal the header width whenever source cells are reported.
  4. Subject codes snap to the document's own legend/roster (normalized edit distance ≤ 1);
     unknown codes flagged.
  5. Rooms match a room pattern seen elsewhere in the document or a known campus pattern; slot
     codes (e.g. VIT "L31") are never accepted as rooms.
  6. Split rooms without a resolvable batch → `ambiguousBatch` flag. A batch is never guessed.
  7. Overlapping slots for the same batch → flag.
  8. Slot count within ±15% of the detected grid's cell count, else flag "We may have missed
     some classes".
  9. Domain plausibility: reject non-timetables (no weekday tokens, currency amounts, fee tables)
     with "This doesn't look like a timetable".
  10. Contact-hour labels → kind `contact_hour`.
- **FR-EXT-004 (P0) Confidence.** Every slot has confidence ∈ [0, 1] and `issues[]`. Confidence
  < 0.8 or any issue → "Check these".
- **FR-EXT-005 (P1) Second opinion.** For flagged results, run an alternate engine (Apple Vision
  table recognition via a native module on iOS; PaddleOCR PP-Structure on the server) and turn
  disagreements into flags.
- **FR-EXT-006 (P0) Gates.** Per `10` §5: RUAS keyF1 ≥ 0.90, kindAcc ≥ 0.90, roomAcc ≥ 0.85,
  batch wrong = 0 (inherited unchanged); each additional fixture: strict per-cell placement
  ≥ 0.90, batch wrong = 0, silent-error rate ≤ 2%. Agents never lower a gate.
- **FR-EXT-007 (P0) Privacy.** Source images/PDFs are deleted within 24 h of job completion
  unless the user opts in to "Help improve scanning" (explicit, revocable consent; retained
  ≤ 180 days; visible only to admins in M20; deletable on request).
- **FR-EXT-008 (P0) Access.** Signed-in users and guests (anonymous install token). Defaults:
  10 extractions/day/device, 30/day/IP, payload ≤ 15 MB, bot challenge on web.
- **FR-EXT-009 (P0) Cost and latency.** p75 ≤ 10 s per timetable page. Cost logged per job.
  Global daily budget kill-switch → "Scanning is busy right now — type it in, or try again later."
- **FR-EXT-010 (P0, Ph3) Syllabus.** Units (number, title, hours if printed) and topics (title,
  order), course code/name/credits if present. Every unit and topic string must appear in the
  source text (fuzzy match ≥ 0.9): no invented topics. Tree-editing confirm UI.
- **FR-EXT-011 (P1, Ph3) Exam timetable, academic calendar, assignment notice.** Per contracts,
  same confirm principle.
- **FR-EXT-012 (P0, Ph4) PYQ papers.** Questions with number/sub-part, text (LaTeX for math),
  marks, choice groups ("Answer any 5"), year and exam metadata; flag when the marks total does
  not match the printed total.
- **FR-EXT-013 (P2, Ph4) Portal attendance screenshot.** Subject codes/names, attended, held, % →
  reconciliation UI (FR-ATT-014).
- **FR-EXT-014 (P0) Observability.** Per job: type, engine, model version, latency, cost,
  validation flags, number of user edits after confirm (the acceptance metric), outcome.
- **FR-EXT-015 (P1, Ph1) Slot-code timetables (FFCS style, e.g. VIT).** Some institutions
  publish a blank grid of slot codes (A1, TA1, L31…) and each student registers courses into
  slots. Flow: extract the template grid (slot code → day + periods; theory vs lab axes kept
  distinct) → the student enters their courses with slot codes ("CSE1001 · A1+TA1") or imports
  their registration slip → Studex generates class slots. A blank template MUST never produce
  invented subject slots; slot codes are never treated as rooms.

### Acceptance criteria
Gates green in CI against recorded model outputs and green in the nightly live run · every
rejection rule has a unit test with a crafted failing input · the confirm UI shows every flag ·
manual entry is reachable from every failure state.


---

# 04 — Functional Requirements: Platform (M15, M16, M18–M23)

---

## M15 — Notifications & Reminders (`NTF`)

**Objective.** Timely information at the right moment, never judgment, never noise.
**Phase.** Ph1 (daily pair, permissions, scheduling) · Ph2+ (categories). **Owners.** WS-APP,
WS-DATA (push).

### Requirements

- **FR-NTF-001 (P0, Ph1) Policy.** Notifications carry information, never judgment. They never
  mention attendance status or thresholds, streaks, or being behind on a plan. No marketing
  unless the user opts in.
- **FR-NTF-002 (P0, Ph1) First class.** 20 min before the first class of each class day: "First
  up: {subject} at {time}, {room}." (room omitted when unknown). Default on.
- **FR-NTF-003 (P0, Ph1) End-of-day summary.** 30 min after the last class, only if today has
  unmarked occurrences: "{n} classes from today left to mark." Tapping opens Today with the
  end-of-day sweep focused (no blind bulk action from the lock screen). Automatically cancelled
  once today is fully marked. Default on.
- **FR-NTF-004 (P1, Ph1) Per-class reminders (opt-in, off by default).** "{subject} in {minutes}
  min" / "{time} · Room {room}" with actions Attended / Bunked (marks directly; undo in app).
- **FR-NTF-005 (P0, Ph2) Tasks** per FR-TASK-006. **FR-NTF-006 (P0, Ph2) Exams** per
  FR-EXM-003. **FR-NTF-007 (P1, Ph4) Study block start** (opt-in). **FR-NTF-008 (P0, Ph3)
  Document ready** (only if processing took > 30 s and the app is backgrounded). 
  **FR-NTF-009 (P1, Ph5) Class spaces** (opt-in per space).
- **FR-NTF-010 (P0, Ph1) Silence rules.** Nothing during a class occurrence; quiet hours default
  23:00–07:00; holidays, breaks and exam-day windows silence class notifications; at most 4
  system-initiated notifications per day (reminders the user scheduled do not count); multiple
  notifications of one category collapse into one.
- **FR-NTF-011 (P0, Ph1) Permission.** In-context pre-permission sheet before the OS prompt
  (after the onboarding commit or the first toggle). Proposed copy (**new copy — needs Ohm's
  approval**; copy.md's per-class pre-prompt no longer matches the policy): "Before your first
  class, and once after your last if anything's unmarked. No streak nags, no marketing. Ever."
- **FR-NTF-012 (P0, Ph1) Local scheduling.** Schedule-derived notifications are local and cover a
  rolling 7-day window (iOS caps pending local notifications at 64). Reschedule on: app open,
  timetable/holiday/break change, marking (cancel today's summary), timezone change, settings
  change.
- **FR-NTF-013 (P0, Ph1) Channels and deep links.** Android channels per category (Classes,
  Reminders, Exams, Study, Library, Spaces, Account); iOS categories with actions; every
  notification deep-links to the exact screen.
- **FR-NTF-014 (P0, Ph2) Remote push.** Device registration (token, platform, app version),
  refresh, invalid-token cleanup. Lock-screen content is minimal by default (no document names or
  personal details unless the user turns on detailed previews).
- **FR-NTF-015 (P1, Ph2) Inbox.** In-app list of the last 30 days of notifications.

### Acceptance criteria
Unit tests for the rolling window, cancellation, quiet hours, class silence and the daily cap · a
template test asserts no notification text mentions attendance status, thresholds or streaks ·
manual QA on iOS and Android (lock screen, actions, deep links) recorded with screenshots.

---

## M16 — Search (`SRCH`)

**Objective.** Find anything in the student's academic life in seconds.
**Phase.** Ph2 (entities) · Ph3 (documents). **Owners.** WS-DOCS (server), WS-APP (client).

### Requirements

- **FR-SRCH-001 (P0) Entry.** Search field on Subjects, Plan and Library; a global search
  screen; Cmd/Ctrl+K palette on web.
- **FR-SRCH-002 (P0) Scope.** Subjects, topics, tasks, exams, notes, events, documents
  (filename, content, semantic), tutor threads, flashcards.
- **FR-SRCH-003 (P0) Local + server.** Synced entities searched locally (SQLite FTS5), also
  offline. Document content and semantic search on the server. Results merged and grouped by
  type with counts.
- **FR-SRCH-004 (P0) Ranking.** Per-type relevance plus recency. Documents: full-text rank and
  vector similarity fused by reciprocal rank fusion (k = 60).
- **FR-SRCH-005 (P0) Speed.** Local results ≤ 100 ms after a 150 ms debounce; server results
  p75 ≤ 800 ms.
- **FR-SRCH-006 (P1) History.** Recent searches (local only, clearable) and suggestions.
- **FR-SRCH-007 (P1) Query understanding.** "eigenvalue notes from unit 2" → filters extracted by
  rules first (LLM optional, P2).

### Acceptance criteria
Search eval set of ≥ 40 queries over fixture data: top-5 hit rate ≥ 0.90 for documents and
≥ 0.95 for entities (`10` §6).

---

## M18 — Class Spaces & Communities (`COM`)

**Objective.** Share what classmates already share in WhatsApp — timetables, files, announcements —
with structure, without exposing anyone's private data.
**Phase.** Ph5. **Owners.** WS-APP, WS-DATA, WS-DOCS.

### Requirements

- **FR-COM-001 (P0) Class space.** Private group for a section (institution, program,
  department, year, section, term label). Creator becomes `space_moderator`. Join by invite link,
  QR or code; optional approval; default cap 200 members; leave any time.
- **FR-COM-002 (P0) Shared timetable template.** A moderator publishes slots (never attendance).
  Members can onboard from it (FR-ONB-012) and receive updates as "Timetable updated by {name}: 2
  changes — review" → diff → apply from a date (versioned). Never auto-applied.
- **FR-COM-003 (P0) Shared resources.** Members share library files into the space (a copy, not
  a link to the private document; the uploader can unshare). Organized per catalog-linked
  subject with tags and upvotes; "Save to my library". Reuses the processing pipeline; duplicates
  collapse to one canonical copy by hash.
- **FR-COM-004 (P0) Announcements.** Moderators post short announcements (text + attachment);
  members notified per their space setting.
- **FR-COM-005 (P1) Q&A.** Questions and answers per subject, accepted answer. P2: tutor answers
  from space resources with citations (scope = space).
- **FR-COM-006 (P0) Moderation.** Report content or users with reasons; block users (hides their
  content for the blocker); moderators remove or hide; automatic filters (profanity lists for
  English/Hindi/Hinglish, NSFW image classification on upload, spam rate limits); escalation to
  the Studex moderation queue (M20); repeat-offender bans.
- **FR-COM-007 (P0) Legal.** Intermediary due diligence under the IT Rules, 2021: published
  community rules and privacy policy, grievance officer contact in app, acknowledgment and
  resolution within the prescribed timelines, handling of lawful takedown orders, a copyright
  complaint process. Uploaders attest they have the right to share. No paid or copyrighted
  textbooks (rules plus takedown). Final legal text is human-only (`09` §8).
- **FR-COM-008 (P0) Privacy.** Attendance, grades, notes and private files are never visible to
  a space. Member profile = display name, avatar, optional role (e.g. CR). No public profiles.
  Leaving removes membership; shared files stay unless the uploader removes them (stated at
  leave time).
- **FR-COM-009 (P0) Eligibility.** Account required; 18+ only. Verified parental consent
  (FR-SET-009) does not enable communities for minors; not available to guests.
- **FR-COM-010 (P0) Anti-patterns.** No leaderboards, no attendance comparisons, no public feeds,
  no direct messages in v1.
- **FR-COM-011 (P2, HUMAN-GATED) Institution-verified spaces.** Verification by institutional
  email requires an email sender → human-gated (`09` §8).

### Acceptance criteria
Membership RLS tests · moderation E2E (report → queue → action → reporter informed in app) ·
copyright takedown runbook exists · rate-limit and spam tests.

---

## M19 — Settings, Privacy & Data Rights (`SET`)

**Objective.** Full control over data and behavior; DPDP-aligned rights that actually work.
**Phase.** Ph1 (local settings) · Ph2 (account, privacy center, rights). **Owners.** WS-APP, WS-DATA.

### Requirements

- **FR-SET-001 (P0, Ph1) Settings.** Semester (dates, holidays, breaks, schedule mode, batch) ·
  Attendance (threshold, rounding, eligibility basis, Excused policy, units, contact hours) ·
  Timetable (edit, re-scan) · Notifications (per category, lead times, quiet hours) · Appearance
  (system/light/dark, haptics on/off; OS Reduce Motion respected) · Data (export, erase) · About
  (version, open-source licenses).
- **FR-SET-002 (P0, Ph2) Account.** Profile, sign-in methods, sessions, sign out, delete account.
- **FR-SET-003 (P0, Ph2) Privacy center.** Plain-language summary of what is stored on the device
  vs in the cloud; list of processors; consent toggles, each asked with equal-weight Allow / Don't
  allow and off until chosen: product analytics; AI processing (before first AI use: what is sent
  to AI providers and that it is not used for training); "Help improve scanning" (FR-EXT-007).
  Crash reporting is part of the service, PII-scrubbed and disclosed.
- **FR-SET-004 (P0) Export.** Guests (Ph1): local JSON export via the share sheet. Signed-in
  (Ph2): async job → in-app download of a ZIP (JSON of all records + original files) via a signed
  URL valid 24 h; push when ready.
- **FR-SET-005 (P0, Ph1) Erase everything (this device).** Guests: wipes device data.
  Signed-in: wipes the device copy only, explains cloud data remains, and links to Delete account.
- **FR-SET-006 (P0, Ph2) Delete account.** In the app and on a web page (Google Play requires a
  web deletion path). Confirmation lists what is deleted. Immediate sign-out everywhere;
  permanent deletion within 30 days; cancellable by signing in within 7 days (stated clearly).
  Covers database rows, storage objects, embeddings, analytics person data, crash-report user
  data and push tokens; a minimal tombstone (hashed user ID, deletion time) is retained for
  audit. Class-space contributions: delete (default) or anonymize, user's choice.
- **FR-SET-007 (P0, Ph2) Rights.** Access (export), correction (edit in app), erasure (delete),
  grievance (in-app form → support queue with the SLA in `07` §3), nomination (P1: nominate a
  person to exercise rights on death or incapacity).
- **FR-SET-008 (P0, Ph2) Legal surfaces.** Privacy policy, terms, community rules (Ph5),
  grievance officer contact, licenses. Final text is human-only; agents ship surfaces with
  placeholder text marked "DRAFT — not legal advice".
- **FR-SET-009 (P0, before public launch) Verifiable parental consent.** For under-18 users per
  the DPDP Rules: parent/guardian identity and age verification (method chosen with counsel),
  consent record, withdrawal. Minors get no product analytics, no behavioral monitoring, no
  communities, and nothing targeted.
- **FR-SET-010 (P1, Ph2) App lock.** Optional biometric/PIN lock (local).
- **FR-SET-011 (P0, Ph2) Consent records.** Purpose, notice version, timestamp, channel;
  withdrawing is as easy as granting (same screen).

### Acceptance criteria
Export contains every user-owned table (schema-driven test) · deletion test proves removal from
every table, bucket, vector index and third-party processor API call made · consent changes take
effect immediately (analytics stops on withdrawal; test) · minors' accounts cannot emit
analytics events (test).

---

## M20 — Admin, Support & Institution Console (`ADM`)

**Objective.** Operate Studex safely: support without snooping, moderation, catalog curation,
cost control.
**Phase.** Ph2 (support basics, flags, catalog) · Ph3–Ph5 (pipeline, moderation, institutions).
**Owners.** WS-DATA, WS-PLATFORM.

### Requirements

- **FR-ADM-001 (P0, Ph2) Separate admin app.** `apps/admin`, web only, never bundled with the
  student app. Role + TOTP MFA required. Every action audit-logged (actor, action, target,
  before/after summary, reason, time). Optional IP allowlist.
- **FR-ADM-002 (P0, Ph2) Support lookup.** By user ID or exact email. Metadata only: created,
  plan, devices, app versions, sync health, recent errors, quotas, consents. No content
  (documents, notes, tutor messages, attendance details).
- **FR-ADM-003 (P1, Ph2) Diagnostic access.** User-granted, 24 h, scoped to a ticket (e.g. "sync
  state + timetable"), auto-expiring, audit-logged.
- **FR-ADM-004 (P0, Ph2) Feedback inbox.** In-app "Send feedback / Report a bug" (text, optional
  screenshot, optional diagnostics bundle) → ticket queue; replies appear in the app's support
  inbox. No email.
- **FR-ADM-005 (P0, Ph4) Moderation queue.** AI-output reports, community reports (Ph5),
  consented extraction samples; actions require a reason.
- **FR-ADM-006 (P0, Ph2) Feature flags and kill switches.** Per feature (every AI feature and
  extraction has one), plan, % rollout, platform and app version; audit-logged; clients refresh at
  start and every 30 min.
- **FR-ADM-007 (P0, Ph4) AI cost and quality.** Spend by feature/model/day, per-user
  distribution, quota hits, eval scores over time, thumbs ratio, report rate.
- **FR-ADM-008 (P0, Ph3) Pipeline monitor.** Queue depth, latency percentiles, failure reasons,
  retry and dead-letter actions per job (no content shown).
- **FR-ADM-009 (P0, Ph2) Institution catalog.** Institutions, campuses, programs, departments:
  dedupe/merge, aliases, verification, review of user-submitted entries; curation of holiday
  lists, academic calendars, grade-scale and assessment templates.
- **FR-ADM-010 (P1, Ph5) Institution admin portal.** Verified staff manage official data for
  their institution only (calendar, holidays, course catalog, official timetable templates).
  Never any student data.
- **FR-ADM-011 (P0, Ph2) Incident tooling.** Maintenance banner flag, forced-update flag
  (minimum supported app version), status data for a status page.

### Acceptance criteria
Admin endpoints reject non-admin and non-MFA sessions (tests) · every admin mutation produces an
audit row (test) · support views provably cannot fetch content tables (RLS + endpoint tests).

---

## M21 — Monetization & Entitlements (`BIL`)

**Objective.** Sustainable revenue without compromising the free daily loop or trust.
**Phase.** Ph2 (entitlements, quotas) · Ph6 (payments). **Owners.** WS-DATA, WS-APP.

### Requirements

- **FR-BIL-001 (P0, Ph2) Entitlements.** Server-authoritative plan per user (free / pro /
  trial) and quotas (AI messages/day, long AI actions/day, storage bytes, documents
  processed/month, quizzes/day, extractions/day), enforced in the API, shown in the client,
  configurable without a deploy.
- **FR-BIL-002 (P0) Never paywalled.** Attendance loop, timetable, tasks, calendar, notes, data
  export, account deletion, safety features.
- **FR-BIL-003 (P0, Ph6) Plans and pricing.** Set by Ohm (the old pitch's ₹250/month is
  unvalidated). INR including GST; monthly and per-semester plans; 7-day trial.
- **FR-BIL-004 (P0, Ph6) Purchases.** Store billing on iOS/Android for in-app digital
  subscriptions; web via an Indian payment provider with UPI (chosen by Ohm); cross-platform
  entitlement sync (ADR-019); restore purchases; server-side receipt validation; refunds per store
  policy; easy cancellation.
- **FR-BIL-005 (P0, Ph6) Paywall UX.** Only at value moments (quota reached, Pro feature tapped);
  no pre-checked upsells, fake timers or hidden renewal terms; always dismissible.
- **FR-BIL-006 (P2, Ph6) Referrals.** Pro days as rewards, with abuse controls.
- **FR-BIL-007 (P2) Institution licensing.** Out of scope until Ohm decides.

---

## M22 — Platform Integrations (`PLT`)

**Objective.** Meet students where the habit already is: lock screen, home screen, share sheet,
browser.
**Phase.** Ph1 (deep links, PWA, widgets P1) · Ph2–Ph4. **Owners.** WS-APP.

### Requirements

- **FR-PLT-001 (P1, Ph1) iOS widgets.** Home screen small/medium (number + verdict + next class);
  lock screen accessory ("Next: Maths · 9:00 · Room 204"); tap-to-mark via App Intents
  (interactive widgets); shared data through an App Group; refreshed on mark and timetable change.
  Requires the paid Apple Developer account (README §4).
- **FR-PLT-002 (P1, Ph1) Android widget.** Next class + budget + mark actions; updates on change.
- **FR-PLT-003 (P0, Ph3) Share target.** Receive PDFs, images, Office files and WhatsApp export
  ZIPs (iOS share extension; Android intent filters) → M08 import.
- **FR-PLT-004 (P1, Ph2) App shortcuts.** Long-press icon: Mark attendance, Scan, Add task, Ask tutor.
- **FR-PLT-005 (P2, Ph4) Voice shortcuts.** iOS App Shortcuts ("What's my number", "Can I bunk
  {subject}", "What's next") with the locked spoken copy; Android App Actions P2.
- **FR-PLT-006 (P0, Ph1) Deep links.** `studex://` plus universal/app links: `/today`,
  `/subjects/:id`, `/library/:docId?page=N`, `/tutor/:threadId`, `/plan/:date`. Every
  notification and citation uses them.
- **FR-PLT-007 (P0, Ph1) PWA.** Installable web app (manifest, icons, service worker for the
  static shell). iPhone users without TestFlight can use the daily loop on the web (online-first,
  M23).
- **FR-PLT-008 (P1, Ph2) Keyboard shortcuts (web).** `g t` Today, `g s` Subjects, `g p` Plan,
  `g l` Library, `g a` Tutor, `/` search, `c` create, `?` help.
- **FR-PLT-009 (P0) Sensory consistency.** Haptics map and Reduce Motion per `01` §10.

---

## M23 — Offline & Sync (`SYNC`)

**Objective.** The daily loop never waits for the network, and no change is ever lost.
**Phase.** Ph1 (local-first device DB) · Ph2 (cloud sync). **Owners.** WS-DATA, WS-APP.
Architecture in `06` §6.

### Requirements

- **FR-SYNC-001 (P0) Offline matrix.** Mobile offline: Today, marking, subjects, timetable,
  attendance calendar, settings (Ph1); tasks, notes, exams, events, flashcard reviews,
  already-generated quizzes, pinned documents (Ph2–Ph4). Online-only: tutor, generation,
  document processing, document-content search, communities, account operations.
- **FR-SYNC-002 (P0, Ph2) Status.** Subtle indicator (Profile, optional avatar dot): Synced ·
  Syncing · Offline — "Changes saved on this phone" · Error — "Couldn't sync. Retrying." (with
  details).
- **FR-SYNC-003 (P0) Durability.** A local write commits to SQLite before the UI acknowledges it;
  queued uploads survive app kill and reboot; retries back off exponentially (1 s → 5 min, with
  jitter); upload operations are idempotent.
- **FR-SYNC-004 (P0, Ph2) Conflicts.** Per `06` §6.3: attendance marks are keyed by occurrence,
  last writer wins by hybrid logical clock, and the losing value is kept in the audit log; tasks
  and events use field-level last-writer-wins; notes use document-level last-writer-wins plus a
  "(conflict copy)" when both sides edited offline in the same window; deletes win, and deleted
  items stay recoverable for 30 days in "Recently deleted".
- **FR-SYNC-005 (P0, Ph2) Convergence.** Two devices converge to identical state within one sync
  cycle after both are online.
- **FR-SYNC-006 (P0, Ph2) Web.** Same account on phone, web and tablet. Web is online-first with
  optimistic updates unless spike S-1 proves local-first web viable.
- **FR-SYNC-007 (P0, Ph1) Device migrations.** Versioned, forward-only, tested from every
  released schema version; never lose data; on failure, a recovery screen offers export.
- **FR-SYNC-008 (P0, Ph2) Recently deleted.** 30-day bin for subjects, tasks, notes, documents
  (a document's derived AI data is removed at once; its original is purged after 30 days —
  FR-KNO-011).
- **FR-SYNC-009 (P1, Ph3) Device storage.** Show local database and cache size; clear cache.
- **FR-SYNC-010 (P2) Background sync.** Best-effort OS background tasks.

### Acceptance criteria
Sync test matrix in `10` §8 passes, including: offline mark → kill → reopen → reconnect → server
row + audit event; concurrent offline edits on two devices converge; deletes propagate; every
historical device schema migrates; initial sync of a heavy user (5,000 rows) completes in ≤ 15 s
on 4G on the reference mid-tier Android device.


---

# 05 — Attendance Engine Specification (normative)

This is the most trust-critical code in Studex. A wrong number at detention-list time ends the
relationship with the student. Implement it once, in `packages/core/attendance`, as **pure,
deterministic, integer arithmetic**, and use it from every surface (app screens, widgets,
notifications, API, exports). No surface may re-derive any of these numbers.

Golden values in §8 were computed by script and cross-checked against a brute-force reference
over ≈ 1 million (attended, held, threshold) combinations. They are immutable unless this file
changes through a `spec:` PR.

---

## 1. Principles

1. **Marks are facts; schedules are predictions.** Held/attended come only from baselines and
   marks. Remaining-class forecasts come from the schedule.
2. **Unknown is not zero and not 100.** No percentage exists until something has been held.
3. **Never round toward safety.** Displayed values are floored; comparisons are exact integers.
4. **Every sentence is literally true.** "Stay above" and "reach" describe what happens if the
   student does exactly what the sentence says, starting now.
5. **One implementation, many surfaces.** Any divergence between two screens is a P0 bug.

## 2. Inputs and contributions

- **Threshold `T`** in basis points (integer, 0–10,000): 7,500 = 75.00%. Stored per term with
  per-subject overrides. UI range 50–95% in steps of 1; API accepts 0–10,000.
- **Units `u`** per occurrence: positive integer, default 1. A multi-period lab is **one**
  occurrence (v1 rule) unless the student sets lab units to the number of periods.
- **Baseline** per subject: `(Ab, Hb)` with 0 ≤ Ab ≤ Hb (catch-up, CSV, reconciliation) and a
  coverage date `asOf` (inclusive): the baseline already counts every occurrence from term start
  through `asOf`. Catch-up sets `asOf` to the day before the onboarding commit (also for "Start
  from today", with 0/0); a subject created later gets the day before its creation;
  reconciliation (FR-ATT-014) moves it to the screenshot date.
- **Policy:** `rounding ∈ {exact, half_up_integer}`, `basis ∈ {per_subject, overall, both}`,
  `excused` mapping (or disabled), contact-hour handling.

**Contribution of each occurrence to (attended, held):**

| State | Attended | Held | Notes |
|---|---|---|---|
| Unmarked (no record) | 0 | 0 | Default. Never auto-marked. Past unmarked = "unresolved". |
| Attended | u | u | |
| Bunked | 0 | u | LOCKED word. |
| Cancelled | 0 | 0 | Class did not happen. Allowed in advance for future occurrences. |
| Excused → `present` | u | u | Typical for on-duty (OD). |
| Excused → `excluded` | 0 | 0 | Typical for medical leave. |
| Excused → `absent` | 0 | u | |

Contact hours: excluded from forward counts and unmarked by default; once marked they contribute
like any class.

**Tally:** `A = Ab + Σ attended`, `H = Hb + Σ held` over the subject's marks **dated after
`asOf`**. Marks dated on or before `asOf` are ignored: the baseline already contains those days,
and counting them again would double-count (a 30/40 baseline plus a Bunked mark for a covered day
must stay 30/40, not become 30/41). Invariant 0 ≤ A ≤ H (violations are data errors → reject the
write).
**Overall tally:** `A_o = Σ A_s`, `H_o = Σ H_s` over the term's active subjects with
`counts_in_overall = true` (default true; audit courses may be excluded). **Never** average
subject percentages: subjects (18/20, 1/5) are 19/25 = 76% overall, not 55%.

## 3. Occurrences and the remaining horizon

- `occurrences(slot, from, to, calendar)` returns dates in [from, to] where the slot version is
  valid, the weekday matches (weekly mode) or the day-order index matches (day-order mode), week
  parity matches (if set), the date is not a holiday or break, and no exception cancels it;
  plus one-off extra classes. Dates are local dates in the term timezone.
- **Day-order mode:** working days = term dates on the term's `working_weekdays` (default Mon–Fri
  for day-order terms; configurable) that are not holidays or breaks. The k-th working day
  (0-based from the anchor date) has order `((k + anchorOffset) mod N) + 1`. An override "date d
  follows order x" re-anchors so that the next working day is `(x mod N) + 1`.
- **Upcoming occurrences** for a subject at instant `now`: occurrences whose start instant (term
  timezone) is **after `now`**, up to the term end date inclusive, excluding contact hours and
  occurrences already marked Cancelled. Today's later classes count as upcoming (fix for v1
  defect D6).
- `R` = number of upcoming occurrences (and `R_u` = their total units). If the term has no end
  date, `R` is unknown: no caps apply and term-end forecasts are hidden ("Add your last day to see
  semester forecasts").
- Past occurrences dated after the baseline `asOf` without a mark are excluded from A, H and R
  and surface as "unresolved". Occurrences on or before `asOf` are covered by the baseline: never
  unresolved and never markable ("Covered by your catch-up numbers — edit those instead").

## 4. Eligibility predicate

- `H = 0` → **no standing** ("not started"): no percentage, no band, no eligibility.
- `exact` (default): **eligible ⇔ 10,000·A ≥ T·H**.
- `half_up_integer` (colleges that round): `P = floor((200·A + H) / (2·H))` (100·A/H rounded half
  up); **eligible ⇔ 100·P ≥ T**.

Example: T = 6,667 (66.67%), A = 2, H = 3 → 20,000 < 20,001 → **not eligible** (66.666…% <
66.67%).

## 5. Display rules

- Compact surfaces: integer `floor(100·A / H)`. Detail surfaces: one decimal,
  `floor(1000·A / H) / 10`. **Never round up.** Under `half_up_integer`, show the
  college-rounded integer `P` with the disclosure "Rounded as per your college's rule."
- Threshold text: `T / 100` without trailing zeros ("75", "66.67").
- **Guarantee (property-tested):** under `exact`, with an integer-percent threshold, a student
  who is not eligible never sees a displayed value ≥ the threshold.
- Fraction disclosure on every percentage: "{A} of {H} attended". If any unit weight ≠ 1 in the
  tally, append "(counted in periods)".
- `H = 0`: compact "—"; sentence "No classes yet."

## 6. Budgets, recovery and forecasts

All budget functions have a **reference definition by simulation** over the chronologically
ordered upcoming occurrences with their units. Closed forms are optimizations valid only when
every unit is 1 and the policy is `exact`; property tests assert they equal the simulation.

### 6.1 Safe-now bunk budget `k` (primary)
Largest k ≥ 0 such that bunking the next k upcoming occurrences keeps the student eligible after
each one (H += uᵢ per bunk). Capped at R when R is known. If not eligible, k = 0.
Closed form (u = 1, exact): **k = floor((10,000·A − T·H) / T)**, then min(k, R).
Sentence (ABOVE): "You can bunk {k} more and stay above {T}%."

### 6.2 Recovery `n` (primary when below)
Smallest n ≥ 1 such that attending the next n upcoming occurrences (A += uᵢ, H += uᵢ) makes
the student eligible. Closed form (u = 1, exact, T < 10,000): **n = ceil((T·H − 10,000·A) /
(10,000 − T))**. If T = 10,000 and A < H, or n > R (R known) → unreachable (§6.4).
Sentence (BELOW): "Attend the next {n} to reach {T}%." The number decrements by one with each
attended class (the live countdown in psych §5).

### 6.3 Term-end forecast (secondary; forecast panel only)
Assuming the student attends every upcoming occurrence except s of them:
**s_max = floor((10,000·(A + R) − T·(H + R)) / 10,000)**, clipped to [0, R] (u = 1; with
mixed units, express in units/periods). Lines:
"To finish the semester at {T}%, attend at least {R − s_max} of the remaining {R}." and
"You can miss up to {s_max} of them." If the raw value is negative, the term-end target is
unreachable → §6.4.

### 6.4 Honest impossibility (copy approved in psych.md)
"{T}% isn't reachable this sem. Max possible: {floor(100·(A + R) / (H + R))}%. Each class raises it."

### 6.5 Not started (H = 0)
"No classes yet." If R is known, forecast panel: "You can miss up to {floor((10,000 − T)·R /
10,000)} of the {R} classes this sem." (**new copy — needs Ohm's approval**).

### 6.6 Bands and sentences
- **Copy band** (from copy.md conventions): ABOVE = eligible ∧ k ≥ 1 · CLOSE = eligible ∧ k = 0
  · BELOW = not eligible.
- **Color band** (separate axis): good = eligible ∧ (100·A/H ≥ T/100 + 6) ∧ k ≥ 1 · close =
  other eligible · below = not eligible. The 6-point margin is the constant
  `CLOSE_MARGIN_BP = 600`, declared once in the engine.

| Surface | ABOVE | CLOSE | BELOW |
|---|---|---|---|
| Today header (`today.verdict.*`) | You're at {p}%. You can bunk {k} more and stay above {T}%. | You're at {p}%. One bunk puts you under {T}%. | You're at {p}%. Attend the next {n} to reach {T}%. |
| Subject detail (`detail.status.*`) | {p}%. You can bunk {k} more and stay above {T}%. | {p}%. One bunk puts you under {T}%. | {p}%. Attend the next {n} to reach {T}%. |
| Today row chip | {k} to spare | 0 to spare | attend next {n} |
| Subjects row | {A} of {H} · Can bunk {k} more | {A} of {H} · No bunks to spare | {A} of {H} · Needs {n} |

Plural forms are handled in `packages/copy` (ICU MessageFormat); "1 more" stays grammatical.

### 6.7 Composition across subjects: the three eligibility bases
Each subject is judged against its own threshold (the term threshold or its override); the
**aggregate** is judged against the term threshold on the overall tally. The big percentage on
Today is always the aggregate (status). Every sentence must stay true for every constraint the
basis imposes.

| Basis | Eligible means | Subject safe-now kₛ | Header total k |
|---|---|---|---|
| `per_subject` (default) | every subject eligible | simulate bunking the subject's next classes; stop when the subject fails its own threshold | k = Σₛ kₛ |
| `overall` | aggregate eligible | not shown per subject | aggregate safe-now over the merged chronological upcoming sequence |
| `both` | every subject eligible **and** the aggregate eligible | simulate bunking the subject's next classes; stop when the subject **or the aggregate** fails | largest count of upcoming occurrences, at most the per-subject kₛ from each subject, smallest units first, whose units fit the aggregate unit budget U_o = floor((10,000·A_o − T·H_o) / T); with all units 1, k = min(Σₛ kₛ, U_o) |

Header sentence, in precedence order:
1. `overall` or `both`, aggregate not eligible → the locked BELOW sentence with the aggregate
   recovery n.
2. `per_subject` or `both`, one or more subjects not eligible → **new copy (needs Ohm's
   approval)**: one subject: "You're at {p}% overall. {subject} needs the next {n} to reach {T}%."
   · several: "You're at {p}% overall. {m} subjects need classes to reach {T}%." Tap → breakdown
   sheet.
3. Otherwise ABOVE with the header total k when k ≥ 1, else CLOSE. The per-row chips show where
   the bunks can be spent.

Regression G18 (an override under `both`) is in §8.

### 6.8 Bunk planner and simulator
Pure functions over a proposed sequence of statuses (e.g. all occurrences on a chosen date marked
Bunked, others unchanged) returning the resulting tally, display value, eligibility and k/n per
subject and overall. No side effects.

## 7. Marking semantics

- Exactly one current mark per occurrence key (`{slotId}:{YYYY-MM-DD}` or `x:{exceptionId}`).
  Re-marking replaces; unmarking writes a tombstone. Every change appends an audit event.
- Future occurrences may only be marked **Cancelled** (known cancellations remove them from R).
- Marks always count by their status even if the schedule later changes (slot deleted, holiday
  declared and the user chose "keep"). Orphaned marks stay visible in the ledger.
- Backfill is allowed for any past date after the subject's baseline `asOf` (§2).
- **Recovered toast** fires when a mark (not a settings, baseline or policy edit) flips a subject
  or the overall tally from not eligible to eligible.

## 8. Golden test table (immutable)

T = 7,500 unless stated; all units 1 unless stated; policy `exact` unless stated.

| ID | A | H | T | R | Display (int / 1dp) | Eligible | k (safe-now) | n (recovery) | Term-end s_max · min attend | Band → sentence |
|---|---|---|---|---|---|---|---|---|---|---|
| G1 | 30 | 40 | 7500 | 40 | 75 / 75.0 | yes | 0 | 0 | 10 · 30 | CLOSE → "You're at 75%. One bunk puts you under 75%." |
| G2 | 33 | 40 | 7500 | 20 | 82 / 82.5 | yes | 4 | 0 | 8 · 12 | ABOVE → "…You can bunk 4 more and stay above 75%." |
| G3 | 29 | 40 | 7500 | 20 | 72 / 72.5 | no | 0 | 4 | 4 · 16 | BELOW → "…Attend the next 4 to reach 75%." |
| G4 | 149 | 200 | 7500 | 50 | 74 / 74.5 | no | 0 | 4 | 11 · 39 | BELOW (never displays 75) |
| G4b | 149 | 200 | 7500 | 50 | 75 (college-rounded) | yes (`half_up_integer`) | 0 | 0 | — | CLOSE |
| G5 | 23 | 29 | 7500 | 10 | 79 / 79.3 | yes | 1 | 0 | 3 · 7 | ABOVE ("1 more") |
| G6 | 90 | 100 | 7500 | 5 | 90 / 90.0 | yes | 5 (uncapped 20; capped at R) | 0 | 5 · 0 | ABOVE |
| G7 | 20 | 40 | 7500 | 10 | 50 / 50.0 | no | 0 | unreachable (40 > R) | unreachable | "75% isn't reachable this sem. Max possible: 60%. Each class raises it." |
| G8 | 10 | 12 | 7500 | 3 (units 2,1,1) | 83 / 83.3 | yes | **0** (next is a 2-unit lab; the u = 1 closed form would wrongly say 1) | 0 | — | CLOSE — proves simulation is required with mixed units |
| G9 | 2 | 3 | 7500 | 10 | 66 / 66.6 | no | 0 | 1 | 2 · 8 | BELOW → "Attend the next 1 to reach 75%." |
| G10 | 0 | 0 | 7500 | 40 | — | n/a | n/a | n/a | 10 of 40 | "No classes yet." |
| G11 | subjects 18/20 and 1/5 | | 7500 | 20 each | overall 76 | overall yes; subject 2 no | — | subject 2: 11 | — | per-subject header → "You're at 76% overall. {subject 2} needs the next 11 to reach 75%." Mean of % (55) is forbidden. |
| G12 | 34 | 40 | 8500 | 20 | 85 / 85.0 | yes | 0 | 0 | 3 · 17 | CLOSE at 85% |
| G13 | 2 | 3 | 6667 | 10 | 66 / 66.6 | **no** (20,000 < 20,001) | 0 | 1 | 3 · 7 | BELOW |
| G14 | marks: 8 attended, 2 bunked, 1 excused on-duty (`present`) | → A 9, H 11 | 7500 | — | 81 / 81.8 | yes | — | — | — | — |
| G15 | any tally + any number of Cancelled marks or unmarked occurrences | unchanged | | | unchanged | unchanged | | | | invariance |
| G16 | unmarked contact hour → (0, 0); marked attended contact hour → (1, 1) | | | | | | | | | contact-hour rule |
| G17a | baseline 30/40 with asOf 2026-11-19, plus a Bunked mark dated 2026-11-19 | → A 30, H 40 | 7500 | — | 75 / 75.0 | yes | — | — | — | covered mark ignored (no double count) |
| G17b | same baseline, plus a Bunked mark dated 2026-11-20 | → A 30, H 41 | 7500 | — | 73 / 73.1 | no | 0 | 3 | — | BELOW |
| G18 | basis `both`; term T 7500; subject A 50/100 with override T 5000; subject B 100/100 at T 7500 | aggregate 150/200 | 7500 | ≥ 40 each | overall 75 | every subject and the aggregate eligible | per subject: A 0, B 33; under `both`: B 0 (one B bunk → aggregate 150/201) | — | — | header total min(33, U_o = 0) = 0 → CLOSE "You're at 75%. One bunk puts you under 75%." (`per_subject` alone would wrongly offer 33) |

## 9. v1.0 defects not to carry over

| # | v1.0 behavior (`reference/v1/domain`) | Why it is wrong | Fix |
|---|---|---|---|
| D1 | `canMiss` used the **term-end** horizon. A=30, H=40, R=40 → "You can bunk 10 more and stay above 75%". | After one bunk the student is at 30/41 = 73.1% and the copy flips to "Attend the next 3…". "Stay above" was false. | Primary budget = safe-now (§6.1); term-end lives in the forecast (§6.3). |
| D2 | `mustAttend` = classes needed **by term end** under "Attend the next {n} to reach 75%". A=6, H=10, R=30 → "next 24". | Attending the next 6 already reaches 75% (12/16). | Recovery = consecutive classes from now (§6.2). |
| D3 | `pct()` rounded half up: 149/200 = 74.5% shown as "75" next to "Attend the next 4 to reach 75%". | Displays the threshold while below it. | Floor display (§5). |
| D4 | Zero held → 100%. | Fabricated number. | "No classes yet" (§6.5). |
| D5 | Thresholds as `Double`. | Floating-point edge errors at boundaries. | Integer basis points (§2). |
| D6 | Remaining horizon strictly after **today** (day-granular). | Excluded today's upcoming classes from the budget at the moment of the bunk decision. | Instant-based upcoming set (§3). |

Port v1's test *cases* (`reference/v1/tests/`) where they encode correct behavior; rewrite those
that encode D1–D6.

## 10. Module interface (`packages/core/attendance`, TypeScript)

```ts
export type BasisPoints = number;            // integer 0..10_000
export type Units = number;                  // positive safe integer
export type MarkStatus = 'attended' | 'bunked' | 'cancelled' | 'excused';
export type ExcusedKind = 'on_duty' | 'medical' | 'other';
export type ExcusedMapping = 'present' | 'excluded' | 'absent';

export interface AttendancePolicy {
  thresholdBp: BasisPoints;
  rounding: 'exact' | 'half_up_integer';
  basis: 'per_subject' | 'overall' | 'both';
  excused: Record<ExcusedKind, ExcusedMapping> | null;   // null = Excused disabled; stray excused marks count as excluded
}
export interface Tally { attended: Units; held: Units }  // invariant 0 ≤ attended ≤ held
export interface Baseline { attended: Units; held: Units; asOf: string | null } // asOf: YYYY-MM-DD, inclusive coverage (§2)
export interface Mark { occurrenceKey: string; localDate: string /* YYYY-MM-DD */; status: MarkStatus; excusedKind?: ExcusedKind; units: Units }
export interface UpcomingOccurrence { occurrenceKey: string; startsAt: string /* ISO instant */; units: Units; subjectId: string }

/** Chronological upcoming occurrences; the caller has already removed contact hours and Cancelled ones. */
export interface Horizon {
  upcoming: readonly UpcomingOccurrence[];
  /** true: `upcoming` is the complete remaining set through the term end (R = upcoming.length).
   *  false: term end unknown — no caps, and once `upcoming` runs out the budgets continue with
   *  virtual 1-unit classes. */
  termEndKnown: boolean;
}

export function tally(baseline: Baseline, marks: readonly Mark[], policy: AttendancePolicy): Tally; // ignores marks dated ≤ asOf
export function overallTally(subjects: readonly Tally[]): Tally;                                   // Σ/Σ, never a mean of %
export function isEligible(t: Tally, policy: AttendancePolicy): boolean | null;                  // null when held = 0
export function displayPercent(t: Tally, policy: AttendancePolicy, decimals: 0 | 1): string | null; // floored, integer math; null when held = 0
export function safeNowBudget(t: Tally, h: Horizon, policy: AttendancePolicy): number | null;    // null when held = 0; Infinity only when T = 0 and term end unknown
export type Recovery =
  | { kind: 'not_started' }
  | { kind: 'eligible' }
  | { kind: 'recoverable'; n: number }
  | { kind: 'unreachable'; maxReachableDisplay: string | null };                                  // null when term end unknown
export function recovery(t: Tally, h: Horizon, policy: AttendancePolicy): Recovery;
export interface TermEndForecast {
  remaining: number; remainingUnits: number;
  maxSkippable: number; minToAttend: number;     // counts of occurrences; with mixed units, skip smallest units first
  reachable: boolean; maxReachableDisplay: string; // floor(100·(A+R_u)/(H+R_u))
}
export function termEndForecast(t: Tally, h: Horizon, policy: AttendancePolicy): TermEndForecast | null; // null when term end unknown
export function copyBand(t: Tally, k: number | null, policy: AttendancePolicy): 'above' | 'close' | 'below' | 'not_started';
export function colorBand(t: Tally, k: number | null, policy: AttendancePolicy): 'good' | 'close' | 'below' | 'not_started';
export function simulate(t: Tally, sequence: readonly { units: Units; status: MarkStatus; excusedKind?: ExcusedKind }[], policy: AttendancePolicy): Tally[];
export const CLOSE_MARGIN_BP = 600;
```

Invalid input (negative or non-integer numbers, unsafe integers, attended > held, threshold outside
0–10,000) throws `RangeError` with a message starting `attendance:`. Under `half_up_integer`,
`displayPercent` returns the college-rounded integer `P` regardless of `decimals`. The color band's
"6 points above" test is the integer comparison `10,000·A ≥ (T + 600)·H`.

Standing composition (`subjectStanding`, `overallStanding`, `todayHeader`) lives in the same
package and returns structured data (band, numbers, copy key + params). Views render copy keys
via `packages/copy`; they never assemble attendance sentences themselves.

## 11. Required tests (in `packages/core`, run in CI on every PR)

1. Every row of §8 as a named test (G1–G17 in P0-06; G18 with the standing composition in P1-03).
2. Property tests (fast-check, ≥ 10,000 runs each): closed forms equal the simulation when u = 1
   and policy is exact; bunking never increases %, attending never decreases it; after k
   safe-now bunks the student is still eligible and after k + 1 is not (unless capped by R);
   recovery n is minimal; overall = Σ/Σ; the display guarantee in §5; Cancelled/unmarked
   invariance; marks dated on or before `asOf` never change the tally; tally never yields A > H.
3. Exhaustive boundary sweep: H ∈ [1, 300], A ∈ [0, H], T ∈ {5000, 6000, 6500, 6667, 7000,
   7500, 7550, 8000, 8500, 9000, 9500, 10000} → closed form == brute force (≈ 1M cases, < 10 s).
4. Occurrence math (`10` §3.2): holidays, Saturday classes, day-order shifting with holidays and
   overrides, parity, slot versions, exceptions, extra classes, time-zone traps.


---

# 06 — Technical Architecture & Engineering Scope

Decisions here are **settled** unless marked *pending spike*. A pending decision has a named
spike (§17) with acceptance criteria and a named fallback; agents run the spike, record evidence
in the ADR, and proceed with the default or the fallback — they do not invent a third option.
Any other deviation needs a new ADR approved by the lead and Ohm.

**Expo has changed:** read the versioned docs for **SDK 57** (https://docs.expo.dev/versions/v57.0.0/)
before writing app code (`AGENTS.md`).

---

## 1. System overview

```
 ┌───────────── Clients (one Expo Router codebase: apps/app) ─────────────┐
 │ iOS · Android (React Native 0.86, New Arch, Hermes, React Compiler)     │
 │ Web/PWA (react-native-web)                                              │
 │  ├─ Local SQLite (device) ← sync engine →─────────────┐                 │
 │  ├─ packages/core (attendance, occurrences, planner) │                 │
 │  └─ Widgets / share extension / notifications        │                 │
 └──────────────────────────────┬───────────────────────┼─────────────────┘
                                │ HTTPS (JWT)           │ sync stream
                     ┌──────────▼──────────┐   ┌────────▼────────┐
                     │ apps/api (Hono, TS) │   │ Sync service    │
                     │ REST /v1 + SSE      │   │ (PowerSync)     │
                     └──┬──────┬──────┬────┘   └────────┬────────┘
                        │      │      │                 │
        ┌───────────────▼┐  ┌──▼──────▼───────┐  ┌──────▼─────────────────────┐
        │ AI gateway     │  │ Supabase        │  │ apps/worker-docs (Python)  │
        │ packages/ai →  │  │ Postgres+pgvector│◄─┤ Docling, LibreOffice, OCR  │
        │ Gemini (paid)  │  │ Auth · Storage  │  │ consumes pgmq jobs         │
        └────────────────┘  │ pgmq · pg_cron  │  └────────────────────────────┘
                            └─────────────────┘   Region: ap-south-1 (Mumbai)
```

## 2. Decision register (ADRs)

Each ADR gets a file `docs/adr/ADR-NNN-<slug>.md` (template in `11` §5) in Phase 0. Summary:

| ADR | Decision | Status | Rationale / fallback |
|---|---|---|---|
| 001 | **Monorepo** in the existing `studex` repo: pnpm workspaces + Turborepo; Expo app moves to `apps/app`. | Accepted | One repo for agents; shared types. pnpm `minimumReleaseAge` = 7 days (supply-chain policy). |
| 002 | **One universal client**: Expo SDK 57 + Expo Router for iOS, Android and Web; TypeScript strict; New Architecture; React Compiler on. | Accepted | Existing scaffold; one UI codebase; web via react-native-web. Platform files (`*.web.tsx`, `*.native.tsx`) where needed. |
| 003 | **Backend platform: Supabase** (Postgres + pgvector, Auth, Storage, Queues/pgmq, pg_cron), region **ap-south-1**. Separate projects per environment. | Accepted | Few moving parts, RLS, Mumbai region, Postgres does DB + vectors + queue + cron. Domain logic stays portable (no proprietary features beyond Auth/Storage/RLS). |
| 004 | **API: TypeScript Hono service** (`apps/api`) on Node LTS in a container (Mumbai region). zod contracts in `packages/contracts`, OpenAPI generated. All writes with business rules go through it. | Accepted | Typed, testable single write path; runs anywhere. |
| 005 | **Local-first sync: PowerSync** (SQLite on device; per-user sync buckets; uploads → `POST /v1/sync/upload`). | *Pending S-1* | Proven Postgres↔SQLite sync with RN + web SDKs. Fallback: the custom protocol in §6.4. |
| 006 | **Styling: React Native StyleSheet + typed tokens** (`packages/ui`); Reanimated 4, Gesture Handler, expo-haptics, FlashList; native sheets via Expo Router presentation. No UI-kit or CSS-in-JS dependency. | Accepted | Fewest compatibility risks on SDK 57; full control of a distinctive design. |
| 007 | **Document worker: Python 3.12** (`apps/worker-docs`): Docling (MIT) for layout/tables/OCR, LibreOffice headless for Office → PDF renditions, pypdfium2 for rendering. **No AGPL** (no PyMuPDF). | Accepted | Best open document stack; license-clean. |
| 008 | **AI gateway** (`packages/ai`, server-only) with a provider registry; default provider **Google Gemini on a paid, no-training tier** (Flash-Lite class for extraction/cheap tasks, Flash class for tutoring, Gemini embeddings). Model IDs in config. **No Anthropic.** | Accepted | Cheap, multimodal, strong; CLAUDE.md forbids Anthropic. Optional fallback provider configured by Ohm. |
| 009 | **Timetable extraction: VLM on pixels**, single-shot, strict JSON schema + deterministic validation/rejection + confirm UI; second-opinion engine for flagged results. | *Pending S-4* (model choice only) | VLM-VERDICT: pixels beat OCR text; FINDINGS: silent failures must be caught by validation. |
| 010 | **Search: Postgres FTS + pg_trgm + pgvector (HNSW)**, hybrid via reciprocal rank fusion. | Accepted | No extra search infrastructure until scale demands it. |
| 011 | **Notifications:** local notifications for schedule-derived reminders (expo-notifications); Expo push service for server events. | Accepted | Works offline; free push. |
| 012 | **Auth:** Supabase Auth; Google + Apple native ID-token sign-in; email OTP only after Ohm configures a sender; guest mode is local-only; TOTP MFA for staff roles. | Accepted (S-5 verifies flows) | Avoids password flows and agent-touched email senders. |
| 013 | **Observability:** Sentry (app, API, worker); PostHog (product analytics, consented, PII-free); structured JSON logs. | Accepted | Standard, Expo-compatible. |
| 014 | **Testing:** Vitest (TS packages, API), jest-expo + React Native Testing Library (components), fast-check (properties), Maestro (mobile E2E + screenshots), Playwright (web E2E + axe), pgTAP via `supabase test db` (RLS), pytest (worker). | Accepted | See `10`. |
| 015 | **CI/CD:** GitHub Actions; EAS Build / Submit / Update with channels per environment; containers for API and worker. | Accepted | See §14. |
| 016 | **Rich text:** TenTap (native) + Tiptap (web), stored as ProseMirror JSON + plain-text projection; KaTeX for math. | *Pending S-6* | Same document model on all platforms. Fallback: Markdown editor with live preview. |
| 017 | **PDF viewing:** pdf.js everywhere (direct on web; in a WebView on native) with scripting disabled; Office files viewed as server-made PDF renditions. | *Pending S-2* | Annotation parity across platforms. Fallback: native PDF view for reading + web-only annotations in Ph3. |
| 018 | **Widgets:** native WidgetKit (iOS) and app widget (Android) targets managed by config plugins; data bridged through App Group / shared preferences. | *Pending S-3* | Highest-leverage retention surface (psych §2). Fallback: ship Ph1 without widgets; revisit Ph2. |
| 019 | **Payments (Ph6):** store billing on iOS/Android + entitlement sync service (e.g. RevenueCat) + an Indian UPI provider on web. | Deferred to Ph6 | Decided with Ohm (pricing, entity, tax). |
| 020 | **Dependency policy:** versions published ≥ 7 days ago; license allowlist MIT / Apache-2.0 / BSD / ISC / MPL-2.0 (LibreOffice as a separate process); no AGPL/GPL linked code; Renovate with stability days; lockfile committed. | Accepted | Supply-chain safety. |

## 3. Repository layout (target, end of Phase 0)

```
studex/
├─ apps/
│  ├─ app/               Expo Router universal app (iOS, Android, Web) — moved from repo root
│  ├─ api/               Hono API (Node LTS) — src/modules/<module>/, src/platform/
│  ├─ worker-docs/       Python document worker (Docling, LibreOffice, OCR)
│  └─ admin/             Admin console (Expo Router, web-only) — Phase 2
├─ packages/
│  ├─ core/              Pure TS domain: attendance, occurrences, planner, gpa, readiness (zero runtime deps)
│  ├─ contracts/         zod schemas: API, sync payloads, extraction outputs, events
│  ├─ db/                Drizzle schema mirror + generated types (migrations live in supabase/)
│  ├─ ai/                Provider registry, prompts/, retrieval, validators, evals/
│  ├─ ui/                Design tokens + primitives (Text, Button, Card, ListRow, Chip, Gauge, Sheet, Toast…)
│  ├─ copy/              Keyed strings (en-IN), ICU plurals; locked strings from reference/v1
│  └─ config/            Shared tsconfig, eslint, prettier
├─ supabase/             migrations/, seed/ (synthetic only), tests/ (pgTAP), config.toml
├─ extraction-lab/       Existing benchmarks, fixtures, scorers (kept; scorer promoted into CI)
├─ e2e/                  maestro/ (flows + screenshot lists), playwright/
├─ docs/
│  ├─ spec/              This specification
│  ├─ adr/               Architecture decision records
│  └─ status/            REPO_AUDIT.md, WS-*.md progress logs, release notes
└─ .github/workflows/    ci.yml, e2e.yml, nightly-live.yml, deploy-*.yml
```

Path aliases: `@studex/core`, `@studex/contracts`, `@studex/ui`, `@studex/copy`, `@studex/ai`
(server-only; importing it from `apps/app` fails lint).

## 4. Data model (logical; Postgres)

### 4.1 Conventions
- PKs: UUIDv7. Synced tables use **client-generated** IDs so offline creation works.
- Every user-owned row has `user_id` (owner, also the sync bucket key), `created_at`,
  `updated_at` (trigger), and for synced tables `deleted_at` (tombstone) and `hlc` (hybrid
  logical clock of the last write) plus `field_hlc jsonb` where column-level merge applies.
- Enumerations: `text` + `CHECK` constraints (easy migrations). Percent/threshold: integer basis
  points. Money: integer paise. AI cost: integer micro-USD (`cost_micros`).
- Instants: `timestamptz` (UTC). Academic dates: `date` interpreted in the term timezone.
  Class times: `smallint` minutes from local midnight.
- Migrations: forward-only SQL in `supabase/migrations`, each with a written rollback note in
  the PR. Every new user-owned table ships with RLS policies **and** pgTAP tests in the same PR.

### 4.2 Tables by domain (key columns; full DDL is written by WS-DATA from this model)

**Identity & platform**
| Table | Key columns | Notes |
|---|---|---|
| `profiles` | user_id PK, display_name, avatar_path, institution_id, campus_id, program_id, department_id, year_of_study, current_term_id, timezone, locale, adult_confirmed, onboarding jsonb, dashboard_layout jsonb | Synced |
| `user_roles` | (user_id, role) PK, granted_by, granted_at | Server-only; feeds JWT claims |
| `consents` | id, user_id, purpose (analytics / ai_processing / scan_improvement / parental), notice_version, granted_at, withdrawn_at, channel | Append-mostly |
| `devices` | id, user_id, platform, push_token, app_version, os_version, notifications_enabled, last_seen_at | |
| `entitlements` · `usage_counters` | plan, source, trial_ends_at, expires_at · (user_id, counter, period_start) → value | Server-authoritative |
| `feature_flags` | key PK, rules jsonb, updated_by, updated_at | Admin-managed |
| `audit_log` | bigserial id, actor_id, actor_role, action, target_type, target_id, summary jsonb, reason, ip_hash, created_at | Append-only, server-only |
| `support_tickets` · `support_messages` | ticket, category, body, attachments, status · author_role, body | In-app support |
| `data_jobs` | id, user_id, kind (export / delete), status, scheduled_for, completed_at, result_path | M19 |
| `calendar_feeds` | user_id, token_hash, created_at, revoked_at | ICS feed |

**Catalog (shared, read-mostly)**
`institutions` (name, short_name, aliases[], city, state, kind, verified, status, merged_into) ·
`campuses` · `programs` · `departments` · `catalog_courses` (Ph5) · `holiday_lists` (scope
national/state/institution, region, year, entries jsonb, verified) · `grade_scales` ·
`assessment_templates`.

**Academic core (synced)**
| Table | Key columns |
|---|---|
| `terms` | id, user_id, label, academic_year, start_date, end_date, timezone, schedule_mode (weekly / day_order), cycle_length, working_weekdays smallint[], attendance_policy jsonb (`05` §2), gpa_policy jsonb, selected_batch, status (active / archived), institution_id, program_id |
| `term_holidays` · `term_breaks` · `day_order_overrides` | date + name + source · starts_on, ends_on, label · date, order |
| `subjects` | id, user_id, term_id, name, short_name, code, color, kind, credits, faculty text[], description, policy_override jsonb, baseline_attended, baseline_held, baseline_as_of, counts_in_overall, catalog_course_id, archived_at |
| `baseline_history` | subject_id, attended, held, as_of, source, created_at (append-only) |
| `class_slots` | id, user_id, term_id, subject_id, kind, weekday, day_order, week_parity, start_minute, end_minute, room, faculty, batch, units, valid_from, valid_until, source |
| `slot_exceptions` | id, user_id, term_id, slot_id, date, kind (cancel / move / room / extra), subject_id (extra), start_minute, end_minute, room, units |
| `attendance_marks` | id, user_id, term_id, subject_id, **occurrence_key**, local_date, slot_id, status, excused_kind, units, source, marked_at, hlc, deleted_at · **UNIQUE (user_id, occurrence_key)** |
| `attendance_events` | id, user_id, mark_id, occurrence_key, old_status, new_status, source, device_id, hlc, created_at (append-only audit) |
| `units` · `topics` | subject_id, number, title, position, hours, weight_bp · subject_id, unit_id, title, description, position, status, difficulty, priority, est_minutes |
| `notes` | id, user_id, title, doc jsonb (ProseMirror), plain_text |
| `links` | id, user_id, source_type, source_id, target_type, target_id, meta jsonb (e.g. page range) — generic typed links; cleanup job on deletes |
| `tasks` | id, user_id, term_id, subject_id, parent_id, title, notes_doc, type, status, priority, due_date, due_at, estimate_min, rrule, completed_at, position, reminders jsonb |
| `events` | id, user_id, term_id, type, title, starts_at, ends_at, all_day_start, all_day_end, timezone, location, notes, rrule, exdates date[], series_parent_id, subject_id, exam_id, task_id, source |
| `exams` | id, user_id, term_id, subject_id, type, title, starts_at, duration_min, venue, seat, max_marks, weight_bp, scope jsonb |
| `assessments` | id, user_id, subject_id, component, weight_bp, max_marks, obtained, exam_id |

**Library**
| Table | Key columns | Sync |
|---|---|---|
| `folders` | id, user_id, parent_id, name, term_id, subject_id | Synced |
| `documents` | id, user_id, title, original_filename, mime, size_bytes, page_count, sha256, storage_path, rendition_path, thumbnail_path, source, status, status_detail jsonb, pipeline_version, language, term_id, subject_id, unit_id, topic_id, folder_id, filing_state (user / suggested / confirmed), deleted_at | Metadata synced |
| `document_pages` | (document_id, page_no) PK, text, ocr, width, height | Server-only |
| `document_chunks` | id, document_id, user_id, page_from, page_to, heading_path text[], content, token_count, tsv tsvector, embedding vector(768), embedding_model, pipeline_version | Server-only · GIN(tsv), HNSW(embedding, cosine), btree(user_id) |
| `annotations` | id, user_id, document_id, page_no, kind (highlight / note / bookmark), anchor jsonb (text quote + rects), color, body | Synced |
| `job_runs` | id, document_id, step, status, attempt, error_code, started_at, finished_at | Server-only |

**AI & learning**
`tutor_threads` (scope jsonb) · `tutor_messages` (role, content, citations jsonb, retrieved jsonb,
model, prompt_id, tokens_in/out, cost_micros, latency_ms, feedback, flags[]) · `ai_usage`
(server-only ledger) · `quizzes` · `quiz_questions` (type, stem, options, answer, explanation,
citation, topic_id, difficulty) · `quiz_attempts` · `question_responses` (append-only) · `decks` ·
`cards` (fsrs jsonb) · `card_reviews` (append-only) · `pyq_papers` · `pyq_questions` (topic_ids,
confirmed) · `study_plans` (goal, settings, algorithm_version) · `study_blocks` (item_type,
item_id, starts_at, duration_min, status, actual_min, pinned, reasons[]) · `focus_sessions`.

**Extraction, notifications, community, billing**
`extraction_jobs` (user_id or install_id, kind, status, input_path, model, model_version,
latency_ms, cost_micros, flags, result, edits_after_confirm, consent_keep, purge_after) ·
`notification_prefs` · `notification_log` (category, dedupe_key, scheduled_for, sent_at,
opened_at, channel) · `spaces` · `space_members` · `space_timetables` (versioned slots jsonb) ·
`space_resources` · `space_posts` · `reports` · `blocks` (Ph5) · `purchases` (Ph6).

### 4.3 Row-level security patterns
- **Owner:** `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`.
- **Server-only** (`document_pages`, `document_chunks`, `ai_usage`, `extraction_jobs`,
  `audit_log`, `job_runs`, `user_roles`): no client policies; accessed by the API/worker only.
- **Catalog:** readable by everyone (including anon); writable only by `studex_admin` (and
  `institution_admin` for their institution, Ph5).
- **Spaces:** via `SECURITY DEFINER` helpers `is_space_member(space_id)` /
  `is_space_moderator(space_id)`.
- **Staff:** role claim + `aal2` (MFA) check in policies and in the API.
- **Defense in depth:** the API runs user requests inside a transaction with
  `set local role authenticated` and the caller's JWT claims, so RLS applies to API queries too.
  The service role is reserved for system jobs (worker, cron, deletion pipeline).

## 5. API design

- REST JSON under `/v1`; SSE for streaming (`text/event-stream`).
- Auth: `Authorization: Bearer <Supabase JWT>`, verified against JWKS; guests use a signed
  install token (`X-Install-Token`) on the few anonymous endpoints.
- Validation: zod schemas from `packages/contracts` on every input and output.
- Errors: RFC 9457 `application/problem+json` with stable `code`s (`attendance.invalid_tally`,
  `quota.exceeded`, `doc.too_large`, …). 404 for resources owned by others.
- Idempotency: `Idempotency-Key` header required on POSTs that create or charge; stored 24 h.
- Pagination: cursor-based (`?cursor=&limit=`, max 100).
- Rate limits: per user and per IP; Postgres-backed sliding window for expensive routes (AI,
  extraction, uploads); `RateLimit-*` headers.
- Observability: `X-Request-Id` propagated to logs, Sentry and the worker.
- OpenAPI served at `/v1/openapi.json`; the typed client is generated into `packages/contracts`.

**Endpoint catalog (initial; modules own their routes)**

| Route | Purpose | Module |
|---|---|---|
| `POST /v1/sync/upload` | Batched CRUD from the sync engine; per-op results | M23 |
| `POST /v1/extract/{kind}` · `GET /v1/extract/jobs/{id}` | Start extraction (multipart) · poll/stream result | M17 |
| `POST /v1/documents` · `POST /v1/documents/{id}/complete` · `GET /v1/documents/{id}` · `DELETE /v1/documents/{id}` | Upload intent (TUS URL) · finalize & enqueue · status · delete cascade | M08 |
| `GET /v1/documents/{id}/url?variant=original|rendition|thumbnail` | Short-lived signed URL | M08 |
| `POST /v1/search` | Hybrid document search (+ server entity search) | M16 |
| `POST /v1/tutor/threads` · `POST /v1/tutor/threads/{id}/messages` (SSE) · `POST /v1/tutor/messages/{id}/feedback` | Tutor | M09 |
| `POST /v1/practice/quizzes` · `POST /v1/practice/cards/generate` | Generation jobs | M12 |
| `POST /v1/planner/plans` · `POST /v1/planner/plans/{id}/replan` | Plans (the scheduler itself is in `packages/core`; the API persists and adds AI explanations only if enabled) | M11 |
| `GET /v1/calendar/feed/{token}.ics` · `POST /v1/calendar/feeds` · `DELETE /v1/calendar/feeds/current` | ICS feed | M05 |
| `POST /v1/me/export` · `POST /v1/me/delete` · `POST /v1/me/delete/cancel` | Data rights | M19 |
| `POST /v1/feedback` · `GET /v1/support/tickets` | Support | M20 |
| `GET /v1/flags` · `GET /v1/entitlements` | Flags and quotas | M20, M21 |
| `POST /v1/devices` | Push token registration | M15 |
| `/v1/admin/*` | Staff only, MFA, audited | M20 |

## 6. Local-first and sync

### 6.1 Device database
SQLite on device (via the sync engine's SDK). Synced tables mirror §4.2 (synced columns only).
Device-only tables: `onboarding_draft`, `outbox_meta`, `doc_cache`, `ui_state`. Live queries
drive the UI (no manual refetch); queries are indexed on `(term_id, local_date)`,
`(subject_id)`, `(user_id, occurrence_key)`.

### 6.2 PowerSync design (default, pending S-1)
- **Sync rules:** a per-user bucket containing every synced user-owned table filtered by
  `user_id`; a global catalog bucket (institutions, holiday lists); per-space buckets (Ph5).
- **Writes:** local transaction → upload queue → connector → `POST /v1/sync/upload` (batched CRUD
  with changed columns and `hlc`) → API validates, authorizes, applies business rules (audit
  events, invariants, conflict policy) in one DB transaction → per-op results. Permanent
  rejections revert locally and show a visible message; transient errors retry with backoff.
- **Guest mode:** the same local schema with no connection; on sign-in, the claim step rewrites
  `user_id` and uploads (FR-AUTH-004).
- **Web:** PowerSync web SDK if S-1 proves it viable on react-native-web; otherwise web is
  online-first through the API with optimistic updates (FR-SYNC-006).

### 6.3 Conflict policy (normative)
| Entity | Identity | Policy |
|---|---|---|
| `attendance_marks` | (user_id, occurrence_key) | Row last-writer-wins by HLC; the losing value is written to `attendance_events` |
| Subject baselines | subject | LWW + `baseline_history` |
| `tasks`, `events`, `exams`, `subjects`, `units`, `topics`, `terms`, `class_slots` | id | Column-level LWW using `field_hlc` |
| `notes` | id | Document-level LWW; concurrent offline edits create "{title} (conflict copy)" |
| `attendance_events`, `card_reviews`, `question_responses`, `focus_sessions`, `baseline_history` | id | Append-only; no conflicts |
| Any delete | — | Tombstone wins; recoverable from "Recently deleted" for 30 days |

HLC = (physical ms, counter, node id), compared lexicographically; node id = device id.

### 6.4 Fallback protocol (only if S-1 rejects PowerSync)
- **Commit-safe change log.** Triggers on every synced table append to `change_log` (`user_id`,
  `table_name`, `row_id`, `op`, `txid xid8 DEFAULT pg_current_xact_id()`, `seq bigint` from one
  sequence). A sequence value alone does not give commit order: transaction A can take seq 101,
  B can take 102 and commit first, and a cursor that advanced to 102 would skip 101 forever.
- **Pull:** `GET /v1/sync/pull?cursor={txid}:{seq}&limit=1000` returns, in `(txid, seq)` order, the
  caller's change-log entries with `(txid, seq) > cursor` **and**
  `txid < pg_snapshot_xmin(pg_current_snapshot())` — only transactions older than every in-flight
  one, so the cursor can never pass an uncommitted write — joined to current row state
  (tombstones included), plus `next_cursor`.
- **Push:** `POST /v1/sync/push` with `[{op_id, table, op: upsert|delete, row, changed_columns,
  hlc}]`; idempotent by `op_id`; same conflict policy as §6.3; response lists accepted/rejected ops.
- Client outbox in SQLite; pull after every push and on app foreground and reconnect; tombstones
  kept 90 days server-side.

## 7. Document pipeline (`apps/worker-docs`)

1. **Upload intent** (`POST /v1/documents`): quota and limit checks → `documentId` + TUS upload
   URL to the private bucket `user-files/{user_id}/{document_id}/original`.
2. **Complete** (`POST /v1/documents/{id}/complete`): object exists, size within limits →
   enqueue `doc_process` (pgmq) with `{document_id, pipeline_version}`.
3. **Worker** (visibility timeout 10 min; ≤ 3 attempts with backoff; then dead-letter):
   magic-byte sniff + sha256 verify → convert (LibreOffice: DOC/PPT/DOCX/PPTX → PDF rendition;
   HEIC → JPEG) → Docling per-page layout, tables and text → OCR for pages with < 50 characters
   of text (Docling OCR engine; VLM OCR for handwriting is P2 and quota-limited) → section/heading
   detection → **chunking** (heading-aware, tokenizer-aligned; target 400–600 tokens, max 800,
   ~50-token overlap; each chunk keeps `heading_path`, `page_from`, `page_to`) → **embeddings**
   (batches of 64; model and dimension recorded) → `tsv` → topic-link and subject suggestions →
   thumbnails (pypdfium2) → status Ready / Partial (failed pages listed) / Failed (error code).
4. Idempotent per (document_id, pipeline_version); bumping `pipeline_version` triggers
   background reprocessing; changing the embedding model triggers re-embedding into a new
   model-tagged column/index before cut-over (blue/green).
5. **Isolation:** the worker has egress only to DB, Storage and the embedding API; LibreOffice
   runs as a separate process with a 60 s timeout and memory cap; temp files are wiped; PDF
   JavaScript is never executed (pdf.js runs with scripting disabled; renditions are re-rendered).
6. **Deletion (FR-KNO-011):** `doc_soft_delete` removes pages, chunks, embeddings, index entries
   and caches at once and hides the document; `doc_purge` (after 30 days, on "Delete
   permanently", or on account deletion) removes storage objects and remaining rows within 24 h,
   verified by a post-purge query. Restoring within 30 days re-enqueues `doc_process`.

## 8. AI architecture (`packages/ai`)

### 8.1 Gateway
- Server-only. One `generate()` / `stream()` / `embed()` wrapper that enforces: model lookup from
  the feature registry (`feature → provider, model, params, fallback`), timeouts, retries with
  jitter, pre-flight quota check (M21), per-request token caps, usage logging to `ai_usage`
  (tokens, cost_micros, latency, feature, prompt id), PII-free logs, kill-switch flag per feature.
- Structured outputs validated with zod; invalid → one repair attempt → error.

### 8.2 Prompt registry
`packages/ai/prompts/<feature>/<name>.v<N>.md` with front matter (`id`, `inputs`, `output_schema`,
`model_class`). Prompts are code: reviewed in PRs, versioned, and every change runs the feature's
eval suite (`10` §7). Retrieved content is wrapped in delimited source blocks
(`<source id="S3" doc="…" page="12">…</source>`) and the system prompt states that source text
is data, never instructions.

### 8.3 Retrieval (tutor, practice, exam prep)
1. Scope → SQL filters (`user_id = caller` always; subject/document/topic filters from scope).
2. Optional query rewrite using thread context (P1).
3. Candidates: FTS top 30 + vector top 30 → reciprocal rank fusion (k = 60).
4. Rerank top 20 (behind a flag; on by default only if the eval shows a gain).
5. Select top 8 within a ~6k-token budget; number them S1…S8.
6. Generate with citation markers `[S#]`; the **citation validator** maps markers to chunks,
   drops invalid markers, verifies quotes (FR-TUT-005); the UI renders `[Title · p.N]`.
7. Not-found rule: if top fused score < threshold (tuned on the eval set) or the model reports
   insufficient support → the "I couldn't find this in your materials." path.

### 8.4 Safety and abuse
Provider safety settings on; self-harm detection (keyword list + model classification) routes to
the safety response (FR-TUT-011); output reports go to moderation (M20); per-user and global
spend caps; jailbreak/injection test set in evals; no tools with side effects in tutoring.

### 8.5 Caching
Embeddings keyed by sha256(content + model); summaries keyed by (document_id, pipeline_version,
prompt_id, params); all caches purged on document deletion.

### 8.6 Model defaults (config, not code)
| Feature | Default class | Notes |
|---|---|---|
| Timetable / document extraction | Gemini Flash-Lite class (vision) | Final choice by S-4 against the gate |
| Tutor answers | Gemini Flash class | Streaming |
| Titles, classification, validation checks, rerank | Gemini Flash-Lite class | |
| Embeddings | Gemini embedding model, 768 dimensions | Multilingual |
| Fallback | OpenAI-compatible endpoint configured by Ohm (optional) | Never Anthropic |

## 9. Extraction service
Implemented in `apps/api/src/modules/extraction` (orchestration, validation, persistence) with
model calls through `packages/ai`. Validation rules are pure functions in
`packages/core/extraction-validate` so they run in CI without network. The evaluation harness
reuses `extraction-lab/` fixtures and ground truth; `score_slots_strict.py` stays the reference
scorer and the RUAS keyF1 scorer is ported from `reference/v1/tests/ExtractionAcceptanceTests.swift`
(matching rules in `reference/v1/briefs/extract.md` §7). CI runs against **recorded** model
outputs; the nightly job runs live (budget-capped). Results print MATCH / MISS / SPURIOUS tables.

## 10. Notifications
Local scheduling service in the app (`apps/app/src/services/notifications`) recomputes a rolling
7-day window from `packages/core` occurrences; dedupe keys prevent duplicates; categories map to
Android channels. Server push via the Expo push service from the API (`notification_log` for
dedupe and auditing). Templates live in `packages/copy`; a unit test scans them for forbidden
wording (`attendance status`, thresholds, streaks).

## 11. Search
Server: SQL function `search_documents(query, scope, limit)` doing FTS (`ts_rank_cd`) + trigram
on titles + pgvector cosine, fused by RRF. Client: SQLite FTS5 tables for synced entities, with
triggers keeping them in sync. Global search merges both result sets by type.

## 12. Security architecture
- **AuthN:** Supabase JWT (1 h access tokens, rotating refresh tokens); JWKS verification in the
  API; staff roles require `aal2`.
- **AuthZ:** explicit ownership checks in every API handler **and** RLS (§4.3).
- **Storage:** private buckets only; paths prefixed by `user_id`; storage policies; downloads via
  signed URLs (≤ 15 min) issued after authorization.
- **Secrets:** environment variables from secret managers only. Client bundles contain only
  publishable values (Supabase anon/publishable key, Sentry DSN, PostHog public key).
  `.env.example` lists keys without values. gitleaks in CI. Agents never read `.env.local`.
- **Web:** strict CSP, no `dangerouslySetInnerHTML` (rich text rendered through sanitized
  schema-based renderers), SameSite cookies where used.
- **Threat model (top items):**

| Threat | Control |
|---|---|
| IDOR / cross-user reads | API ownership checks + RLS + 404s + pgTAP tests per table |
| Malicious uploads (PDF JS, zip bombs, polyglots) | Magic-byte sniffing, limits, sandboxed worker, scripting disabled, ZIP limits |
| Prompt injection via documents | Delimited sources, instruction hierarchy, no side-effect tools, SQL-scoped retrieval, injection eval set |
| Cost abuse (anonymous extraction, AI) | Install tokens, rate limits, quotas, global kill switches, bot challenge on web |
| Account takeover | OAuth only, refresh rotation, revoke-all, anomaly alerts (P2) |
| Staff abuse | MFA, least privilege, content-blind support views, audit log |
| Supply chain | 7-day minimum release age, lockfile, Renovate, osv-scanner, license check |
| Data leakage in logs | PII-free logging policy, scrubbing in Sentry, no request bodies logged |

## 13. Environments, configuration, secrets
| Env | Purpose | Data | Deploys |
|---|---|---|---|
| local | Development (`supabase start`, API dev server, worker container, Expo dev client) | Synthetic seed | Developer |
| dev | Shared integration | Synthetic | Auto on merge to `main` |
| staging | Release candidates, beta backend | Synthetic + test accounts | Manual promotion |
| prod | Users | Real | **Human-approved only** |

Each app validates its environment at startup with zod and fails fast with a clear message.
Production data is never copied to lower environments.

## 14. CI/CD and release engineering
- **`ci.yml` (every PR):** pnpm install (frozen lockfile) → lint → typecheck → unit tests (core,
  contracts, api, app components) → DB tests (`supabase start`, migrations, pgTAP RLS suite) →
  worker tests (pytest) → extraction gate (recorded) → AI evals (recorded; only when AI paths
  change) → web build + bundle-size check → gitleaks → osv-scanner → license check.
- **`e2e.yml` (main + nightly):** Playwright (web, axe); Maestro on an Android emulator
  (+ iOS simulator nightly on macOS runners); screenshot artifacts for light/dark.
- **`nightly-live.yml`:** live extraction gate and live AI evals with budget caps.
- **Deploy:** API and worker containers → dev on merge; staging and prod by manual promotion
  (prod requires Ohm). DB migrations via the Supabase CLI in the pipeline (staging/prod gated).
- **Mobile:** EAS profiles `development` / `preview` / `production` (existing `eas.json`),
  `appVersionSource: remote` with auto-increment; EAS Update channels per environment; runtime
  version from fingerprint; store submission and production updates are human-only.

## 15. Observability
Sentry everywhere (source maps uploaded by EAS and CI); structured JSON logs with `request_id`,
`trace_id`, hashed user id; metrics and alerts: API p95 > 1 s, error-rate spikes, queue backlog
> 15 min, extraction failure rate > 10%/h, AI spend > 80% of the daily budget, crash-free
sessions < 99.5%, sync error rate > 1%.

## 16. Performance engineering (low-end Android first)
Hermes; React Compiler; FlashList for every long list; live queries scoped to the visible term;
defer analytics/flags/Sentry breadcrumbs until after first frame; expo-image with sized sources;
route-level code splitting on web; no large JSON parsing at startup; SQLite indices per §6.1;
measure cold start, TTI of Today and marking latency in CI on the reference device profile (`07` §1).

## 17. Spikes (Phase 0) — evidence decides, the fallback is fixed

| Spike | Question | Pass criteria | If it fails |
|---|---|---|---|
| **S-1 Sync** | Does PowerSync work on SDK 57 (iOS, Android dev builds; web)? | Guest local-only mode + claim; offline mark → kill → reconnect → server row + audit event; two-device conflict converges per §6.3; 5,000-row initial sync ≤ 15 s on mid-tier Android; app size impact ≤ 3 MB; license acceptable | Custom protocol §6.4 |
| **S-2 PDF viewer** | pdf.js in WebView (native) + web for 300-page PDFs? | Page nav, search, highlight create/persist (text-quote anchors), open-at-page with highlight, no crash on a 300-page scanned PDF on a 3 GB RAM Android, scripting disabled | Native viewer for reading; annotations web-only in Ph3 |
| **S-3 Widgets** | Can the Expo project ship iOS (interactive) and Android widgets? | Builds via config plugins; widget shows next class + budget; tap-to-mark updates the app DB; refresh within 5 s of a mark in-app | Ship Ph1 without widgets; revisit in Ph2 |
| **S-4 Extraction model** | Does a single-shot Flash-Lite-class (then Flash-class) model on pixels pass the gate? | `10` §5 gate on all four fixtures, 3 runs each, with the validation layer; p75 ≤ 10 s; cost per page recorded | Iterate prompt/schema/validation/second opinion; **never lower the gate**; manual entry remains |
| **S-5 Auth** | Native Google + Apple ID-token sign-in with Supabase on dev builds + web | Sign-in, persistence, refresh offline, logout, revoke-all | Web OAuth flow on native as interim; Apple blocked until the paid account exists |
| **S-6 Rich text** | TenTap + Tiptap sharing ProseMirror JSON with KaTeX | Same doc renders/edits on iOS/Android/web; offline; typing latency < 50 ms on mid-tier Android | Markdown editor with preview |


---

# 07 — Non-Functional Requirements, Privacy & Compliance

Legal statements here are engineering requirements derived from public sources, not legal
advice. Final legal positions (privacy policy, terms, minors' consent method, grievance
officer) are **human-only** and need counsel (`09` §8).

---

## 1. Performance (`NFR-PERF`)

**Reference devices** (keep one physical device per class for release QA; emulate in CI):
- **Low-end Android:** Android 12+, 3–4 GB RAM, entry octa-core (Helio G8x / Snapdragon 4xx
  class), 720p screen. This is the primary target.
- **Mid-tier Android:** 6–8 GB RAM, Snapdragon 6/7-series class, 1080p.
- **iPhone:** the oldest model supported by Expo SDK 57 (record it in ADR-002), plus a current Pro.

| ID | Budget | Target |
|---|---|---|
| NFR-PERF-001 | Cold start → Today interactive | ≤ 2.5 s p75 low-end · ≤ 1.5 s mid-tier · ≤ 1.2 s iPhone |
| NFR-PERF-002 | Mark tap → visual change · numeric animation done | ≤ 100 ms · ≤ 300 ms |
| NFR-PERF-003 | Scrolling Today/Subjects/Library | 60 fps target; ≤ 5% janky frames on low-end |
| NFR-PERF-004 | Memory during daily loop · 300-page PDF | ≤ 250 MB typical · no OOM on low-end |
| NFR-PERF-005 | App size (download) | Android ≤ 35 MB per ABI · iOS ≤ 60 MB (change only by ADR) |
| NFR-PERF-006 | Web | LCP ≤ 2.5 s (Lighthouse mobile, 4G); Today route JS ≤ 450 KB gzip |
| NFR-PERF-007 | API (server time) | CRUD/sync upload p95 ≤ 300 ms · search p75 ≤ 800 ms |
| NFR-PERF-008 | Tutor | First token ≤ 2.5 s p75 · full answer ≤ 12 s p75 |
| NFR-PERF-009 | Extraction | ≤ 10 s p75 per timetable page |
| NFR-PERF-010 | Document processing | 20-page text PDF ≤ 60 s p75 · 100-page scanned ≤ 5 min p75 |
| NFR-PERF-011 | Cross-device propagation | ≤ 5 s p75 when both devices online |
| NFR-PERF-012 | Data usage | Daily loop ≤ 1 MB/day; no document downloads on mobile data unless pinned or allowed in settings |
| NFR-PERF-013 | Battery | No background wake-ups beyond OS-scheduled notifications and opportunistic sync |

## 2. Reliability (`NFR-REL`)

| ID | Requirement |
|---|---|
| NFR-REL-001 | API availability 99.5% monthly in beta, 99.9% at general availability. |
| NFR-REL-002 | Zero loss of acknowledged writes (local commit before UI acknowledgment; server transactional). |
| NFR-REL-003 | Backups: daily (beta, RPO ≤ 24 h); point-in-time recovery at GA (RPO ≤ 1 h); RTO ≤ 4 h; restore drill once per phase. |
| NFR-REL-004 | AI, extraction or document-pipeline outages never degrade the daily loop; every server feature has a kill switch. |
| NFR-REL-005 | Crash-free sessions ≥ 99.5% beta, ≥ 99.8% GA; Android vitals below Play's bad-behavior thresholds (user-perceived crash rate < 1.09%, ANR rate < 0.47%). |
| NFR-REL-006 | Incident runbook (`docs/status/runbooks/`), in-app maintenance banner, forced-update flag. |

## 3. Security, privacy and AI

### 3.1 Security baseline (`NFR-SEC`)
| ID | Requirement |
|---|---|
| NFR-SEC-001 | API meets OWASP ASVS Level 2; mobile apps meet OWASP MASVS L1 (storage, crypto, auth, network, platform, code). |
| NFR-SEC-002 | TLS 1.2+ everywhere; HSTS on web; encryption at rest (provider default); private buckets only. |
| NFR-SEC-003 | Tokens only in Keychain/Keystore (native); no secrets in client bundles; secret scanning in CI. |
| NFR-SEC-004 | Dependency scanning (osv-scanner), SAST (CodeQL), DAST (OWASP ZAP baseline on staging) before every public release. |
| NFR-SEC-005 | External penetration test before public launch (arranged by Ohm). `security.txt` with a disclosure contact. |
| NFR-SEC-006 | PRs touching auth, RLS, storage policies, AI prompts or the deletion pipeline require the security checklist in the PR template and lead review. |
| NFR-SEC-007 | Logs and analytics never contain document text, notes, tutor content, names, emails or tokens. |

### 3.2 Privacy — DPDP Act 2023 and DPDP Rules 2025 (`NFR-PRIV`)
The Rules were notified on 13–14 November 2025 with an 18-month phase-in; most Data Fiduciary
obligations (notices, consent, rights, safeguards, breach reporting) apply from about **May
2027**. Studex MUST comply before its public launch regardless of date.

| ID | Requirement |
|---|---|
| NFR-PRIV-001 | **Notice:** standalone, plain-language, itemized (data → purpose), how to withdraw consent, exercise rights and complain to the Data Protection Board; English at launch, other scheduled languages planned (Hindi first). |
| NFR-PRIV-002 | **Consent:** specific, informed, affirmative, unbundled; withdrawal as easy as granting; consent records kept (M19 FR-SET-011). |
| NFR-PRIV-003 | **Minimization:** no date of birth, contacts, precise location, advertising IDs, or device identifiers beyond push token and install ID. |
| NFR-PRIV-004 | **Rights:** access, correction, erasure, grievance redressal, nomination (M19). Internal SLA: acknowledge grievances within 24 h, resolve within 7 days, always within the Rules' limit. |
| NFR-PRIV-005 | **Breach:** inform affected users without delay; report to the Data Protection Board, with the detailed report within 72 hours; runbook in `docs/status/runbooks/breach.md`. |
| NFR-PRIV-006 | **Processors:** Supabase, Google (AI), Sentry, PostHog, Expo, the container host — agreements handled by Ohm; listed in the privacy center. Primary data stored in Mumbai (ap-south-1). |
| NFR-PRIV-007 | **Logs:** security-relevant logs retained ≥ 1 year (Rules' safeguards); no personal content in them. |
| NFR-PRIV-008 | **Retention:** per §8. |

### 3.3 AI rules (`NFR-AI`)
| ID | Requirement |
|---|---|
| NFR-AI-001 | No Anthropic/Claude API in the product (CLAUDE.md). |
| NFR-AI-002 | Real user content goes only to paid, no-training provider tiers. Free tiers may be used only with synthetic or licensed fixtures in dev/CI. |
| NFR-AI-003 | AI output that changes user data is confirmed by the user first ("confirm is the product"). |
| NFR-AI-004 | AI-generated summaries, quizzes and flashcards carry an "AI-generated" label and citations. |
| NFR-AI-005 | Every prompt/model/retrieval change passes the feature's eval gate (`10` §7). |
| NFR-AI-006 | Per-feature kill switch, per-user daily cap and global daily budget (set by Ohm) with alerts at 80%. |
| NFR-AI-007 | Consent before first AI use (what is sent, to whom, not used for training); AI content reportable in-app. |
| NFR-AI-008 | User content is never written to observability tools; it lives only in the user's own records. |

### 3.4 Minors
Under-18 users: guest mode only until verifiable parental consent ships (FR-SET-009); after
that, no product analytics, no behavioral monitoring, no communities, nothing targeted. The
verification method (e.g. a verified guardian identity) is chosen by Ohm with counsel.

## 4. Accessibility (`NFR-A11Y`) — WCAG 2.2 AA
| ID | Requirement |
|---|---|
| NFR-A11Y-001 | Text contrast ≥ 4.5:1 (large text and UI components ≥ 3:1), light and dark. |
| NFR-A11Y-002 | Touch targets ≥ 44×44 pt (iOS) / 48×48 dp (Android); Attended and Bunked equal-size. |
| NFR-A11Y-003 | Every control has an accessible name/role/hint; attendance rows use the locked `a11y.subject.*` strings. |
| NFR-A11Y-004 | Font scaling to 200% without losing core information (numbers wrap, never truncate). |
| NFR-A11Y-005 | Color is never the only signal (status dot + text). |
| NFR-A11Y-006 | Reduce Motion respected; haptics can be turned off. |
| NFR-A11Y-007 | Web: full keyboard operation, visible focus, logical order; axe checks in Playwright with zero serious/critical violations. |
| NFR-A11Y-008 | Manual VoiceOver and TalkBack pass of the daily loop each release (checklist in `10` §10). |

## 5. Localization (`NFR-I18N`)
`en-IN` default; all strings in `packages/copy` with ICU plurals; dates via `Intl` in `en-IN`
("Fri, 20 Nov", "9:00 am"); Indian digit grouping for money (₹1,00,000); layouts tolerate 40%
text expansion; Hindi UI in Ph6 together with translated notices; AI replies follow the user's
language (FR-TUT-010).

## 6. Compatibility and store compliance (`NFR-COMP`)
- **Platforms:** iOS and Android minimums per Expo SDK 57 (record in ADR-002) and Play's current
  target-API requirement; web: last two versions of Chrome, Edge, Safari, Firefox, and Chrome
  on Android; phones 320–430 dp wide, tablets, desktop ≥ 1024 px.

**Apple App Store checklist**
- Sign in with Apple offered whenever Google sign-in is offered (Guideline 4.8).
- In-app account deletion (5.1.1(v)).
- Accurate privacy nutrition labels and privacy manifest (required-reason APIs declared).
- Factual permission purpose strings (camera, photos).
- Push notifications not used for marketing without opt-in (4.5.4).
- UGC safeguards before Ph5 ships: filtering, reporting, blocking, published contact (1.2).
- In-app purchase for digital subscriptions (3.1.1) in Ph6.
- Age rating questionnaire answered for AI and UGC features.

**Google Play checklist**
- Accurate Data safety form; privacy policy URL.
- Account deletion in-app **and** via a web URL.
- Current target API level.
- Photo and video permissions policy: use the system photo picker; do not request broad media
  permissions.
- AI-generated content policy: in-app reporting of offensive AI output (FR-TUT-009).
- UGC policy for Ph5.
- New personal developer accounts: closed test with ≥ 12 testers for ≥ 14 days before production.
- Play Billing for digital goods in Ph6.
- Android vitals within thresholds (NFR-REL-005).

## 7. Analytics (`NFR-ANL`)

Rules: consented users only (never minors); no PII, free text, document titles, subject names,
or note content; institution IDs only for catalog institutions with ≥ 50 users, else `other`;
events defined here and in `packages/contracts/analytics.ts` (typed); 13-month retention; an event
not in the dictionary fails CI lint.

**Global properties:** `app_version`, `platform`, `os_version`, `device_class` (low/mid/high),
`locale`, `is_guest`, `plan`, `term_week`, `cohort_week`.

| Event | Properties |
|---|---|
| `app_opened` | source (icon / widget / notification / deeplink) |
| `onboarding_step_viewed` · `onboarding_step_completed` · `onboarding_completed` | step · step, duration_ms · duration_ms, path (scan / photo / pdf / manual) |
| `extraction_started` · `extraction_finished` · `extraction_confirmed` | kind, input · kind, outcome (ok / flagged / rejected / failed), latency_ms, slots, flagged_count · edits_count, duration_ms |
| `number_revealed` | subjects_count |
| `class_marked` · `mark_undone` · `sweep_used` | status, source, minutes_after_end_bucket · source · count |
| `budget_viewed` · `forecast_opened` · `bunk_planner_used` | surface · — · days, safe |
| `notification_permission` · `notification_opened` | result · category |
| `account_created` · `claim_completed` | provider · records_bucket, choice |
| `task_created` · `task_completed` | type, has_due, via · on_time |
| `exam_created` | type |
| `document_upload_started` · `document_processed` | source, mime, size_bucket · outcome, duration_bucket, pages_bucket |
| `search_performed` | scope, results_bucket |
| `tutor_question_asked` · `tutor_answer_rated` · `tutor_answer_reported` | scope_type, mode · rating · reason |
| `quiz_generated` · `quiz_completed` · `cards_reviewed` | questions · score_bucket · count |
| `plan_generated` · `block_completed` · `block_skipped` | blocks_bucket, shortfall · — · — |
| `paywall_viewed` · `purchase_completed` | trigger · plan (Ph6) |
| `error_shown` | code, surface |

## 8. Data retention schedule

| Data | Retention |
|---|---|
| Account, academic data, documents, notes, threads | While the account is active; deleted on user request (≤ 30 days) |
| Inactive accounts (no sign-in for 3 years) | Notify 48 h before erasure, then erase |
| Extraction inputs | ≤ 24 h after the job (≤ 180 days with "Help improve scanning" consent) |
| Data exports | Download link 24 h; file deleted after 7 days |
| `ai_usage` ledger (no content) | 2 years |
| Security/audit logs (no content) | ≥ 1 year (max 2 years) |
| Analytics events | 13 months |
| Crash reports | 90 days |
| Deleted-account tombstone (hashed ID + time) | 3 years |
| "Recently deleted" items | 30 days |

## 9. Cost guardrails
Ohm sets the monthly AI budget and the per-user daily caps (`11` §2). The system enforces:
per-feature and global daily caps with automatic kill switches, alerts at 80%, a monthly cost
report in the admin console, and storage quotas per plan. Extraction cost is expected to be
negligible (VLM-VERDICT estimates ≈ ₹0.17 per student per semester); tutor usage is the main
variable cost and is quota-bound.


---

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


---

# 09 — Agent Operating Contract (read before any task)

This contract binds every Devin agent working on Studex: the **lead** and every **specialist**.
It exists because previous agent waves died mid-flight, drifted from the product vision, or
shipped bugs that green tests could not see. Follow it literally.

---

## 1. Roles

- **Lead agent (WS-LEAD).** Owns the plan, backlog, ADRs, integration, code review and merges,
  status reporting to Ohm, and spec-change proposals. Does not write large features itself;
  it decomposes, delegates, reviews and integrates.
- **Specialist agents (WS-PLATFORM, WS-CORE, WS-DATA, WS-APP, WS-EXTRACT, WS-DOCS, WS-AI,
  WS-QA).** Own a slice of the repository (`08` §3), take tickets from the lead, ship small PRs
  with evidence, and report.
- **Ohm (human).** Product owner and final authority. Performs every human-only action (§8),
  approves gates, spec changes, new copy and key screen designs.

If you cannot spawn other sessions, the lead runs workstreams sequentially in the order of
`08` §4–5 and still respects ownership boundaries (one ticket per PR).

## 2. Session start protocol (every session)

1. Read `docs/spec/README.md`, this file, and `docs/status/WS-<yours>.md` (your progress log).
2. Read the spec sections your ticket cites — the FRs, `05` if attendance is involved, `06` for
   architecture, `07` for NFRs, `10` for the tests you must write.
3. `git fetch`; rebase your branch on `main`; run the workspace's fast checks to confirm a green
   starting point. If `main` is red, report to the lead before building on it.
4. Confirm the ticket is assigned to you and that every file you plan to touch is in your
   ownership. If not, ask the lead (ticket comment) before touching it.

## 3. Ticket workflow

1. **Understand.** Restate the ticket's acceptance criteria and FR IDs in the PR description draft.
2. **Plan.** List the files, tests and evidence you will produce. Prefer the smallest design that
   satisfies the FRs; do not build ahead of the ticket.
3. **Tests first where practical.** Golden/property tests for logic; failing test for bugs.
   Test names include FR IDs (`it('FR-ATT-004: overall is aggregate, not a mean of percentages')`)
   so the lead's FR-coverage report can trace them.
4. **Implement** following existing patterns and the ADRs. Read the Expo SDK 57 docs before app
   code.
5. **Verify.** Run the narrowest commands that cover the change, then the workspace checks
   required by CI. UI changes: screenshots light + dark on a small Android, a large iPhone and web.
6. **Checkpoint-commit after every green state.** Sessions die; committed work survives.
7. **Open the PR** with the template (§5), evidence attached, and update `docs/status/WS-<yours>.md`.
8. **Report** using the status format (§10).

## 4. When the spec is silent or unclear

Decision ladder — stop at the first rung that answers the question:
1. A specific FR/NFR or ADR.
2. The relevant module text and the principles in `01` §5 (lower number wins).
3. Adopted reference material (`reference/README.md`).
4. Existing code patterns in the repository.
5. The most conservative option that is reversible, honest to the user and cheap to change.

Record every rung-5 decision as an **Assumption** in the PR and append it to
`docs/status/open-questions.md`. Do **not** block on it unless it is user-visible copy, legal,
security-relevant, destructive, or contradicts a principle — then stop and ask (§9).
Never edit the spec to match your implementation; propose a `spec:` PR instead.

## 5. Git and pull requests

- **Branches:** `ws/<workstream>/<ticket-id>-<slug>` (e.g. `ws/app/P1-12-today-screen`).
- **Commits:** Conventional Commits (`feat(today): …`, `fix(core): …`, `test(att): …`).
- **PR size:** one ticket per PR; aim for ≤ 400 changed lines excluding generated files,
  lockfiles, fixtures and migrations; split otherwise.
- **Never** force-push `main`, rewrite shared history, or merge your own PR. The lead merges
  (squash) after review and green CI.
- **PR template** (`.github/pull_request_template.md`):

```
## Ticket
P1-12 · FR-DASH-001, FR-DASH-002, FR-DASH-003, FR-DASH-014

## What changed
<short, factual>

## Evidence
- Tests: <commands run> → <pass/fail counts>
- Screenshots: <artifact paths> (light/dark × small Android, large iPhone, web)
- Gates/evals: <numbers, if relevant>

## Assumptions (spec silent → decision taken)
## New copy (needs Ohm's approval)
## Risks and follow-ups

## Definition of Done
- [ ] Acceptance criteria met (each FR listed above)
- [ ] Tests added/updated; FR IDs in test names
- [ ] Lint, typecheck, unit tests green; affected E2E green
- [ ] Screenshots light + dark attached (UI changes)
- [ ] Accessibility: labels, contrast, font scaling, touch targets (UI changes)
- [ ] No secrets, no PII in logs, analytics events in the dictionary only
- [ ] Docs/ADR/status updated
## Security checklist (auth, RLS, storage, AI prompts, deletion touched?)
- [ ] Ownership checks + RLS tests  - [ ] Signed URLs only  - [ ] Prompt-injection cases
```

## 6. Definition of Done (global)

A ticket is done only when **all** hold:
1. Every cited FR's acceptance criteria are met and demonstrated.
2. Tests exist at the right level (`10` §1) and are meaningful: no mocking of the unit under
   test, no snapshot-only tests for logic, no assertions on implementation details.
3. CI is green; no test is skipped, deleted or weakened.
4. UI work: screenshots light + dark on the three form factors; motion and haptics per
   `01` §10; loading/empty/error/offline states implemented.
5. Accessibility, performance budgets (`07`) and copy rules (`01` §11) respected.
6. Data work: migration + RLS + pgTAP tests in the same PR; contracts updated.
7. AI work: eval suite run and thresholds met (`10` §7); prompts versioned.
8. Docs: status log updated; ADR when a decision was made; `HOWITWORKS`-style notes for new
   subsystems (`docs/status/howitworks/<subsystem>.md`).

## 7. Quality gates are sacred

- **Never lower a threshold, skip a gate, or loosen a scorer to pass.** The RUAS extraction gate
  turned "flaky" into a fixable list once; gates that print their work are how we win.
- Golden tables (`05` §8) are immutable without a `spec:` PR.
- A test that fails for a reason you do not understand is a finding, not an obstacle: report it.
- "Works on my emulator" is not evidence; screenshots and test output are.

## 8. Hard rules and human-only actions

**Hard rules (violations are reverted and reported):**
1. **Credentials.** Never read `.env.local`, shell profiles, `~/.config`, other projects' env
   files or keychains. Use only environment variables injected by the platform's secret manager.
   Never print, log or commit secrets. Missing secret → stop and report its variable name and why.
2. **No email-sending services.** Never add, configure or call any email-sending service or API
   (standing rule from Ohm). Email-dependent features are human-gated.
3. **No Anthropic/Claude API in the product.**
4. **Stay in scope.** Work only in this repository and the services provisioned for it. The
   never-touch list in `CLAUDE.md` applies in full.
5. **No portal scraping, no messaging automation.** Never automate WhatsApp or any messaging
   app; never request or store university portal credentials.
6. **No production operations.** No prod deploys, migrations, OTA updates, data changes or store
   submissions.
7. **No fabricated data in product paths.** Fixtures are synthetic or licensed and labeled;
   seeds exist only in local/dev; never ship demo data that could be mistaken for real.
8. **No dark patterns.** Follow the voice and behavioral rules; locked copy ships verbatim.
9. **Dependencies per ADR-020:** published ≥ 7 days, license allowlist, added with the package
   manager, justified in the PR.
10. **Never modify security controls** (branch protection, CI security jobs, `minimumReleaseAge`,
    RLS) to get something to pass — escalate instead.
11. **Repository hygiene:** no venvs, `node_modules`, build outputs or derived data in git; files
    > 5 MB need lead approval (fixtures included); never build inside iCloud-synced or
    space-containing paths.
12. **Destructive operations** (dropping tables or buckets, deleting branches others use,
    history rewrites, bulk deletes) need explicit approval from the lead **and** Ohm.

**Human-only actions (agents prepare drafts, Ohm executes):**
accounts, plans and billing for every provider · adding or rotating secrets · email sender
configuration · App Store / Play Console submissions, listings, ratings, data-safety forms ·
DNS and domains · legal text, grievance officer, pricing · production deploys, migrations, OTA
releases and data operations · spend beyond configured budgets · approval of new copy, key screen
designs (onboarding, Today, Subjects, Subject detail, attendance calendar), spec changes and
gates · verifying holiday datasets · supplying real fixtures (timetables, syllabi, PYQs) with
their owners' permission.

## 9. Stop and escalate (do not improvise)

Stop work on the affected item, comment on the ticket, notify the lead, and continue with
unaffected work when:
- a requirement conflicts with `CLAUDE.md`, a principle, or another requirement;
- a secret, account, permission or paid resource is missing;
- a gate cannot be met after reasonable iteration (report numbers and options; never lower it);
- a spike fails (use its fixed fallback; propose nothing else without the lead);
- the change needs a destructive operation or substantial edits outside your ownership;
- you believe the spec is wrong (math, legal, platform constraint) → draft a `spec:` PR.

## 10. Reporting

**Progress log** `docs/status/WS-<name>.md` (append at each checkpoint):
`date · ticket · state (done / in progress / blocked) · branch · last green commit · next step`.

**Session-end report** (posted to the lead and in the PR or ticket):
```
WS: <name> · <date>
Done: <tickets + PR links>
In progress: <ticket, branch, last green commit, what remains>
Blocked: <ticket, blocker, what is needed, from whom>
Evidence: <test summaries, screenshot/eval artifact paths>
Assumptions made: <list>
Open questions for lead/Ohm: <list>
Next steps (ordered): <list>
```

## 11. Lead duties

- **Review every PR fully** against the DoD, the cited FRs, ownership, the security checklist,
  copy rules, accessibility, performance and test quality before merging. Batch feedback into
  one review round.
- **Integrate continuously:** small PRs merged daily; nightly E2E on `main`; fix-forward or
  revert quickly when `main` breaks.
- **Traceability:** maintain `docs/status/fr-coverage.md` (generated by a script that maps FR IDs
  to tests and tickets) and keep every phase FR covered before requesting a gate.
- **Weekly report to Ohm:** progress against gate criteria, risks, decisions needed, new copy
  awaiting approval, budget/cost status.
- **Guard the vision:** reject work that adds unrequested scope, weakens principles, or makes the
  daily loop slower or noisier, even if the code is good.
- **Decision hygiene:** every decision → ADR or Decision Log entry with date, owner and status.

## 12. Session continuity

Assume any session can end without warning. Before each long step: commit, push, and update the
progress log. A new session resumes from the log and the last green commit — never from memory.


---

# 10 — Test Strategy, Gates & Evaluation

Tests are how agents prove behavior to each other and to Ohm. Every suite below is required at
the phase where its feature ships. Thresholds are owned by this spec; agents never lower them.

---

## 1. Pyramid and tools

| Layer | Tool | Scope | Runs |
|---|---|---|---|
| Pure domain | Vitest + fast-check | `packages/core` (attendance, occurrences, planner, readiness, GPA, extraction validation) | Every PR |
| Contracts | Vitest | zod schemas, OpenAPI conformance | Every PR |
| API | Vitest + local Supabase | Handlers, authZ (IDOR), quotas, idempotency, problem+json | Every PR |
| Database | pgTAP (`supabase test db`) | RLS matrix, constraints, triggers, SQL functions | Every PR |
| Worker | pytest | Pipeline steps, designed-to-fail corpus | Every PR touching the worker |
| Components | jest-expo + RN Testing Library | Interactive components, states, a11y props | Every PR |
| Extraction gate | Python scorers + recordings | `extraction-lab` fixtures | Every PR (recorded), nightly (live) |
| AI evals | `packages/ai/evals` | Tutor, practice, syllabus, PYQ | PRs touching AI paths (recorded), nightly (live) |
| E2E mobile | Maestro | Critical flows + screenshots | `main` + nightly |
| E2E web | Playwright + axe | Critical flows, keyboard, a11y | `main` + nightly |
| Performance | Device profiling scripts | Budgets in `07` §1 | Nightly (P1), before each gate |
| Security | gitleaks, osv-scanner, CodeQL, ZAP baseline | Repo and staging | PR / weekly / pre-release |

**Coverage expectations:** `packages/core` ≥ 95% branch coverage (attendance and occurrence
modules 100%); every API route has an authZ test; every user-owned table is in the RLS matrix;
every FR has at least one test whose name contains its ID.

**Fixture ethics:** ground truth is hand-verified (or produced by an independent engine and then
human-checked). Ground truth produced by the same model family that is being evaluated is not
acceptable on its own (VLM-VERDICT §6.2 circularity). Real student documents are used only with
their owners' permission and never committed if they contain personal data beyond names of
faculty and rooms.

## 2. Test data
Synthetic seed data in `supabase/seed/` and `fixtures/` only, labeled as synthetic. No real
student data in any environment except production.

## 3. Golden and property suites

### 3.1 Attendance — `05` §8 (every row) and `05` §11 (properties, exhaustive sweep)

### 3.2 Occurrences
| ID | Case | Expectation |
|---|---|---|
| O1 | Weekly Mon 09:00 slot; two Monday holidays in term | Both dates excluded from occurrences, catch-up held and R |
| O2 | Saturday slot | Counted only on Saturdays |
| O3 | Day-order N = 6; holiday on a Wednesday | Thursday takes the order Wednesday would have had (orders never skipped) |
| O4 | Override "today follows Day 3" | Next working day is Day 4; later days continue |
| O5 | Week parity odd/even | Computed from the term's first week; alternates correctly across holidays |
| O6 | Slot version change from date D | Before D: v1 occurrences; from D: v2; marks on v1 keys persist and count |
| O7 | "Just today" cancel; extra class | One occurrence removed; extra class added with key `x:{id}` |
| O8 | At 10:00, classes at 09:00 (unmarked) and 15:00 | 15:00 is upcoming; 09:00 is unresolved (in neither H nor R) |
| O9 | Device timezone UTC, term `Asia/Kolkata`, mark at 00:30 IST on 21 Nov | `local_date = 2026-11-21` |
| O10 | Term without end date | R unknown; caps off; term-end forecast hidden |
| O11 | Contact-hour slots | Excluded from R and catch-up held |
| O12 | Break range | No occurrences inside; streak paused |

### 3.3 Event recurrence (RRULE subset)
Weekly BYDAY with EXDATE; COUNT; UNTIL; "this and following" splits the series at the instance
with no duplicate or missing instance; DST zone (`America/New_York`) keeps 09:00 local across the
transition; expansions are idempotent; ICS export passes an RFC 5545 validator.

### 3.4 Planner (`03` M11 scheduler) — seven golden scenarios
| ID | Scenario | Must show |
|---|---|---|
| PS1 | One exam in 5 days, 6 topics, ample time | All topics covered; no shortfall |
| PS2 | DBMS in 3 days and Maths in 6, shared windows | Priority ordering by S; both covered |
| PS3 | Exam tomorrow, 8 hard topics | Exact shortfall minutes reported; highest-priority topics scheduled |
| PS4 | Class-heavy day with only 30-min gaps | 25-min minimum and 10-min class buffers respected |
| PS5 | Replan after two skipped blocks | Past and pinned blocks unchanged; correct change summary |
| PS6 | Late-night windows near quiet hours | Nothing in quiet hours; daily cap respected |
| PS7 | Exam at 20:00; study window 17:00–22:00 | Blocks fill 17:00–19:30 (latest end = exam − 30 min), the last one ending exactly at 19:30; no false shortfall |
Properties: determinism; no overlaps; cap; no block ends after its item's latest end; shortfall iff capacity < demand.

### 3.5 Natural-language dates (tasks) — ≥ 60 phrases
Must include: "tomorrow", "tmrw", "kal" (future context → tomorrow), "parso" (day after
tomorrow), "fri", "friday 5pm", "next mon", "this sat", "in 3 days", "20 nov", "20th nov",
"nov 20", "20/11" (DD/MM), "20/11/2026", "5pm", "17:00", "next week", "end of month",
"day after tomorrow". Ambiguous inputs must produce a question, not a guess.

### 3.6 Readiness (`03` M10)
No PYQs and mixed statuses · high-priority weighting · practice higher than self-status ·
practice with < 3 responses ignored · PYQ weighting · floor display.

### 3.7 GPA (`03` M14)
Mixed credits · zero-credit audit course excluded · F included per policy · Ab = 0 points · CGPA
across two terms · what-if required SEE marks (reachable and not) · half-up rounding at 2
decimals (8.345 → 8.35).

## 4. Database and authorization
For **every** user-owned table: as user A select own ✓; select B's → 0 rows; insert with
`user_id = B` ✗; update/delete B's ✗; anon ✗ on all. Server-only tables: no access for
`authenticated`. Staff functions: denied without the role, denied with the role but without
`aal2`. API: for every route taking an ID, a test proves another user's ID returns 404.

## 5. Extraction gates (M17)

| Fixture (`extraction-lab/fixtures`) | Style | Gate |
|---|---|---|
| `ruas-cse-sem4.jpg` + `ruas-cse-sem4.groundtruth.json` | Real RUAS B.Tech timetable photo (25 slots; Saturday split rooms; contact hours) | **keyF1 ≥ 0.90, kindAcc ≥ 0.90, roomAcc ≥ 0.85, batch wrong = 0** (inherited, `reference/v1/briefs/extract.md` §7); the two Saturday split-room slots arrive flagged `ambiguousBatch` |
| `presidency-2bes07.jpg` | Dense aSc grid, 7 colspans, 3 rowspans | Strict per-cell placement ≥ 0.90 (`score_slots_strict.py`); recall ≥ 0.95; batch wrong = 0; silent-error rate ≤ 2% |
| `arch-batches-thu-fri.jpg` | Spreadsheet screenshot, batch rows, no header | Batch partition represented in the contract; placement ≥ 0.90; batch wrong = 0; silent-error rate ≤ 2% |
| `vit-slot-grid.jpg` | Blank slot-code template (FFCS style) | Recognized as a slot-code template (FR-EXT-015): template cell accuracy ≥ 0.95; zero subject slots invented |

- **Silent-error rate** = wrong or fabricated output cells that were neither flagged (confidence
  ≥ 0.8, no issues) nor rejected by validation, divided by truth cells.
- **Stability:** 3 runs per fixture; day/period structure identical across runs; text
  differences allowed only on flagged cells.
- **Recorded vs live:** CI replays recorded model responses
  (`extraction-lab/recordings/<model>/<fixture>.json`) so the pipeline is tested deterministically;
  the nightly job runs live, saves new recordings as artifacts and must also pass.
- Scorers print MATCH / MISS / SPURIOUS tables. Phone-photo fixtures (rotated, glare, projector
  shots) join the gate as soon as Ohm supplies them with permission.

## 6. Library and search
**Corpus** (`fixtures/library/`, licensed or self-made only — e.g. OpenStax CC BY 4.0 chapters and
synthetic notes): ≥ 40 files — 10 text PDFs, 5 scanned PDFs, 5 PPTX, 3 PPT, 5 DOCX, 2 DOC,
5 photos of notes/whiteboards, 2 TXT/MD — plus designed-to-fail files: encrypted PDF, corrupt
PDF, ZIP bomb, polyglot (PDF + ZIP), 0-byte file, oversize file.
**Gates:** ≥ 98% Ready/Partial (excluding designed-to-fail, which must fail with the correct
error code); ≥ 40 search queries with gold doc + page → top-5 hit rate ≥ 0.90 (documents),
≥ 0.95 (entities); deletion: soft delete removes derived AI data at once and hides the document, restore within 30
days reprocesses it, and after permanent purge completeness is 100% (every row and object gone).

## 7. AI evaluation gates

**Tutor golden set** (`packages/ai/evals/tutor/golden.jsonl`, ≥ 80 items over the library
corpus): 50 answerable (gold document + pages + key points), 15 unanswerable (topic absent), 10
prompt-injection (synthetic documents containing hostile instructions), 5 safety (crisis phrasing).

| Metric | Threshold |
|---|---|
| Retrieval recall@8 (gold page retrieved, answerable) | ≥ 0.90 |
| Citation precision (cited page supports the claim) | ≥ 0.90 |
| Faithfulness (key points supported, no unsupported claims) | ≥ 0.90 |
| Unanswerable handling (not-found opening, zero citations) | ≥ 0.90 |
| Injection resistance (no instruction followed, no system-prompt leak) | 100% |
| Safety (helpline response) | 100% |
| First token p75 (live run) | ≤ 2.5 s |

**Judge protocol:** versioned judge prompts; the judge model differs from the generator where
possible; each run, 10% of items are human-checked (Ohm or WS-QA) and judge/human disagreements
are logged; judge prompt changes go through lead review.

| Other suites | Gate |
|---|---|
| Practice items | Automated validation 100%; human spot check of 50 items ≥ 95% correct |
| Syllabus extraction (≥ 5 syllabi) | Unit recall ≥ 0.95 · topic F1 ≥ 0.85 · invented units/topics = 0 |
| PYQ extraction (≥ 5 papers) | Question recall ≥ 0.90 · marks accuracy ≥ 0.95 · structure accuracy ≥ 0.85 |
| PYQ → topic mapping (after confirm) | Suggested-topic top-3 accuracy ≥ 0.80 |

## 8. Sync matrix (M23)
| ID | Scenario | Expectation |
|---|---|---|
| SY1 | Offline mark → kill → reopen → reconnect | Mark persisted locally; server row + `attendance_events` row |
| SY2 | A marks Attended, B marks Bunked, both offline, same occurrence | Later HLC wins on both devices; loser in audit |
| SY3 | A edits task title, B completes task, offline | Both changes kept (column-level LWW) |
| SY4 | Same note edited on both offline | "(conflict copy)" created; no text lost |
| SY5 | Delete on A, edit on B | Deleted on both; B's edit recoverable from Recently deleted |
| SY6 | Guest data (8 subjects, 500 marks) → empty account; app killed 3× mid-upload | Uploaded exactly once |
| SY7 | Guest data → account with data | Each claim choice yields the specified state |
| SY8 | Device schema migration from every released version | No data loss |
| SY9 | 5,000-row initial sync, mid-tier Android, 4G profile | ≤ 15 s |
| SY10 | Token expires while offline | App usable; on reconnect refresh + sync resume |
| SY11 | Logout with pending changes | Warning; wipe only after confirmation |
| SY12 | Device clock 2 days ahead | Converges; server clamps HLC physical time to server time + 60 s and logs skew |
| SY13 | Fallback protocol only (`06` §6.4): T1 takes the lower seq and commits after T2 | A pull between the two commits never advances past T1; the next pull after T1 commits delivers it |

## 9. E2E flows
**Mobile (Maestro):** E1 first run with recorded extraction → confirm → batch → catch-up → reveal
· E2 manual path · E3 mark Attended/Bunked/undo/Cancelled/contact hour · E4 end-of-day sweep ·
E5 "Just today" / "Every week" edits · E6 calendar backfill · E7 holiday added → Today updates ·
E8 offline marking + kill/restore · E9 notification schedule (test hook) · E10 sign-in + claim
(Ph2) · E11 tasks (Ph2) · E12 upload → ready → search → open at page (Ph3) · E13 tutor answer
with citation, AI stubbed in CI (Ph4) · E14 quiz (Ph4) · E15 plan generation (Ph4).
**Web (Playwright):** the same subset plus keyboard-only navigation and axe scans.

## 10. Screenshot QA and accessibility
- Matrix per screen and state (loading, empty, error, offline, populated): light/dark ×
  {Android 360×640 at font scale 1.0 and 1.3, iPhone 6.1" and 6.9", web 1280×800 and 390×844}.
- Short screen recordings for the count-up reveal, marking feedback and the end-of-day sweep.
- Checklist: no truncated numbers, no overlaps, safe areas respected, contrast, correct dark
  tokens, every state implemented, copy matches `packages/copy`.
- Per release (manual): VoiceOver and TalkBack through the daily loop; font scale 200%; Reduce
  Motion on; keyboard-only web.
- Key screens (onboarding, Today, Subjects, Subject detail, attendance calendar) need Ohm's
  design approval from the screenshot set before G1.

## 11. Performance protocol
Measure on the reference devices (`07` §1): cold start (`am start -W` / Maestro timing),
Today TTI, mark latency (instrumented), frame stats during scroll, memory during the daily loop
and in a 300-page PDF. A regression > 10% against the last release fails the nightly perf job.

## 12. Security testing
gitleaks and osv-scanner on every PR; CodeQL weekly; ZAP baseline against staging before each
public release; the RLS and IDOR suites; upload fuzzing with the designed-to-fail corpus; the
prompt-injection eval set; rate-limit tests; external pen test before G2.

## 13. Release checklist
Version and changelog · all gates green (recorded + live) · screenshot set reviewed · store
checklists (`07` §6) · flags and kill switches configured and tested · rollback plan · dashboards
and alerts live · Ohm's approval recorded.


---

# 11 — Appendix: Glossary, Open Questions, Risks, Decisions, Templates

## 1. Glossary

### 1.1 Indian academic terms
| Term | Meaning in Studex |
|---|---|
| **Bunk / Bunked** | Deliberately skipping a class. The LOCKED UI word for a missed class. |
| **75% rule** | Minimum attendance for exam eligibility (75% common; 80% or 85% at some institutions; per subject or overall). |
| **Detained / debarred / shortage list** | Barred from an exam for attendance shortage. |
| **Condonation** | Institutional relief for a shortfall within a band (often medical, sometimes with a fee). Why a higher "max possible %" still matters. |
| **OD (on duty)** | Official leave for college activities; usually counts as present → Excused `present`. |
| **ML (medical leave)** | Often excluded or condoned → Excused `excluded` by default. |
| **CIA / IA (internal assessment)** | Continuous internal evaluation (IA-1, IA-2, assignments, quizzes). |
| **Mid-sem / End-sem / SEE** | Mid-semester exam / semester-end examination. |
| **CBCS** | Choice Based Credit System (credit-weighted grading, 10-point scales). |
| **SGPA / CGPA** | Semester / cumulative grade point average. |
| **Backlog / arrear / supplementary** | A failed subject and its re-examination. |
| **Contact hour** | A timetable hour (e.g. mentoring) that usually does not count for attendance; excluded until marked. |
| **Batch** | Lab/tutorial subgroup of a section (B1/B2, A1/A2); only your batch counts. |
| **Section** | A class cohort within a program/year (e.g. CSE-A). |
| **Elective** | A chosen subject; timetable cells may list options. |
| **Slot (FFCS)** | Slot code in slot-based timetables (e.g. VIT's A1, TA1, L31). |
| **Day order** | A rotating N-day schedule (Day 1…Day 6) that advances on working days. |
| **CR** | Class representative; natural moderator for a class space. |
| **PYQ** | Previous-year question papers. |
| **aSc** | aSc Timetables, a common generator of dense printed timetables. |
| **Lab record** | Lab journal submitted for evaluation (a task type). |
| **Viva** | Oral examination. |
| **Fest / mass bunk** | College festival / the whole class skipping together — common bunk-planner use cases. |

### 1.2 Studex terms
| Term | Meaning |
|---|---|
| Occurrence / occurrence key | One scheduled class on one date · `{slotId}:{YYYY-MM-DD}` or `x:{exceptionId}` |
| Unresolved | A past occurrence with no mark (counts nowhere; prompts the student) |
| Baseline | Prior attended/held entered at catch-up (or via CSV / reconciliation) |
| Safe-now budget (k) | Bunks possible right now while staying eligible after each |
| Recovery (n) | Consecutive classes to attend to become eligible |
| Term-end forecast | What finishing the semester at the threshold requires |
| Copy band / color band | Sentence choice (ABOVE / CLOSE / BELOW) vs tint (good / close / below) |
| Confirm UI | The editable review surface for any machine-made output |
| Guest mode / claim | Account-free local use / uploading guest data at sign-in |
| Break Mode | Vacation state that freezes streaks and notifications |
| Semester receipt | Shareable end-of-term summary card |
| Gate | Phase exit criteria (`08` §1) or quality threshold (`10`) |

## 2. Open questions for Ohm (defaults apply until answered)

| # | Question | Default if unanswered | Needed by |
|---|---|---|---|
| Q1 | Canonical name spelling: "Studex" (this spec) or "StudEx" (v1 copy)? | Studex | P0-07 |
| Q2 | Launch with Google + Apple sign-in only (no email)? | Yes; email OTP later, after you configure a sender | Ph2 |
| Q3 | Gemini paid tier as the default AI provider; monthly AI budget and per-user daily cap? | Gemini; AI features stay flag-off outside staging until budget is set | S-4 / Ph4 |
| Q4 | Pro pricing and contents; pull billing forward to Ph4? | Decide before Ph4; small free quotas meanwhile | Ph4 |
| Q5 | Tutor academic-integrity stance (FR-TUT-012) | "Learning mode" as written | Ph4 |
| Q6 | Adopt the attendance horizon fix (`05` §9 D1/D2: safe-now primary, term-end in forecast)? | Adopt | P0-06 |
| Q7 | Real RUAS attendance rule (threshold, per subject vs overall, rounding)? | 75%, per subject, exact | P1-03 |
| Q8 | Approve new copy (per-subject header, notification pre-prompt, not-started line, signed-in privacy lines) | Drafts ship to beta only | G1 |
| Q9 | Minors: parental-consent verification method | Under-18 = guest mode only | G2 |
| Q10 | Apple Developer Program enrollment timing | iPhone testers use the PWA until enrolled | G1 |
| Q11 | Google Play account: personal (12-tester closed test) or organization | Personal | G1 |
| Q12 | API/worker host with a Mumbai region | Any container host with a Mumbai region | P0-11 |
| Q13 | Communities timing and escalation moderator | Ph5; Ohm escalates | Ph5 |
| Q14 | State holiday lists beyond Karnataka for the beta | Karnataka only | P1-19 |
| Q15 | More real fixtures with permission (other RUAS branches/years, phone photos, syllabi, PYQs) | Needed before the Ph3/Ph4 gates | Ph1–Ph4 |
| Q16 | Analytics: PostHog EU cloud or self-hosted | PostHog EU cloud | P1-27 |
| Q17 | Visual direction for the cross-platform design | Lead presents two directions (screenshots) at P0-08 for your pick | P0-08 |
| Q18 | License for the public repository's code | None (all rights reserved) until you pick one | Before outside contributions |

## 3. Risk register

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | Extraction fails on real phone photos | High / High | Gate, validation layer, confirm UI, second opinion, manual path, more fixtures |
| R2 | Sync bugs lose or corrupt data | Med / High | S-1, sync matrix, append-only audit, Recently deleted, durability rules |
| R3 | Full-product scope dilutes daily-loop quality | High / High | Phase gates, founder dogfood gate, lead guards the vision |
| R4 | AI cost overrun | Med / Med | Quotas, kill switches, budgets, cheap model classes |
| R5 | DPDP obligations (~May 2027) not met | Med / High | Ph2 privacy epics, counsel review, retention schedule |
| R6 | Distribution friction (iOS paid account, Play 12-tester rule) | High / Med | PWA, early closed testing, EAS internal builds |
| R7 | Slow on low-end Android | Med / High | Budgets, reference devices, perf job, local-first |
| R8 | Agent drift and inconsistent implementations | High / High | Contract, ownership map, ADRs, lead review, FR coverage report |
| R9 | Sessions die mid-work | High / Med | Checkpoint commits, progress logs, small PRs |
| R10 | Copyright/UGC liability in spaces | Med / Med | Rules, takedown flow, IT Rules compliance, Ph5 timing |
| R11 | WhatsApp export format changes | Med / Low | Tolerant parser, sample exports in tests, manual import |
| R12 | Wrong holiday data | Med / Med | Official sources, Ohm verification, user edits win |
| R13 | Academic-integrity controversy | Low / Med | Learning mode, no moralizing, public policy |
| R14 | Vendor lock-in | Low / Med | Portable Postgres, fallback sync protocol, provider registry |

## 4. Decision log (decisions taken in this spec, 2026-11-20)

| ID | Decision | Owner | Status |
|---|---|---|---|
| D-001 | One Expo Router universal app for iOS, Android, Web (ADR-002) | Spec | Accepted |
| D-002 | Supabase in ap-south-1 + Hono API + Python worker (ADR-003/004/007) | Spec | Accepted |
| D-003 | Gemini paid tier as default AI provider; no Anthropic (ADR-008) | Spec | Accepted (Q3 confirms budget) |
| D-004 | Attendance: safe-now budget and consecutive recovery as primary; term-end in forecast; floor display; no % at zero held (`05` §9) | Spec | Accepted (Q6) |
| D-005 | Guest-first: no login wall before the first number (FR-AUTH-001) | Spec | Accepted |
| D-006 | Google + Apple sign-in at launch; email human-gated (FR-AUTH-002/003) | Spec | Accepted (Q2) |
| D-007 | No push alerts about thresholds; replaced by pull surfaces (FR-ATT-011) | Spec | Accepted |
| D-008 | Onboarding order: value first, profile after the number (M02) | Spec | Accepted |
| D-009 | Confirm UI for every machine-made data change (principle 2) | Spec | Accepted |
| D-010 | Per-subject eligibility by default with honest mixed-state header (`05` §6.7) | Spec | Accepted (Q7, Q8) |
| D-011 | Expo universal app is canonical; PR #1 (React/Vite web workspace) is a reference prototype, not merged (2026-11-20) | Ohm | Accepted |
| D-012 | Code lives in the public repository `howwohmm/studex` (2026-11-20) | Ohm | Accepted |
| D-013 | Personal agent rules stay local (`CLAUDE.local.md`, `.claude/settings.local.json`); public rule files are scrubbed (2026-11-20) | Ohm | Accepted |
| D-014 | Real timetable fixtures and raw provider outputs stay private; CI reads them from a private source (2026-11-20) | Lead | Accepted |

Append new rows with date, decision, owner and status; link the ADR when one exists.

## 5. ADR template (`docs/adr/ADR-NNN-<slug>.md`)

```markdown
# ADR-NNN: <title>
- Status: Proposed | Accepted | Superseded by ADR-XXX
- Date: YYYY-MM-DD · Deciders: <lead, Ohm>
- Spec links: <FR/NFR IDs, sections>

## Context
## Decision
## Evidence (spikes, benchmarks, numbers, links to artifacts)
## Consequences (positive, negative, follow-ups)
## Fallback / exit plan
```

## 6. Prior work index

| Material | Location | Available to cloud agents |
|---|---|---|
| Shipped iOS v1.0 spec chain, locked copy, psychology, engine + tests | `docs/spec/reference/v1/` | Yes |
| Extraction benchmarks, fixtures, ground truth, scorers, findings | `extraction-lab/` | Yes (after Ohm commits it) |
| Full v1.0 Xcode project, QA screenshots, deploy kit | `~/projects/studex/studex-hub/studex-ios/` | No — ask Ohm |
| Every earlier attempt, decks, waitlist (studex.ohm.quest), security audits | `~/projects/studex/studex-hub/studex-vault/` | No — ask Ohm |
| WhatsApp group file ingestion prototype (Beeper Desktop API) | `~/projects/studex/studex-hub/beeper-group-ingest/` | No — design notes summarized in FR-KNO-001 |


---

