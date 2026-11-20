# How It Works

_Last updated: 2026-07-08 (v1.0)_

## What this project is
StudEx is a native iOS app for Indian college students living under the mandatory 75%
attendance rule. One-time setup: photograph your paper/PDF timetable and the app reads your
whole week. Daily: open (or glance), see today's classes, mark Attended/Bunked in one swipe,
and always know two numbers — your attendance % and your **bunk budget** (how many more you
can miss, or how many you must attend to recover). Files (notes/PDFs) live per subject.
Everything stays on the phone: no backend, no accounts.

## The mental model
1. **A timetable is a weekly pattern, not calendar events.** `ScheduleSlot` = (weekday,
   start/end minutes, room, kind, batch). "Today's classes" is derived.
2. **Attendance is a fold.** Baseline counts from mid-semester catch-up (`priorAttended/
   priorHeld`) + one `AttendanceRecord` per (slot, day). `unmarked` and `notHeld` never touch
   the math — honesty is cheaper than lying.
3. **The budget is forward-looking.** `SemesterCalendar` turns slots + semester dates +
   holidays into remaining occurrences; `AttendanceEngine.canMiss/mustAttend` turns those
   into the sentences the whole app speaks.
4. **Extraction is a ladder, not a model call.** Vision table detection → deterministic grid
   parser (the product) → optional on-device Foundation Models refiner → optional Claude
   refiner (only if the user pastes a key). Everything lands in an editable confirm list;
   nothing wrong saves silently.

## Architecture
```
Studex/
  App/            StudexApp · RootView (onboarding gate) · MainTabView (3 tabs) · QARouter
  Domain/         AttendanceEngine · SemesterCalendar · Standing(+Formatter) · Marking · Enums
  Models/         SwiftData @Models: Subject · ScheduleSlot · AttendanceRecord ·
                  SemesterConfig · SubjectFile   (AppModelContainer.allModels)
  Services/       TimetableExtractor (ladder) · GridParser · OCRService (RecognizeDocuments)
                  · FMRefiner · ClaudeRefiner · ImageIngest · NotificationManager · Config/Keychain
  Features/       Onboarding/ · Today/ · Subjects/ · SubjectDetail/ · Attendance/ · Settings/
  DesignSystem/   Theme (tint + band) · Components · Feedback (sensory constants)
  Intents/        CanIBunkIntent ("Can I bunk today?" via Siri/Shortcuts)
StudexTests/      Engine · SemesterCalendar · Standing · GridParser · RUAS acceptance gate
specs/            SPEC.md (the law) + briefs/ (hig · extract · copy · psych)
```

## Data flow (a mark)
Swipe on a Today row → `AttendanceMarker.mark(slot:on:as:context:)` find-or-creates the
record → SwiftData saves → `SubjectStanding/OverallStanding.compute` re-derive → gauge and
budget lines animate via `.contentTransition(.numericText())` → end-of-day reminder is
cancelled if everything is resolved.

## External dependencies
None at runtime, by design. Optional single cloud call: Anthropic Messages API from
`ClaudeRefiner` when (and only when) the user stores a key (Keychain, service
`quest.ohm.studex`).

## How to run it locally
```bash
cd ~/projects/studex-ios
./deploy.sh --sim        # simulator
./deploy.sh              # connected iPhone (see LAUNCH.md)
xcodebuild test -project Studex.xcodeproj -scheme Studex \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -parallel-testing-enabled NO                               # full test suite
```

## Where things live
- Attendance math: `Studex/Domain/` (pure; no SwiftUI imports)
- Locked UI copy: `specs/briefs/copy.md` (strings used verbatim in code)
- Extraction accuracy gate: `StudexTests/ExtractionAcceptanceTests.swift` +
  `StudexTests/Fixtures/ruas-cse-sem4.*` (keyF1 ≥ 0.90 required; currently keyF1 0.960,
  kind accuracy 1.000, wrong batches 0 — rungs 1+2 alone, no AI refiners)
- Screenshot automation: launch arg `-qaScreen <welcome|capture|confirm|catchup|today|
  subjects|detail|attendance|settings|main>` (DEBUG only, `App/QARouter.swift`)

## Gotchas
- **Never edit `Studex.xcodeproj/project.pbxproj`** — filesystem-synchronized groups pick up
  any `.swift` under `Studex/` and `StudexTests/` automatically.
- Keep xcodebuild derived data OUTSIDE the repo (in-repo `.build` corrupted module caches).
- Run tests with `-parallel-testing-enabled NO` — parallel test clones wedge the simulator
  ("Application failed preflight checks / Busy").
- `Weekday` is Mon=1…Sun=7 app-wide; `Calendar`'s Sun=1 is remapped at the edges only.
- Contact hours default to `notHeld` and are excluded from every denominator and budget until
  a student explicitly marks them.
- Free-team device installs expire after 7 days — rerun `./deploy.sh`.
