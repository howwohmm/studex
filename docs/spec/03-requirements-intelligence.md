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
