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
