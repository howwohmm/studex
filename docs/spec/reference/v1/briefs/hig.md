Spec follows. All r4 screenshots reviewed against the approved mockups (`01-onboarding-capture`, `02-onboarding-confirm`, `03-today-view`). Note for the build agents: `subjects.png`, `insights.png`, and `settings.png` render completely blank — those screens must be built from this spec, not patched.

---

# StudEx — Definitive Native UI Pattern Spec (iOS 26, SwiftUI)

## 0. GLOBAL RULES (apply before any screen work)

**Tint.** One tint: `.tint(.blue)` on the root view / `AccentColor` asset = system blue. Delete every custom colorset (the r4 indigo `#6C5CE7`-family is banned). The only other colors permitted anywhere: `.green` (attended / ≥75%), `.red` (Bunked / <75%), `Color(.systemGroupedBackground)`, `Color(.secondarySystemGroupedBackground)`, `.primary`, `.secondary`, `.tertiary`, `Color(.systemFill)`. No hex, no gradients, no per-subject accent colors.

**Structure.** Root = `TabView` with iOS 18+ `Tab` builders:
```swift
TabView {
  Tab("Today", systemImage: "calendar.day.timeline.left") { TodayView() }
  Tab("Subjects", systemImage: "folder") { SubjectsView() }
  Tab("Settings", systemImage: "gearshape") { SettingsView() }
}
```
Each tab owns its own `NavigationStack`. Optional: `.tabBarMinimizeBehavior(.onScrollDown)`. Onboarding is a `.fullScreenCover` over the TabView (shown while `!hasOnboarded`) containing its own `NavigationStack`; completion dismisses it and lands on Today.

**Liquid Glass.** Comes ONLY from system chrome: tab bar, navigation bars, toolbars (including `.bottomBar`), sheets. Never call `.glassEffect()`, never use `.buttonStyle(.glass)` / `.glassProminent` in content, never `UIVisualEffectView`, never place glass behind content. Onboarding primary CTAs live in `ToolbarItem(placement: .bottomBar)` so they sit on the system glass bar for free; if bottomBar sizing fights, fall back to `safeAreaInset(edge: .bottom)` on a plain background — no material.

**Typography.** System text styles only (`.largeTitle .title .title2 .title3 .headline .subheadline .body .callout .footnote .caption`). Max weight `.bold()`. `.monospacedDigit()` on every time, count, and percentage. One fixed-size exception: the onboarding hero SF Symbol (`.font(.system(size: 64))`), marked `.accessibilityHidden(true)`.

**Lists.** Everything scrollable is `List` or `Form` with `.listStyle(.insetGrouped)`. No hand-built `VStack + RoundedRectangle + shadow` cards, ever.

**The one animated moment (exactly one).** Percentage count-up:
```swift
Text(pct, format: .percent.precision(.fractionLength(0)))
  .monospacedDigit()
  .contentTransition(.numericText(value: Double(pct)))
```
driven by `withAnimation(.snappy(duration: 0.6)) { model.mark(...) }`. It fires in two places (Today summary gauge label; Subject Detail hero %) and once at onboarding completion landing on Today. Everything else uses default implicit animations. No Lottie, no confetti, no custom springs.

**Sensory feedback (`.sensoryFeedback(_:trigger:)`).**
- Mark Attended → `.success`
- Mark Bunked → `.impact(weight: .medium)` (neutral — NEVER `.error`; no punishment haptics)
- Clear/undo mark, batch select → `.selection`
- Extraction finished → `.success`

**Locked copy (verbatim, case-sensitive).**
| Where | String |
|---|---|
| Action word | "Bunked" (never "Skipped"/"Missed"/"skip") |
| Onboarding capture headline | "What do you have today?" |
| Welcome feature lines | "Your day, sorted." / "Know your number. Always." / "Never lose a file again." |
| Today empty (no classes today) | "Nothing today. Go touch grass." |
| Files empty | "Empty folder. Drop something in." |
| No subjects yet (Today + Subjects) | "Set up your subjects to see your %." |
| Below-75 line pattern | "You're at 71%. Attend the next 3 to reach 75%." |
| At/above-75 line pattern | "4 classes to spare before 75%." / "You can bunk N more and stay above 75%." |

Below-75 states change the number, the tint, and the math sentence. Nothing else. No warnings, no exclamation icons, no "danger zone" copy.

**Dynamic Type + VoiceOver (global).** No fixed frames on text. All multi-element rows: `.accessibilityElement(children: .combine)`. Icon-only toolbar buttons use `Button("Label", systemImage:)` so the label is free. At `dynamicTypeSize.isAccessibilitySize`: Today rows switch HStack→VStack (use `ViewThatFits` or an environment check), gauges drop `scaleEffect` and show plain text %. Swipe actions are exposed automatically as VoiceOver custom actions — that is why swipes are the primary marking gesture.

---## 1. WELCOME (onboarding page 1)

- **Nav:** first screen inside onboarding `NavigationStack`, `.toolbar(.hidden, for: .navigationBar)`.
- **Layout:** `VStack`: Spacer → `Text("Welcome to StudEx").font(.largeTitle).bold()` → three feature rows (the standard Apple welcome pattern): each is `Label` laid as `HStack { Image(systemName:).font(.title2).foregroundStyle(.tint).frame(width: 44) ; VStack(alignment: .leading) { Text(line).font(.headline); Text(caption).font(.subheadline).foregroundStyle(.secondary) } }`:
  - `calendar.day.timeline.left` — "Your day, sorted." — "Today's classes, one tap to mark."
  - `percent` — "Know your number. Always." — "Live attendance and how many you can bunk."
  - `folder` — "Never lose a file again." — "Notes and PDFs, per subject, on this iPhone."
- **CTA:** `ToolbarItem(placement: .bottomBar) { Button("Get Started") { path.append(.capture) }.buttonStyle(.borderedProminent).controlSize(.large).frame(maxWidth: .infinity) }`
- **A11y:** each feature row `.accessibilityElement(children: .combine)`.

## 2. ONBOARDING CAPTURE — "What do you have today?"

Matches mockup 01.

- **Nav:** pushed; `.navigationBarTitleDisplayMode(.inline)`, empty title; system back to Welcome.
- **Content (centered VStack):** `Image(systemName: "doc.viewfinder").font(.system(size: 64)).foregroundStyle(.tint)` (decorative, hidden from VoiceOver) → `Text("What do you have today?").font(.title).bold().multilineTextAlignment(.center)` → `Text("Snap a photo of your timetable — paper or PDF. StudEx reads the whole week.").font(.subheadline).foregroundStyle(.secondary)`.
- **Buttons (bottom, VStack spacing 12 in `safeAreaInset(edge: .bottom)`):**
  1. `Button { showScanner = true } label: { Label("Scan Timetable", systemImage: "camera.viewfinder").frame(maxWidth: .infinity) }.buttonStyle(.borderedProminent).controlSize(.large)`
  2. `PhotosPicker(selection: $photoItem, matching: .images) { Label("Choose Photo", systemImage: "photo.on.rectangle").frame(maxWidth: .infinity) }.buttonStyle(.bordered).controlSize(.large)`
  3. `Button { showImporter = true } label: { Label("Choose PDF", systemImage: "doc").frame(maxWidth: .infinity) }.buttonStyle(.bordered).controlSize(.large)` + `.fileImporter(isPresented: $showImporter, allowedContentTypes: [.pdf])`
- **Scanner:** `fullScreenCover` wrapping `VNDocumentCameraViewController` (VisionKit) via `UIViewControllerRepresentable`. The system document scanner IS the capture UI — no custom camera, no custom crop.
- **Verbs:** "Choose", never "Upload" (nothing uploads; local-only).

## 3. EXTRACTION PROGRESS

- **Nav:** pushed automatically after input; `.navigationBarBackButtonHidden(true)` while running; `ToolbarItem(placement: .cancellationAction) { Button("Cancel", role: .cancel) }`.
- **Content:** centered `ProgressView().controlSize(.large)` + phase `Text` (`.headline`) cycling "Reading your timetable…" → "Finding classes…" → "Building your week…" with `.contentTransition(.opacity)`. Indeterminate only — no fake percentages, no Lottie, no custom spinner.
- **Claude booster:** if a key is stored, add `.footnote` `.secondary`: "Using your Claude key for better extraction." Same UI otherwise (on-device Vision path).
- **Failure:** `ContentUnavailableView { Label("Couldn't read that", systemImage: "exclamationmark.triangle") } description: { Text("Try a straighter photo, or add classes manually.") } actions: { Button("Retake").buttonStyle(.borderedProminent); Button("Add Manually").buttonStyle(.bordered) }`. Neutral tone.
- **Success:** `.sensoryFeedback(.success, trigger: finished)`, auto-push Confirm.

## 4. CONFIRM LIST — "Does this look right?"

Matches mockup 02.

- **Nav:** pushed; `.navigationTitle("Review")`, `.navigationBarTitleDisplayMode(.inline)`, system back. `ToolbarItem(placement: .topBarTrailing) { Button("Add Class", systemImage: "plus") }` → blank edit form.
- **List:** `List` `.listStyle(.insetGrouped)`. First Section header (with `.textCase(nil)`): `Text("Does this look right?").font(.title2).bold().foregroundStyle(.primary)` + `Text("Tap any class to edit. We flagged \(n) to check.").font(.subheadline).foregroundStyle(.secondary)`.
- **Row anatomy (one row per subject schedule):** `NavigationLink(value: classItem)` containing `VStack(alignment: .leading, spacing: 2)`: `Text(name).font(.headline)`; `Text("Mon Wed Fri · 09:00–10:00 · Room 301").font(.subheadline).foregroundStyle(.secondary)` — en dash in time ranges, `·` separators. Chevron comes from NavigationLink; no leading decorative icons (mockup has none).
- **Flagged (low-confidence) rows:** `.listRowBackground(Color.red.opacity(0.08))` + trailing `Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.red)` + `.accessibilityValue("Needs review")`. No "tap to set" string — the row is still a normal editable row.
- **Delete:** trailing `.swipeActions { Button("Delete", systemImage: "trash", role: .destructive) }`.
- **Edit form (pushed):** `Form`: `TextField("Subject name")`, `TextField("Room")`, day multi-select (Section of 7 `Toggle`s or inline multi-picker), `DatePicker("Starts", displayedComponents: .hourAndMinute)`, `DatePicker("Ends", …)`, `Picker("Type")` (Lecture/Lab/Tutorial, `.pickerStyle(.menu)`), bottom Section `Button("Delete Class", role: .destructive)`.
- **CTA:** bottomBar toolbar `Button("Looks Right").buttonStyle(.borderedProminent).controlSize(.large).frame(maxWidth: .infinity)`.

## 5. BATCH PICK (conditional)

Shown only if extraction detected multiple batch/section tokens; otherwise skipped silently.

- **Nav:** pushed; inline title "Your Batch". `ToolbarItem(placement: .topBarTrailing) { Button("Skip") }`.
- **Content:** `List(.insetGrouped)` with a single inline picker: `Picker("Batch", selection: $batch) { ForEach(batches) { Text($0.name) } }.pickerStyle(.inline)` — gives the standard settings-style checkmark list free, with VoiceOver for free. Section footer: "We'll only track classes for your batch."
- **CTA:** bottomBar `Button("Continue").buttonStyle(.borderedProminent)`. `.sensoryFeedback(.selection, trigger: batch)`.

## 6. MID-SEMESTER CATCH-UP — "so the first number is real"

- **Nav:** pushed; inline title "Catch Up". `ToolbarItem(placement: .topBarTrailing) { Button("Skip") }` (skip = fresh start).
- **Body:** `Form` (inset-grouped automatically):
  - **Section 1:** `DatePicker("Semester started", selection: $start, in: ...Date.now, displayedComponents: .date)` (compact system style renders the gray capsule natively). Footer: "Used to work out how many classes have already happened."
  - **Section 2:** `Toggle("I'm just starting (0 so far)", isOn: $fresh)`. Footer: "Turn this on if no classes have been held yet." When on, Section 3 gets `.disabled(true)`.
  - **Section 3 — header "Catch me up":** one Section per subject, header = "CS201 · Data Structures". Two rows each, Held first:
    - `LabeledContent("Held") { TextField("0", value: $held, format: .number).keyboardType(.numberPad).multilineTextAlignment(.trailing).frame(maxWidth: 80) }`
    - Same for "Attended", clamped `attended ≤ held`; if violated, Section footer `Text("Attended can't be more than held.").foregroundStyle(.red)` and CTA disabled.
    - Keyboard toolbar: `ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Done") { focus = nil } }`. (TextField over Stepper: real values are 20–60; a stepper is 40 taps. Do not build custom −/+ capsule pairs.)
- **CTA:** bottomBar `Button("See My Number").buttonStyle(.borderedProminent)`. On tap: persist, dismiss onboarding cover → Today performs the count-up moment from 0 to the real overall %.

## 7. TODAY TAB

Matches mockup 03.

- **Nav:** `NavigationStack`, `.navigationTitle("Today")`, `.navigationBarTitleDisplayMode(.large)`, `.navigationSubtitle(Date.now.formatted(.dateTime.weekday(.wide).day().month(.wide)))` → "Thursday, 20 June" (respects en-IN locale). No toolbar items.
- **Body:** `List` `.listStyle(.insetGrouped)`.
  - **Section 1 — summary (no header), one row:** `HStack(spacing: 16)`:
    - `Gauge(value: overall, in: 0...1) { } currentValueLabel: { Text(pct, format: .percent.precision(.fractionLength(0))).monospacedDigit().contentTransition(.numericText(value: Double(pct))) }.gaugeStyle(.accessoryCircularCapacity).tint(overall >= 0.75 ? .green : .red).scaleEffect(1.4).frame(width: 80, height: 80)` — THE animated moment lives here. At accessibility type sizes, drop the gauge and show the % as `.largeTitle` text.
    - `VStack(alignment: .leading, spacing: 4)`: `Text("Overall attendance").font(.caption).textCase(.uppercase).foregroundStyle(.secondary)` → `Text(status).font(.title3).bold()` where status = "On track" (≥75) / "Below 75" (<75, neutral) → `Text(budgetLine).font(.subheadline).foregroundStyle(.secondary)` where budgetLine = "4 classes to spare before 75%." or "Attend the next 3 to reach 75%."
    - Row: `.accessibilityElement(children: .ignore)` + `.accessibilityLabel("Overall attendance \(pct) percent. \(budgetLine)")`.
  - **Section 2 — `Section("Schedule · \(count) classes")`:** one row per class, sorted by start time:
    - Leading time column `VStack(alignment: .leading)`: `Text(start, format: .dateTime.hour().minute()).font(.headline).monospacedDigit()` + `Text("1h").font(.caption).foregroundStyle(.secondary)`; `.frame(minWidth: 52, alignment: .leading)`.
    - Middle `VStack(alignment: .leading, spacing: 2)`: `Text(subject).font(.headline)` + `Text("Room 301")` / `"Lab-3 · Lab"` `.font(.subheadline).foregroundStyle(.secondary)`.
    - Trailing status: unmarked → `Image(systemName: "circle.dashed").foregroundStyle(.tertiary)`; Attended → `checkmark.circle.fill` `.foregroundStyle(.green).font(.title2)`; Bunked → `xmark.circle.fill` `.foregroundStyle(.red).font(.title2)`.
    - **Marking (no pill buttons, three redundant native paths):**
      1. `.swipeActions(edge: .leading, allowsFullSwipe: true) { Button("Attended", systemImage: "checkmark") { mark(.attended) }.tint(.green) }`
      2. `.swipeActions(edge: .trailing, allowsFullSwipe: true) { Button("Bunked", systemImage: "xmark") { mark(.bunked) }.tint(.red) }`
      3. Row tap → `confirmationDialog("\(subject) — \(time)", isPresented:, titleVisibility: .visible)`: `Button("Attended")`, `Button("Bunked", role: .destructive)` (role gives red text = locked status color; copy stays neutral), Cancel. Marked rows' dialog offers "Change to …" + `Button("Clear Mark")`.
      4. `.contextMenu` mirroring the same three actions.
    - Marking updates Section 1 inside `withAnimation(.snappy(duration: 0.6))` → count-up plays on every mark.
  - **Empty states:** zero subjects → replace list with `ContentUnavailableView { Label("Set up your subjects to see your %.", systemImage: "square.grid.2x2") } actions: { Button("Scan Timetable").buttonStyle(.borderedProminent) }`. Subjects exist, no classes today → keep Section 1, Section 2 shows `ContentUnavailableView("Nothing today. Go touch grass.", systemImage: "sun.max")` on `.listRowBackground(Color.clear)`.
- **A11y:** class rows `.accessibilityElement(children: .combine)`, `.accessibilityValue("Attended" / "Bunked" / "Not marked")`, `.accessibilityHint("Double tap to mark.")`.

## 8. SUBJECTS TAB

- **Nav:** `.navigationTitle("Subjects")` large. Toolbar: `ToolbarItem(placement: .topBarTrailing) { Button("Attendance Calendar", systemImage: "calendar") }` → pushes Heatmap (locked entry point); optional second `Button("Add Subject", systemImage: "plus")`.
- **Body:** `List(.insetGrouped)`, one row per subject as `NavigationLink(value: subject)`:
  - `VStack(alignment: .leading, spacing: 2)`: `Text(name).font(.headline)`; `Text("35 of 38 · Can bunk 3 more").font(.subheadline).foregroundStyle(.secondary)` (below 75: "27 of 38 · Attend next 4 for 75%").
  - Trailing: `Text("92%").font(.body).monospacedDigit().foregroundStyle(pct >= 75 ? .green : .red)` + system chevron. Do NOT use `.badge()` (gray only — loses status semantics). No per-row gauges; rings are reserved for Today summary and Detail.
- **Empty:** `ContentUnavailableView { Label("Set up your subjects to see your %.", systemImage: "folder") } actions: { Button("Scan Timetable").buttonStyle(.borderedProminent) }` (re-presents capture flow as a sheet).
- **A11y:** row combined: "Data Structures, 92 percent, 35 of 38 attended, can bunk 3 more."

## 9. SUBJECT DETAIL

- **Nav:** pushed from Subjects; `.navigationTitle(subject.name)`, `.navigationBarTitleDisplayMode(.inline)` (long names), system back. Toolbar: one `Menu` (`label: Image(systemName: "ellipsis.circle")`): `Button("Add File", systemImage: "doc.badge.plus")` (fileImporter: .pdf, .image), `Button("Add Photo", systemImage: "photo.badge.plus")` (PhotosPicker), Divider, `Button("Edit Subject", systemImage: "pencil")` (sheet Form incl. Held/Attended correction fields), `Button("Delete Subject", systemImage: "trash", role: .destructive)` → `confirmationDialog` confirm.
- **Body:** `List(.insetGrouped)`:
  - **Section "Attendance":**
    - Hero row: `VStack(alignment: .leading, spacing: 8)`: `HStack(alignment: .firstTextBaseline) { Text(pct, format: .percent.precision(.fractionLength(0))).font(.largeTitle).bold().monospacedDigit().contentTransition(.numericText(value:)).foregroundStyle(statusColor); Spacer(); Text(status).font(.subheadline).foregroundStyle(.secondary) }` then `Gauge(value: pct, in: 0...100).gaugeStyle(.linearCapacity).tint(statusColor)` with hidden labels. No hand-drawn 75% tick — the threshold is stated in the footer.
    - `LabeledContent("Attended", value: "35")`, `LabeledContent("Held", value: "38")`, `LabeledContent("Bunked", value: "3")` — values `.monospacedDigit()`.
    - **Section footer = the math line (locked tone):** "You can bunk 3 more and stay above 75%." / "You're at 71%. Attend the next 3 to reach 75%."
    - Count-up animates on push via `withAnimation` in `.task`.
  - **Section "Files":** rows: `Label { VStack(alignment: .leading) { Text(filename).lineLimit(1).truncationMode(.middle); Text(added, format: .dateTime.day().month().year()).font(.caption).foregroundStyle(.secondary) } } icon: { Image(systemName: iconFor(type)) /* doc.text, doc.richtext, photo */ .foregroundStyle(.tint) }`.
    - Tap → `.quickLookPreview($previewURL, in: fileURLs)` (system viewer for PDF/images).
    - Trailing swipe: Delete (`role: .destructive`). `.contextMenu`: `ShareLink(item: url)`, `Button("Rename", systemImage: "pencil")` (`.alert` with `TextField`), Delete.
    - Empty: `ContentUnavailableView { Label("Empty folder. Drop something in.", systemImage: "folder") } actions: { Button("Add File").buttonStyle(.bordered) }`.
- **A11y:** hero row `.accessibilityElement(children: .ignore)` with full sentence label including the footer math.

## 10. HEATMAP + STREAKS ("Attendance")

- **Entry:** ONLY the calendar toolbar button on Subjects (locked). Pushed, `.navigationTitle("Attendance")` large. Toolbar: `Menu` with `Picker("Subject", selection: $filter)` ("All Subjects" + each), label `line.3.horizontal.decrease.circle`.
- **Body:** `List(.insetGrouped)`:
  - **Section "Streaks":** `LabeledContent { Text("6 days") } label: { Label("Current streak", systemImage: "flame") }`; same for "Best streak"; `LabeledContent("This week", value: "4 of 5 attended")`. Footer: "Streaks count days with every class attended."
  - **Section "Semester":** Swift Charts heatmap in one row:
    ```swift
    Chart(days) { day in
      RectangleMark(x: .value("Week", day.week), y: .value("Day", day.weekdaySymbol))
        .foregroundStyle(by: .value("Status", day.status))
        .cornerRadius(2)
    }
    .chartForegroundStyleScale(["Attended": .green, "Partly": .green.opacity(0.4), "Bunked": .red, "No class": Color(.systemFill)])
    .chartLegend(position: .bottom)
    .chartXAxis { AxisMarks(values: monthStarts) /* month labels */ }
    ```
    Legend words are the locked vocabulary ("Bunked", never "Missed"). Red cells are status semantics; footer copy stays neutral.
  - **Day tap:** chart gesture + `ChartProxy` → `sheet` with `.presentationDetents([.medium])`: that day's classes as Today-style rows, markable via the same `confirmationDialog` — this is the backfill mechanism.
- **A11y:** chart `.accessibilityLabel("Attendance heatmap, \(semesterRange)")`; provide `.accessibilityChartDescriptor` (AXChartDescriptor) mapping weeks/status; every day's data is also reachable through the fully accessible day sheet.

## 11. SETTINGS TAB

- **Nav:** `.navigationTitle("Settings")` large. No toolbar items.
- **Body:** `Form`:
  - **Section "Semester":** `DatePicker("Semester started", displayedComponents: .date)`; `LabeledContent("Requirement", value: "75%")` (display-only). Footer: "Most Indian colleges require 75% attendance."
  - **Section "Timetable":** `Button { } label: { Label("Rescan Timetable", systemImage: "camera.viewfinder") }` (capture sheet); `NavigationLink("Edit Subjects")` → confirm-style editor list.
  - **Section "Extraction":** `SecureField("Claude API key", text: $key)`; `Link("Get a key", destination: URL(string: "https://console.anthropic.com")!)`. Footer: "Optional. Improves timetable reading. Extraction runs on-device by default; with a key, your timetable image is sent to Anthropic."
  - **Section "Data":** `ShareLink(item: exportURL) { Label("Export Data", systemImage: "square.and.arrow.up") }`; `Button("Delete All Data", role: .destructive)` → `confirmationDialog("This erases subjects, attendance and files from this iPhone.", …)` with destructive "Delete Everything" + Cancel.
  - **Section "About":** `LabeledContent("Version", value: appVersion)`. Footer: "StudEx keeps everything on your iPhone. No account, no cloud."

**confirmationDialog vs sheet — the rule:** dialogs for verb choices on an existing thing (mark/change/clear a class, delete confirmations); sheets for entering or viewing content (edit forms, day detail, capture flow re-entry, QuickLook).

---

# VIOLATIONS IN r4 → NATIVE REPLACEMENT

**Global**
1. Custom indigo/purple tint on every CTA and icon (welcome, capture, confirm, catchup, detail file icons) — violates locked systemBlue. → `.tint(.blue)` at root; delete all brand colorsets.
2. No tab bar on any screen — the locked 3-tab structure does not exist. → `TabView` (Today/Subjects/Settings); system Liquid Glass tab bar comes free.
3. No `NavigationStack` anywhere: hand-rolled centered title `Text`s ("Your week", "Add your timetable", "Where you stand", "Universal Human Values") with no bars, no back buttons. → `NavigationStack` + `.navigationTitle` (large on tab roots, inline on pushes) + system back.
4. Floating custom circle buttons as toolbar stand-ins ("Edit" pill on confirm; doc+ circle on detail). → `ToolbarItem(placement: .topBarTrailing)` system buttons/Menu.
5. All content is hand-built white rounded cards on gray with custom padding/shadows. → `List`/`Form` with `.listStyle(.insetGrouped)`.
6. Banned word "skip" in product copy: today.png "Skip today if you need to — 5 to spare."; detail.png "You can skip 9 more classes." → "5 classes to spare before 75%." / "You can bunk 9 more and stay above 75%."
7. Locked onboarding headline "What do you have today?" absent (r4 shows "Know your number." and "Scan it once. We read the whole week."). → restore locked headline on capture screen; "Know your number. Always." (exact, with "Always.") only as a welcome feature line.
8. Bottom CTAs are custom purple capsules pinned over content. → `ToolbarItem(placement: .bottomBar)` (or `safeAreaInset`) with `.borderedProminent` + `.controlSize(.large)`, blue.
9. subjects.png, insights.png, settings.png are blank white — screens ship broken with no nav, no content, no empty state. → build per spec §8, §10, §11 with `ContentUnavailableView` + locked copy.
10. Custom pastel mint/rose fills for status. → status color only via `.tint(.green)/.tint(.red)` and `.foregroundStyle(.green/.red)` on system controls/symbols.

**Welcome (welcome.png)**
11. Hand-drawn thick green progress ring with stacked "82 / %" labels. → if a hero is kept, `Gauge(.accessoryCircularCapacity)`; preferred: replace splash with the standard welcome-features pattern (three locked feature-line Labels).
12. "Get started" sentence case. → "Get Started" (HIG title-style capitalization).

**Capture (capture.png)**
13. Custom purple viewfinder glyph (drawn path). → SF Symbol `doc.viewfinder` in `.tint`.
14. "Upload Photo"/"Upload PDF" web verbs + custom pastel capsule button styles. → `PhotosPicker` "Choose Photo" and `.fileImporter` "Choose PDF", both `.buttonStyle(.bordered)`; primary "Scan Timetable" `.borderedProminent`.
15. Implied custom camera flow. → VisionKit `VNDocumentCameraViewController` full-screen.

**Confirm (confirm.png)**
16. Subject names floated as bare custom headers above separate cards. → single inset-grouped List; subject per row with merged "Mon Wed Fri · 09:00–10:00 · Room 301" subtitle (mockup 02).
17. Decorative book glyph leading each row. → remove (mockup has none).
18. "tap to set" red text + custom red triangle asset for flagged rows. → `.listRowBackground(Color.red.opacity(0.08))` + trailing `exclamationmark.triangle.fill` `.foregroundStyle(.red)` + `.accessibilityValue("Needs review")`; row stays a normal NavigationLink.
19. Copy drift: title "Your week", intro "We read 4 classes…". → inline nav title "Review"; header "Does this look right?" + "Tap any class to edit. We flagged 1 to check." (mockup 02).
20. "Looks right" purple capsule. → bottomBar `.borderedProminent` "Looks Right".

**Catch-up (catchup.png)**
21. Custom −/+ capsule stepper pairs per value. → `LabeledContent` + `TextField(value:format:.number)` `.keyboardType(.numberPad)` (or system `Stepper`); keyboard Done toolbar.
22. Hand-rolled section headers/cards ("When did the semester start?", "Catch me up") and custom date capsule. → `Form` Sections with headers/footers; system compact `DatePicker`.
23. "See my number" purple capsule. → bottomBar `.borderedProminent` "See My Number", blue.

**Today (today.png)**
24. Hand-rolled fake large title "Saturday, Jun 20" (date replaces screen identity; no bar). → `.navigationTitle("Today")` + `.navigationSubtitle("Thursday, 20 June")` (iOS 26).
25. Summary card: custom ring showing bare "83" (no %, no threshold context) + green "You're good." headline. → List row with `Gauge(.accessoryCircularCapacity)`, currentValueLabel "82%" with `.contentTransition(.numericText)` (the one animated moment), caption "OVERALL ATTENDANCE", status "On track"/"Below 75", math line per locked pattern.
26. Per-subject colored accent bars (blue/red/teal/green custom colorsets) on rows. → delete; color is reserved for status semantics only.
27. Two full-width custom pastel pill buttons ("✓ Attended" / "✕ Bunked") on every row — the flagship violation. → leading/trailing full-swipe `.swipeActions` (green checkmark / red xmark), row-tap `confirmationDialog`, `.contextMenu`; marked state shown by trailing `checkmark.circle.fill` / `xmark.circle.fill`.
28. Hyphen time ranges "09:00 - 10:00" inline in subtitle. → leading bold time column (mockup 03) and en dash "09:00–10:00" wherever ranges appear.
29. Custom gray "Today" section label. → List `Section("Schedule · 4 classes")` header.

**Subject Detail (detail.png)**
30. No back button; centered custom title. → pushed child with inline title + system back.
31. Giant custom "92 %" two-piece display + custom capsule progress bar with hand-drawn 75% tick + "• You're good" dot. → `.largeTitle.bold()` Text with `.numericText` transition + `Gauge(.linearCapacity)` tinted by status; threshold context moves to the Section footer sentence.
32. Custom gray stat tiles "35 Attended / 38 Held". → `LabeledContent("Attended"/"Held"/"Bunked", value:)` rows.
33. Custom Files card with purple icon, manual "…." truncation, verbose "17 Jun 2026 at 18:20". → List Section "Files" with `Label` rows, `.lineLimit(1).truncationMode(.middle)`, `.caption` date only, `.quickLookPreview` on tap, swipe Delete, contextMenu ShareLink/Rename.

**Insights (insights.png)**
34. Blank screen; and if the previous build used Lottie/custom animation or custom heatmap drawing, both are banned. → Swift Charts `RectangleMark` heatmap + `.chartForegroundStyleScale` (Attended/Bunked legend) + streak `LabeledContent` rows; entered only via Subjects calendar toolbar button.

**Settings (settings.png)**
35. Blank screen. → `Form` per §11 (semester date, rescan, Claude key SecureField with privacy footer, export ShareLink, destructive delete with confirmationDialog, version).

**Motion/assets**
36. Any Lottie/animation dependencies, custom easing, or animated illustrations in the project. → remove; the only bespoke motion is `.contentTransition(.numericText())` on the two percentage displays; all else default SwiftUI.
37. Any hand-rolled blur/glass panels behind content. → none; Liquid Glass exclusively via system tab bar/toolbars/sheets.

---

Build order recommendation: fix Global 1–5 first (tint, TabView, NavigationStacks, Lists) — they mechanically resolve half the per-screen violations — then Today (§7), Subjects (§8), Detail (§9), onboarding (§1–6), Heatmap (§10), Settings (§11), then the copy sweep (violations 6, 7, 19, 25, 28) verbatim from the locked-copy table.