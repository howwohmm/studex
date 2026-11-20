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
