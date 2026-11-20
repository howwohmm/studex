# StudEx — Build Spec v3 (2026-07-02, the definitive one)

StudEx is a native iOS app for Indian college students under the mandatory 75% attendance rule.
It converts attendance anxiety into arithmetic: snap your timetable once, then every day see
today's classes, mark Attended/Bunked in one gesture, and always know your number and your
bunk budget. Files live per subject. Everything stays on the phone.

Gates: product-rule-check = Proceed (2 flows, clear ICP, iOS-only). ios-feasibility = fully
on-device, one hardware caveat (Foundation Models refiner needs iPhone 15 Pro+; the app never
depends on it).

## The law (in priority order)
1. This file.
2. `specs/briefs/hig.md` — per-screen native UI contract (11 screens + 37 violations to avoid).
3. `specs/briefs/extract.md` — extraction ladder, types, algorithms, acceptance gate.
4. `specs/briefs/copy.md` — every UI string. Use verbatim; do not invent copy.
5. `specs/briefs/psych.md` — behavioral rationale; consult when a UI tradeoff arises.

Non-negotiables inherited from the locked BUILD_PROMPT (`specs/BUILD_PROMPT-v2.md`):
"Bunked" vocabulary · systemBlue tint · neutral below-75 tone (number + math, never guilt) ·
3 tabs (Today · Subjects · Settings) · heatmap entered from Subjects' calendar toolbar button ·
system components only · Liquid Glass only via system chrome · no third-party packages ·
no backend, no accounts.

## Architecture
- SwiftUI + SwiftData (5 models), iOS 26.0, single app target + StudexTests (Swift Testing).
- Project uses filesystem-synchronized groups: adding a .swift file under Studex/ or
  StudexTests/ automatically joins the target. NEVER edit project.pbxproj.
- Extraction ladder (specs/briefs/extract.md): VisionKit scan / photo / PDF → Vision
  `RecognizeDocumentsRequest` tables → deterministic grid parser (the product) → optional
  refiners: FoundationModels (Apple Intelligence devices) then Claude API (only if user pasted
  a key in Settings) — refiners only touch low-confidence slots, never silently override,
  everything lands in the editable confirm list.
- No network calls anywhere except the optional Claude refiner.

## Data model (v2 schema + these changes)
- `Subject`: add `@Attribute(.unique)` on `id`. Keep `priorAttended/priorHeld` baselines.
- `ScheduleSlot`: unchanged storage; `ClassKind` gains `case tutorial = 3` (raw Int storage).
  Elective cells resolve to a concrete subject at confirm time — `elective` is never persisted.
- `AttendanceRecord`: unchanged (statuses: unmarked=0, attended=1, bunked=2, notHeld=3).
- `SemesterConfig`: `holidayDates` is now CONSUMED by all forward math (see SemesterCalendar).
- All 5-model lists collapse to `AppModelContainer.allModels` (app, intents, QA, previews).

## SemesterCalendar — the correctness fix (replaces v2's three divergent horizons)
New pure type `Domain/SemesterCalendar.swift`, the ONLY source of scheduled-occurrence math:
```swift
enum SemesterCalendar {
    /// Concrete dates on which `slot` occurs in [from, to], excluding holidays (startOfDay
    /// compare) — weekends included only when the slot's weekday says so.
    static func occurrences(of slot: ScheduleSlot, from: Date, to: Date, holidays: [Date]) -> [Date]
    /// Remaining markable occurrences strictly AFTER `date` (exclusive) up to semester end,
    /// excluding contact hours (they default to notHeld and never enter forward budgets).
    static func remainingScheduled(for subject: Subject, config: SemesterConfig, after date: Date) -> Int
    static func remainingScheduledOverall(subjects: [Subject], config: SemesterConfig, after date: Date) -> Int
}
```
Rules: iterate calendar days from max(after+1day, startDate) → endDate; a slot contributes 1
occurrence per matching weekday-day not in holidays. A multi-period lab is ONE occurrence.
Contact hours and tutorials: tutorials count like lectures; contact hours are excluded from
denominators and budgets unless individually marked. Every surface (Today header, Subjects
rows, Subject Detail, CanIBunk intent, notifications) computes budgets EXCLUSIVELY via
`AttendanceEngine.canMiss/mustAttend` fed by `SemesterCalendar.remaining*`. Delete the
per-view reimplementations and the magic `totalScheduled: 100` fallback.

`AttendanceEngine` stays pure and unchanged in API; keep the +6-point "close" band constant in
ONE place (engine), Theme reads it from there.

## Onboarding (the flow that must be perfect)
fullScreenCover over the TabView, own NavigationStack, steps per hig.md §1–6 + copy.md:
1. Welcome — 3 locked feature lines, "Get Started".
2. Capture — locked headline, Scan (doc camera) / Choose Photo / Choose PDF, small tertiary
   "Enter manually instead" link → jumps straight to an empty Confirm list in add-mode.
3. Extracting — 3-phase progress copy, cancel, failure → ContentUnavailableView with
   Retake / Add Manually. Success haptic.
4. Confirm ("Review") — editable inset list, flagged section pinned ("Check these"), add/edit/
   delete rows, refiner suggestions as "Did you mean …?" chips, semester Section at the bottom:
   start date (pre-filled from header metadata when found, else −6 weeks), end date (+4 months
   editable), holidays footnote pointing at Settings.
5. Batch — only when ≥2 distinct batch tags; inline Picker; picking deletes other-batch slots.
6. Catch Up — per-subject "Held" pre-computed from SemesterCalendar(start→today) as editable
   default, "Attended" numberpad next to it, "I'm just starting" toggle, footer "Not sure?
   Round down." CTA "See My Number".
7. Commit → dismiss cover → Today runs the count-up moment (0 → real overall %). One-time
   TipKit tip on the first class row: swipe right = Attended, swipe left = Bunked.
Re-enterable from Settings ("Rescan Timetable") without wiping records: rescan replaces slots,
keeps subjects (match by normalized code/name), keeps records and baselines.

## Screens
Exactly as hig.md §7–11 with these clarifications:
- Today rows: the NOW class gets `.listRowBackground(Color.blue.opacity(0.08))` + "Now" badge
  text; past-unmarked rows show the dashed circle; marking = swipe/tap-dialog/context-menu.
  Contact-hour rows' dialog offers the 3-way: "Attended" / "Happened — I missed it" (→ bunked)
  / "Didn't happen" (default notHeld). Copy verbatim from copy.md.
- Per-row bunk-budget chip on Today rows (psych: decision-point framing): subtitle gains
  "· 2 to spare" (or "· attend next 1") for that subject, `.secondary`, monospacedDigit.
- Subjects rows: "35 of 38 · Can bunk 3 more" pattern; trailing % green/red.
- Heatmap ("Attendance"): Swift Charts RectangleMark grid + streaks section + day-tap sheet
  with markable rows (backfill mechanism). Streak rule (psych): a day within budget does NOT
  break the streak — streak counts days with no unmarked-overdue classes and no bunk that
  pushed a subject below threshold; simple v1: streak = consecutive days with all held classes
  attended; show "Best" too. Footer explains the rule in one line.
- Settings: per hig.md §11 + Notifications section (two toggles: "Before first class",
  "End-of-day reminder"), Attendance section (threshold stepper 50–95, default 75 + history
  link if cheap), holidays editor (add/remove dates; bundled national list pre-seeded).

## Notifications (psych: exactly two per day, information never judgment)
Redesign NotificationManager:
- T-20 before the first class of each weekday: "First up: {subject} at {time}, {room}."
- 30 min after the last class: "{n} classes from today left to mark." — schedule weekly
  static; on every mark, if today is fully resolved, `removePendingNotificationRequests` for
  today's summary id; re-add on next launch if needed.
- No per-class pings, nothing during class hours, no streak/below-75 alerts. Both toggleable.
- Permission requested in-context: first enable of a toggle OR after first successful
  onboarding commit (pre-prompt rationale from copy.md, then system prompt).

## Intents
`CanIBunkIntent`: reuse `AppModelContainer.allModels`; budgets via SemesterCalendar; spoken
templates from copy.md (three bands). Keep the 3 shortcut phrases.

## Testing (must stay green)
- Engine unit tests (existing 4 + edge cases: threshold ≠ 75, zero remaining, clamps).
- SemesterCalendar tests: holidays excluded, Saturday slots counted, contact hours excluded,
  after-date exclusivity, multi-slot days.
- Grid-parser unit tests on synthetic grids (axis detection, merged cells, batch tags,
  meridiem inference, breaks).
- Extraction acceptance test on the RUAS fixture (StudexTests/Fixtures): keyF1 ≥ 0.90,
  batch-wrong == 0, kinds ≥ 0.90 (see extract.md §7). Marked `.tags(.acceptance)`.
- QARouter (`-qaScreen <key>`) stays; add keys for every new screen incl. heatmap + dialogs.

## Definition of done
Build green · all tests green · every screen screenshot-verified light+dark on iPhone 17 Pro
sim · onboarding drivable end-to-end with the RUAS jpg via the grid parser alone (no key, no
FM) · no custom colors/fonts/cards/pill-buttons anywhere · locked copy verbatim · deploy.sh +
LAUNCH.md ready for a physical iPhone with team P3UFH9W5C6.
