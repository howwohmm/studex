# Studex — iOS Build Prompt (v2 · Apple-native)

You are building **Studex**, a native iOS app (SwiftUI) for Indian college students. One job: replace WhatsApp-and-guesswork for daily schedule, attendance tracking, and subject files. Read this whole prompt before writing code. Where this prompt is specific, follow it exactly — don't substitute your own architecture for the parts already decided.

Visual reference: the verified mockups in `mockups/` (open `mockups/index.html`). Build to match those.

---

## What this app is

Two flows. Nothing else on day one.

**Flow A — Schedule + Attendance (merged).** Student opens the app, sees today's classes. Tapping a class marks it **Attended** or **Bunked**. Attendance % updates live, per-subject and overall, the moment they mark it.

**Flow B — Subject Folders.** Student opens a subject, uploads or views files (PDFs, notes, images) tied to that subject. Local storage only, no sync, no backend.

Onboarding (timetable capture), the attendance Calendar/heatmap, and Settings are **not** flows — onboarding is one-time setup, the calendar is a read-only view of Flow A data, settings is config. Do not treat any of them as a third primary path.

---

## Design direction — Apple-native (LOCKED, replaces the old earthy direction)

**Build this the way Apple would. Use what the system ships; don't fight it.**

- **Typography:** SF Pro everywhere via system fonts. Use the built-in text styles (`largeTitle`, `title`, `headline`, `body`, `subheadline`, `footnote`, `caption`) so Dynamic Type works for free. No custom/serif fonts. No bundled font files.
- **Color:** system **semantic** colors only — `Color(.systemGroupedBackground)`, `.secondarySystemGroupedBackground`, `.label`/`.secondaryLabel`/`.tertiaryLabel`, `.separator`. Status semantics: `.green` for attendance ≥ threshold, `.red` for below. Single app **tint = `.blue`** (swap to one brand tint later via `.tint()` — one line). Support **dark mode** for free by using semantic colors only.
- **Components:** `NavigationStack` with large titles; inset-grouped `List` (`.listStyle(.insetGrouped)`); standard `TabView` (Today · Subjects · Settings) with SF Symbols; rows with chevrons and trailing values; `.sheet`/`.confirmationDialog`; swipe actions; context menus. Attendance shown with a **`Gauge`** (Activity-ring style `accessoryCircular` for overall %, linear capacity for per-subject bars).
- **Liquid Glass (iOS 26):** use it the Apple way — on **chrome that floats over content only**: the tab bar (system default in iOS 26), the calendar's subject-filter pill, any floating button. Use `.glassEffect()` / `GlassEffectContainer` / `.buttonStyle(.glass)` for these. **Never** as a background treatment behind content/text.
- **Icons:** SF Symbols only. `.symbolEffect(.bounce/.pulse)` for small micro-interactions (e.g. attendance icon on update). No icon libraries, no custom illustration art for v1 — empty states use SF Symbols.
- **Motion:** native SwiftUI (`withAnimation`, spring, `matchedGeometryEffect`). The one deliberate animated moment: the attendance **% counts up** when it updates after a class is marked (`.contentTransition(.numericText())`). Everything else stays calm.

### Brand & copy (LOCKED — Part A)

- **Vocabulary:** the word is **"Bunked"** (not Skipped/Missed). Use it for the skip action everywhere.
- **Tint:** `systemBlue` unless a brand hex is supplied later.
- **Onboarding headline:** "What do you have today?"
- **Feature lines (onboarding):**
  - "Your day, sorted." — today's classes in order the moment you open
  - "Know your number. Always." — live attendance % the second you mark a class
  - "Never lose a file again." — notes & PDFs filed by subject
- **Empty states:**
  - No classes today → **"Nothing today. Go touch grass."**
  - No files in a subject → **"Empty folder. Drop something in."**
  - Attendance not set up → **"Set up your subjects to see your %."**
- **Below-75% tone — NEUTRAL, never guilt-trippy.** State the number and the math only. e.g. *"You're at 71%. Attend the next 3 classes to reach 75%."* / *"You're at 68%. You can miss 0 more this month to stay safe."* No "uh oh", no alarm language. The whole pitch is replacing anxiety with information — don't reintroduce anxiety through tone.

---

## Screens (6: 5 + 1 read-only viz)

### 1. Onboarding — Timetable Capture
- Apple-style onboarding: SF Symbol hero (`doc.viewfinder`), 3 feature rows (copy above), one filled tint button "Scan Timetable", secondary "Choose Photo or PDF".
- Capture with `VNDocumentCameraViewController` (auto-crop, deskew) — **locked**, not a plain picker.
- Run the **two-pass extraction pipeline** (spec below).
- Show the result as an **editable inset list** before saving — subject, day(s), time, room per row. Any cell editable inline. Low-confidence rows are flagged with `exclamationmark.triangle` in `.red` and a "tap to set" prompt — nothing wrong saves silently.
- If the extraction contains batch-tagged slots, show a one-tap **batch picker** (1/2/…) after the confirm list; otherwise skip it.
- On confirm: persist to Core Data, run the semester calculation, done. Re-enterable from Settings.

### 2. Today View (home / launch destination)
- Large title "Today" + date subtitle.
- Summary card with a **circular Gauge** (overall %) + a neutral status line ("On track · 4 classes to spare before 75%").
- Inset-grouped schedule, time-ordered: time, subject, room. States: **Attended** (green check), **Bunked** (quiet red "Bunked" label, not scary), **NOW** (tinted row + inline Attended/Bunked buttons), **Upcoming** (grey).
- Past-but-unmarked surfaced gently (soft highlight), never alarm-red.
- Empty state per copy above.

### 3. Subjects (list)
- Inset-grouped list, auto-populated. Each row: subject name, "X / Y attended", per-subject % in `.green`/`.red` with a linear Gauge bar, chevron. The 75% line marked on bars.
- **Top-right nav button = calendar icon** → opens the Attendance Calendar (screen 6).

### 4. Subject Detail
- Status card first (attendance % + neutral recovery line).
- Files list: PDFs / images / notes with SF Symbol type glyphs, name, size, date, chevron. **+** button in nav bar.
- Upload via `UIDocumentPickerViewController` (files) and photo library/camera (images). Stored locally via `FileManager`; metadata in Core Data. Preview via `QuickLook`/`QLPreviewController`.
- Empty state per copy above.

### 5. Settings
- Inset-grouped sections: **Timetable** (edit classes, re-scan → loops back to confirm list), **Semester** (start date, end date ≈ +4 months editable, holidays excluded), **Attendance** (75% threshold, attendance history log), **Profile**.

### 6. Attendance Calendar — heatmap (read-only viz of Flow A)
- Opened from Subjects' top-right calendar button.
- **GitHub-style heatmap** of the semester: 7 rows (Mon–Sun) × weeks. Day color = classes attended that day on a `.green` intensity ramp; `.red` for days where a class was bunked; grey for no-class/holiday; light grey for future days.
- A **Liquid Glass filter pill** ("All subjects ▾") to filter the heatmap by subject.
- Stats row: current streak, attended count, bunked count.
- Tap a day → that day's classes. Built with a native `LazyVGrid`. Read-only; no marking here.

---

## Timetable extraction pipeline — two-pass, LOCKED

The only cloud dependency in the app. Build as two passes, not one call:

**Pass 1 — On-device Vision OCR (free, instant, first):**
- `RecognizeDocumentsRequest` (iOS 26+) for structured text + layout/positions; fall back to `RecognizeTextRequest` pre-26.

**Pass 2 — Claude Vision (cloud, structuring + cross-check):**
- Send the original captured image (post doc-scanner) **and** the Pass 1 OCR text/layout as supporting context in one prompt.
- Ask for structured JSON: array of `{subject, days[], startTime, endTime, room}`. Instruct Claude to **trust the image over OCR** when they conflict (OCR is a secondary verification signal).
- Parse JSON into the editable confirm list.
- **API key in Keychain** — never hardcoded, never in a committed plist.

This dual pass exists to catch errors on noisy real-world photos (glare, tilt, dense grids). Pass 1 is a cross-check inside the Pass 2 prompt, not a separate user-facing step.

---

## Data model — Core Data

Get this right before any UI.

- **Subject** — `id`, `name`, `colorTag?`; →many `ScheduleSlot`, →many `AttendanceRecord`.
- **ScheduleSlot** (recurring weekly pattern, NOT calendar events) — `id`, `subject`, `dayOfWeek` (Mon–Sun), `startTime`, `endTime`, `room`, `kind` (lecture/lab/contactHour), `batch?` (nil = everyone; "1"/"2" = batch-specific lab). "Today's classes" is **derived** from this + today's date, **filtered to the student's batch**. Durations are arbitrary (labs span 2–3 periods) — never assume a fixed 1-hour slot.
- **AttendanceRecord** — `id`, `subject`, `date`, `status` (`attended` / `bunked` / `notHeld` / `unmarked`), `scheduleSlot`. One per actual occurrence. `notHeld` = class was cancelled/didn't happen → excluded from BOTH numerator and denominator. `unmarked` = not yet logged → also excluded until resolved.
- **SemesterConfig** — `startDate`, `endDate` (auto ≈ +4 months, editable), `holidayDates` (from the bundled **universal Indian** holiday list, editable).
- **SubjectFile** — `id`, `subject`, `filename`, `localFilePath`, `uploadDate`, `fileType`.

---

## Attendance math — LOCKED

**Semester estimate:** on confirm, `endDate ≈ startDate + ~4 months` (default, editable). Compute `totalScheduledClasses` per subject across the range from each `ScheduleSlot`'s day-of-week pattern, **excluding**:
- Weekends — *unless* a `ScheduleSlot` exists on that weekend day (respect the actual timetable; some colleges hold Saturday classes).
- **Public holidays from a bundled universal Indian calendar.** Ship a static JSON of national/gazetted India holidays for the academic year — **NOT** college- or city-specific. This app is for Indian universities generally, not one college. University calendars vary, so make the holiday list **editable in Settings** (add/remove dates).

**Percentages (live, update immediately on every mark):**
- `heldSoFar` (denominator) = count of records with status ∈ {`attended`, `bunked`} only. `notHeld` and `unmarked` are excluded from both numerator and denominator — a class you forgot to log or that was cancelled never hurts your %.
- Per-subject % = `attended / heldSoFar` (occurrences from `startDate` up to today only).
- Overall % = `Σ attended / Σ heldSoFar` across subjects.

**Class kinds & marking controls:**
- **Lecture / lab** — assumed to happen. Row shows **Attended / Bunked**. (Optional: "Class cancelled" via swipe/menu → `notHeld`, removes it from the denominator.)
- **Contact hour** — assumed NOT to happen by default (`notHeld`, no effect on %). Row shows a **3-way control**: *Attended* (→ counts: num+den), *Happened — I missed it* (→ `bunked`: den only), and the default *Didn't happen* (→ `notHeld`: no effect). So a contact hour only ever touches your % if it actually took place.

**Bunk Tracker (forward-looking, shown wherever % appears — Today header, Subjects, Subject Detail, Calendar):**
- Above 75%: how many more can be missed while staying ≥75% by semester end (denominator = `totalScheduledClasses`).
- Below 75%: how many consecutive must be attended to reach 75%, or flag clearly if not mathematically possible in remaining classes.
- Neutral copy only (see brand section).

---

## No backend

Local-only. **No Supabase, no server, no auth.** The whole app is Core Data + FileManager + the single Claude API call (onboarding/re-extraction only). No accounts/login beyond a minimal local profile. No multi-device sync in this version.

---

## Stack — final

SwiftUI · Core Data · FileManager · Vision (`RecognizeDocumentsRequest`/`RecognizeTextRequest`) · VisionKit (`VNDocumentCameraViewController`) · QuickLook (`QLPreviewController`) · `Gauge` · Liquid Glass (`.glassEffect()`/`.buttonStyle(.glass)`) · `LazyVGrid` (heatmap) · `UNUserNotificationCenter` (optional "class starting soon", only if time allows) · Claude API (single external dependency) · bundled universal-India holidays JSON. **No third-party UI/animation libraries. No backend.**

---

## Build priority order

1. Core Data model (Subject, ScheduleSlot, AttendanceRecord, SemesterConfig, SubjectFile).
2. Onboarding + two-pass extraction (doc scanner → Vision OCR → Claude → editable confirm list).
3. Semester/holiday calc + attendance math (per-subject + overall %, bunk tracker).
4. Today View (the daily-habit screen — must feel right). **Ship to TestFlight here once an Apple Dev account exists; until then run in Simulator.**
5. Subjects list + Subject Detail (file upload/preview).
6. Attendance Calendar heatmap.
7. Settings.
8. Polish pass — tint, the count-up % moment, Liquid Glass chrome, empty states, dark mode check.

---

## Apple HIG compliance — MANDATORY

Reference is on disk: `~/apple-hig/agent-docs/` (Liquid Glass era, Dec 2025). **Before writing any UI for a component, grep `RULES.md` for it** (e.g. `Tab bars`, `Sheets`, `Gauges`, `Onboarding`, `Launching`) and follow the do/don't rules. Don't guess Apple conventions.

Concrete rules already audited for this app:
- **Tab bar = navigation only, never actions.** Keep it always visible; never disable/hide its buttons even when content is empty; always show labels (Today · Subjects · Settings). ✓ matches mockups.
- **Liquid Glass:** use it **sparingly** and **never in the content layer**. Standard system components (`TabView`, toolbars, sheets) pick up the glass material **automatically in iOS 26 — don't hand-roll a custom glass bar**; the mockups only fake it for preview. Apply color on glass sparingly (status/primary actions only).
- **Gauge (attendance):** pick ring vs linear by the data; write succinct accessible labels for the current value + both endpoints (VoiceOver reads them); optional gradient fill.
- **Extraction loading:** show a clear **determinate-feeling** progress state during the Claude call; keep it moving; never an unlabeled stalled spinner. Communicate it may take a few seconds.
- **Onboarding:** brief, focused on the app (not teaching the OS), correct order, no licensing text. Request **camera permission in-context** when the student taps "Scan Timetable" (explain why right there).
- **Launch screen:** minimal, **near-identical to the first screen, no logo/text/branding splash** (it's not a branding moment). Avoid text (won't localize).

## Real-timetable findings (test fixture: `timetables/ruas-cse-sem4.*`)

A real RUAS B.Tech timetable was transcribed to `ruas-cse-sem4.groundtruth.json` (use as the extraction accuracy benchmark). It exposes requirements the extractor + data model MUST handle:
1. **Saturday has classes** → confirms: do NOT blanket-exclude Saturday; respect the actual slots.
2. **Labs span 2–3 periods** → arbitrary slot durations (handled via `kind`/start/end).
3. **Batch-specific labs (Batch 1 / Batch 2)** → a student attends only their batch. **Conditional:** if (and only if) the extracted timetable contains batch-tagged slots, onboarding asks the student's batch (simple picker); if no batches are detected, skip the question entirely. Attendance then counts only their batch's slots (else lab denominators double-count). Confirm screen can still drop the other batch's rows.
4. **"Contact Hour" cells** → `kind: contactHour`; 3-state marking (see Attendance math): default `notHeld` (no effect), can be set to attended or "happened-I-missed-it" (`bunked`). Never silently counted.
5. **Electives with split rooms** (`D-306 (B1) / D-404 (B2)`) → room can be batch-dependent.
6. **No End Date printed** (start 22 Sep 2025 given) → confirms the ~4-month auto-estimate is needed; semester start is dynamic (not always April).
7. **Same subject twice in one day** (back-to-back) → multiple slots per subject per day are normal.

## Status of external inputs (from the product owner)

- ✅ Vocabulary, copy, tint, illustrations decision — locked (above).
- ✅ Claude API key — present as `ANTHROPIC_API_KEY` in shell env for local pipeline testing; the app stores it in **Keychain**.
- ⏸ Apple Developer account — skipped for now; build/run in Simulator until enrolled.
- ✅ Real timetable — `timetables/ruas-cse-sem4.{jpg,pdf}` + ground-truth JSON. More may drop.
- ✅ Holidays — bundled universal Indian calendar, editable in Settings (not college-specific).
