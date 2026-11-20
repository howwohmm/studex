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
  0 ≤ attended ≤ held.
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
  reconciliation, with change history; 0 ≤ attended ≤ held.
- **FR-ATT-003 (P0) Marking.** States: Unmarked (no record), Attended, Bunked, Cancelled, and
  Excused (if enabled; kind on-duty / medical / other). Exactly one current mark per occurrence;
  re-marking replaces; unmarking returns to Unmarked. Sources: Today row, subject ledger,
  calendar day sheet (backfill), widget, notification action, end-of-day sweep, CSV import.
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
  bunked); preview with row-level errors before commit; atomic import; export includes baselines
  and marks.
- **FR-ATT-013 (P1, Ph2) Checkpoints.** User-defined cut-off dates ("IA-1 attendance check, 15
  Sep") → standing as of the checkpoint and forecast to it.
- **FR-ATT-014 (P2, Ph4) Portal reconciliation.** Import a screenshot of the college portal's
  attendance page → M17 extraction → side-by-side "Portal 34/42 · Studex 33/41" per subject →
  adjust baseline in one tap (audit-logged). Never ask for or store portal credentials.
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
- **FR-KNO-011 (P0) Deletion.** Removes original, renditions, extracted text, chunks,
  embeddings, index entries, thumbnails and AI caches derived from it. Tutor citations render
  "Source deleted". Notes keep their quoted text but lose the link. Storage freed within 24 h.
  An audit event without content is retained.
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
