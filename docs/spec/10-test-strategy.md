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

### 3.4 Planner (`03` M11 scheduler) — six golden scenarios
| ID | Scenario | Must show |
|---|---|---|
| PS1 | One exam in 5 days, 6 topics, ample time | All topics covered; no shortfall |
| PS2 | DBMS in 3 days and Maths in 6, shared windows | Priority ordering by S; both covered |
| PS3 | Exam tomorrow, 8 hard topics | Exact shortfall minutes reported; highest-priority topics scheduled |
| PS4 | Class-heavy day with only 30-min gaps | 25-min minimum and 10-min class buffers respected |
| PS5 | Replan after two skipped blocks | Past and pinned blocks unchanged; correct change summary |
| PS6 | Late-night windows near quiet hours | Nothing in quiet hours; daily cap respected |
Properties: determinism; no overlaps; cap; no block after due; shortfall iff capacity < demand.

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
≥ 0.95 (entities); deletion completeness 100% (every derived row and object gone).

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
