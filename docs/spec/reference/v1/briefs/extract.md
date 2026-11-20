All inputs are read and verified against the SDK. Here is the implementable design.

---

# StudEx Timetable Extraction Ladder — Implementation Spec

**Verified against:** iOS 26.5 SDK `Vision.swiftmodule` swiftinterface (lines cited), `FoundationModels.swiftmodule` swiftinterface, Anthropic Messages API (2026-06 reference), ground truth `/Users/ohm_home/Desktop/studex all/studex 2/timetables/ruas-cse-sem4.groundtruth.json` + source image `ruas-cse-sem4.jpg`.

```
Capture/Import ─▶ Rung 0 normalize ─▶ Rung 1 Vision OCR ─▶ Rung 2 grid parser ─┬─▶ Confirm UI (always)
                                                                               │
                                       low-confidence slots / holes only ──────┤
                                                                               ├─▶ Rung 3 FoundationModels (if available)
                                                                               └─▶ Rung 4 Claude API (only if key pasted)
```

Rungs 1+2 are the product. Rungs 3+4 are *refiners* that only touch flagged slots. Everything lands in the editable confirm list; nothing is ever auto-committed.

---

## 0. Shared types

```swift
import Foundation

enum Weekday: String, Codable, CaseIterable, Comparable {
    case mon = "Mon", tue = "Tue", wed = "Wed", thu = "Thu", fri = "Fri", sat = "Sat", sun = "Sun"
    static func < (a: Self, b: Self) -> Bool { allCases.firstIndex(of: a)! < allCases.firstIndex(of: b)! }
}

/// Minutes since midnight. 11:15 == 675. Avoids Date/timezone entirely.
typealias MinuteOfDay = Int

enum SlotKind: String, Codable { case lecture, lab, tutorial, contactHour = "contact_hour", elective }

enum SlotIssue: String, Codable, Hashable {
    case ocrLowConfidence      // Vision line confidence < 0.5 on the code token
    case unknownTimeHeader     // column had period number but no parseable time
    case meridiemInferred      // AM/PM was guessed
    case subjectUnknown        // no course-code pattern matched; subject = raw text
    case multipleSubjectsInCell// elective cell listing >1 code
    case ambiguousBatch        // batch tags exist but user's batch unknown / cell tags both
    case splitRoom             // "D-306 (B1) / D-404 (B2)" style cell
    case contactHour           // teacher cell said "Contact Hour" — counts for attendance?
    case timeOverlap           // overlaps another slot same day
    case oddDuration           // duration ∉ plausible set
    case noTeacherRow          // band had no identifiable teacher row
    case refinerAdded          // slot exists only because FM/Claude found it (hole fill)
    case refinerSuggestion     // refiner disagrees with grid; suggestion attached
}

enum ExtractionRung: String, Codable { case grid, foundationModels, claude, manual }

struct RoomAssignment: Codable, Hashable {
    var room: String            // normalized "A-306"
    var batch: String?          // "1" if printed as "(B1)"
}

struct DraftSlot: Identifiable, Codable {
    let id: UUID
    var day: Weekday
    var start: MinuteOfDay
    var end: MinuteOfDay
    var code: String?           // "CSD209A" (normalized, uppercase, no spaces)
    var name: String            // "Database Systems"
    var kind: SlotKind
    var rooms: [RoomAssignment] // [0] is primary; >1 ⇒ splitRoom
    var batch: String?          // nil = whole class attends
    var teacher: String?
    var electiveChoices: [String]  // codes, only when kind == .elective
    var confidence: Double      // 0…1, see §2.7
    var issues: Set<SlotIssue>
    var provenance: ExtractionRung
    var suggestion: SlotSuggestion? // refiner disagreement, shown as "Did you mean…?"
    var sourceCell: CellRef?    // for debug + re-refinement
    var isLowConfidence: Bool { confidence < 0.75 || !issues.isEmpty }
}

struct SlotSuggestion: Codable { var code: String?; var name: String?; var start: MinuteOfDay?; var end: MinuteOfDay?; var kind: SlotKind?; var batch: String?; var from: ExtractionRung }
struct CellRef: Codable, Hashable { var table: Int; var rowRange: ClosedRange<Int>; var colRange: ClosedRange<Int> }

struct ExtractionResult {
    var slots: [DraftSlot]
    var subjects: [DraftSubject]     // synthesized roster, §2.8
    var defaultRoom: String?         // from header "Room No: A-306"
    var semesterStart: Date?         // from "Start Date: 9/22/2025"
    var pagesProcessed: Int
    var failure: ExtractionFailure?  // .noTableFound → manual entry path
}
struct DraftSubject: Codable, Identifiable { var id: String { code }; var code: String; var name: String; var teacher: String? }
```

---

## 1. Rung 0 — Ingestion (capture, PDF, EXIF, downscale)

### 1.1 Camera (preferred): `VNDocumentCameraViewController`

VisionKit's document camera returns perspective-corrected, de-skewed, orientation-normalized pages — this is why it's the primary path (it eliminates most keystone/rotation failure modes before OCR).

```swift
import VisionKit

struct DocumentScannerView: UIViewControllerRepresentable {
    var completion: (Result<[UIImage], Error>) -> Void   // one UIImage per page

    static var isSupported: Bool { VNDocumentCameraViewController.isSupported } // guard: false on Simulator

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let vc = VNDocumentCameraViewController()
        vc.delegate = context.coordinator
        return vc
    }
    func updateUIViewController(_: VNDocumentCameraViewController, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(completion: completion) }

    final class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let completion: (Result<[UIImage], Error>) -> Void
        init(completion: @escaping (Result<[UIImage], Error>) -> Void) { self.completion = completion }

        func documentCameraViewController(_ vc: VNDocumentCameraViewController,
                                          didFinishWith scan: VNDocumentCameraScan) {
            let pages = (0..<scan.pageCount).map { scan.imageOfPage(at: $0) }
            vc.dismiss(animated: true); completion(.success(pages))
        }
        func documentCameraViewControllerDidCancel(_ vc: VNDocumentCameraViewController) {
            vc.dismiss(animated: true)
        }
        func documentCameraViewController(_ vc: VNDocumentCameraViewController,
                                          didFailWithError error: Error) {
            vc.dismiss(animated: true); completion(.failure(error))
        }
    }
}
```

### 1.2 Photos / Files import

```swift
PhotosPicker(selection: $item, matching: .images)   // → item?.loadTransferable(type: Data.self)
// Files: .fileImporter(isPresented:allowedContentTypes: [.pdf, .image], ...)
```

### 1.3 EXIF orientation + downscale — one normalization pass

Rule: **bake orientation into pixels once**, then everything downstream (Vision, cell-crop thumbnails in the confirm UI, Claude upload) shares one coordinate space.

```swift
enum ImageNormalizer {
    static let ocrMaxDimension: CGFloat = 4096   // Vision sweet spot; caps memory
    static let ocrMinDimension: CGFloat = 1200   // below this, warn "photo may be too small"

    /// Bakes EXIF/UIImage orientation into pixels and clamps longest side. Never upscales.
    static func normalizedForOCR(_ image: UIImage) -> CGImage? {
        let px = CGSize(width: image.size.width * image.scale, height: image.size.height * image.scale)
        let scale = min(1, ocrMaxDimension / max(px.width, px.height))
        let target = CGSize(width: (px.width * scale).rounded(), height: (px.height * scale).rounded())
        let fmt = UIGraphicsImageRendererFormat(); fmt.scale = 1; fmt.opaque = true
        let rendered = UIGraphicsImageRenderer(size: target, format: fmt).image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))   // draw(in:) applies imageOrientation
        }
        return rendered.cgImage
    }
}
```

If OCR runs on **raw `Data`** instead (Files import of a JPEG), skip baking and call `request.perform(on: data)` — Vision reads EXIF from the container itself (`perform(on: Foundation.Data, orientation: nil)`, swiftinterface line 399/408). For `CGImage` from a `UIImage` you must either bake (above) or pass `CGImagePropertyOrientation(image.imageOrientation)` explicitly. Baking is the chosen policy.

### 1.4 PDF import — rasterize at 300 dpi

```swift
import PDFKit

enum PDFRasterizer {
    /// mediaBox points × (300/72), capped at 4096 px on the long side.
    /// `thumbnail(of:for:)` honors /Rotate and renders text+vectors correctly.
    static func rasterize(page: PDFPage, dpi: CGFloat = 300) -> CGImage? {
        var box = page.bounds(for: .mediaBox).size
        if page.rotation % 180 != 0 { box = CGSize(width: box.height, height: box.width) }
        var size = CGSize(width: box.width * dpi / 72, height: box.height * dpi / 72)
        let cap = ImageNormalizer.ocrMaxDimension
        let longest = max(size.width, size.height)
        if longest > cap { size = CGSize(width: size.width * cap / longest, height: size.height * cap / longest) }
        return page.thumbnail(of: size, for: .mediaBox).cgImage
    }

    static func pages(from url: URL, maxPages: Int = 6) -> [CGImage] {
        guard let doc = PDFDocument(url: url) else { return [] }
        return (0..<min(doc.pageCount, maxPages)).compactMap { doc.page(at: $0).flatMap { rasterize(page: $0) } }
    }
}
```

**Multi-page policy (camera scans and PDFs, identical):** run Rungs 1+2 per page independently. Score each page = `distinctDayTokensFound + (parsedTimeColumns > 2 ? 1 : 0)`. Pages scoring 0 are dropped (cover pages, signature pages). If several pages survive, **union** their slots; on a `(day, start)` collision keep the higher-confidence slot and flag both `.timeOverlap`. This handles both "one timetable per page per section — user picks in confirm" and "Mon–Wed / Thu–Sat split across pages".

---

## 2. Rung 1 — Vision OCR (`RecognizeDocumentsRequest`)

Exact call shape (all types verified in swiftinterface — `RecognizeDocumentsRequest` lines 501–565, `DocumentObservation` 617–800):

```swift
import Vision   // the new Swift-only API, NOT VNRequest

enum TimetableOCR {
    static func recognize(_ image: CGImage) async throws -> [DocumentObservation] {
        var request = RecognizeDocumentsRequest()             // struct; init(_ revision: Revision? = nil)
        request.textRecognitionOptions.recognitionLanguages =
            [Locale.Language(identifier: "en-IN"), Locale.Language(identifier: "en-US")]
        request.textRecognitionOptions.useLanguageCorrection = false
        // ^ critical: correction "fixes" course codes (CSD206B→CSD 2068) and room codes
        request.textRecognitionOptions.customWords =
            ["Batch", "Lab", "Laboratory", "Tutorial", "Lunch", "Tea", "Break",
             "Contact", "Hour", "Period", "Sem", "MATLAB"]
        request.barcodeDetectionOptions.enabled = false
        return try await request.perform(on: image)           // ImageProcessingRequest.perform(on: CGImage, orientation: nil)
        // Data path: try await request.perform(on: data)     // EXIF honored automatically
    }
}
```

Reading the result — the exact accessor chain (verified):

```swift
// observation: DocumentObservation
// observation.document                                : DocumentObservation.Container   (line 793: `public let document`)
// container.tables                                    : [Container.Table]               (line 775)
// container.paragraphs / container.text / container.title : header text outside tables  (763–771)
// table.rows: [[Cell]]  table.columns: [[Cell]]  table.cell(row:col:) -> Cell?          (638–644)
// cell.rowRange / cell.columnRange                    : ClosedRange<Int>                (624–629)
// cell.content                                        : Container   (nested)            (621)
// cell.content.text                                   : Container.Text                  (766)
// cell.content.text.transcript                        : String   ← THE cell text        (line 748)
// cell.content.text.lines                             : [RecognizedTextObservation]     (739)
// line.transcript: String, line.confidence: Float (0…1)                                 (1173, 1196)
```

Table selection + flattening into the parser's input model:

```swift
struct GridCell: Hashable {
    let rowRange: ClosedRange<Int>, colRange: ClosedRange<Int>
    let text: String                 // cell.content.text.transcript, whitespace-normalized
    let minLineConfidence: Double    // min(cell.content.text.lines.map(\.confidence)), 1.0 if no lines
}
struct Grid { let nRows: Int; let nCols: Int; let cells: [GridCell]; let headerParagraphs: [String] }

func makeGrid(from observations: [DocumentObservation]) -> Grid? {
    let tables = observations.flatMap { $0.document.tables }
    // pick the table with the most cells (RUAS: header meta-rows are part of the same table; fine)
    guard let table = tables.max(by: { Set($0.rows.flatMap { $0 }).count < Set($1.rows.flatMap { $0 }).count })
    else { return nil }                              // → ExtractionFailure.noTableFound
    let cells = Set(table.rows.flatMap { $0 })       // Cell is Hashable; Set dedupes merged spans
        .map { cell in
            GridCell(rowRange: cell.rowRange, colRange: cell.columnRange,
                     text: normalize(cell.content.text.transcript),
                     minLineConfidence: cell.content.text.lines.map { Double($0.confidence) }.min() ?? 1.0)
        }
    let paragraphs = observations.flatMap { $0.document.paragraphs.map(\.transcript) }
    return Grid(nRows: (cells.map(\.rowRange.upperBound).max() ?? -1) + 1,
                nCols: (cells.map(\.colRange.upperBound).max() ?? -1) + 1,
                cells: cells, headerParagraphs: paragraphs)
}

func normalize(_ s: String) -> String {
    s.replacingOccurrences(of: "\n", with: " ")
     .replacingOccurrences(of: "–", with: "-").replacingOccurrences(of: "—", with: "-")
     .replacingOccurrences(of: "\u{00A0}", with: " ")
     .split(separator: " ").joined(separator: " ")
}
```

`tables.isEmpty` ⇒ Rung 2 is skipped; if Rung 3/4 available, send `container.text.transcript` raw lines there; else open the confirm screen in empty manual-entry mode ("Couldn't read a grid. Add subjects by hand or retake.").

---

## 3. Rung 2 — Deterministic grid parser (no AI, all devices)

Signature: `func parseGrid(_ grid: Grid) -> ExtractionResult`

### 3.1 Regex library (compile once)

```swift
enum Rx {
    // Course code: TSU-201A, CSD206B, MCC301A, BAU201A …
    static let code      = /\b([A-Z]{2,4})\s?-?\s?(\d{3})([A-Z]?)\b/
    // Time range: "8.15 AM to 9.05 AM", "09:00-09:55", "12.55 PM to 1.45 PM", "9-9.55"
    static let timeRange = /(\d{1,2})[:.](\d{2})\s*([AaPp])?\.?[Mm]?\.?\s*(?:-|to|TO|To)\s*(\d{1,2})[:.](\d{2})\s*([AaPp])?\.?[Mm]?\.?/
    static let periodNum = /^(?:P(?:eriod)?\s*)?([1-9]|1[0-2])$/.ignoresCase()
    static let breakWord = /tea|lunch|break|recess|interval/.ignoresCase()
    // Day tokens (word-bounded, case-insensitive)
    static let day       = /\b(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/.ignoresCase()
    // Room+batch pair: "D-306 (B1)", "A-103G (Batch 2)"
    static let roomBatch = /\b([A-Z]{1,2})\s?-?\s?(\d{2,3}[A-Z]?)\s*\(\s*B(?:atch)?\s*\.?\s*(\d)\s*\)/
    // Bare room: "A-306", "(A-103G)", "[A 205]"
    static let room      = /[\[(]?\b([A-Z]{1,2})[\s-](\d{2,3}[A-Z]?)\b[\])]?/
    // Standalone batch: "Batch 1", "B1" (not followed by digit/hyphen → avoids "B-Tech", room letters)
    static let batch     = /\bB(?:atch)?\s*\.?\s*(\d)\b(?![-\d])/.ignoresCase()
    static let labKind   = /\b(lab|laboratory|practical|practicals|matlab|workshop)\b/.ignoresCase()
    static let tutKind   = /\b(tut|tutorial)\b/.ignoresCase()
    static let contact   = /contact\s*hour/.ignoresCase()
    static let teacher   = /\b(Dr|Mr|Ms|Mrs|Prof|Er)\b\.?\s/.ignoresCase()
    static let blocklist = /^\s*(-{2,}|x+|nil|no\s+class|library|sports|mentoring|remedial|club)\s*$/.ignoresCase()
    static let rowNumber = /^\d{1,2}$/
}
```

**Ordering invariant when parsing a cell:** extract *course codes* first and mask their character ranges, then *room+batch pairs*, then *bare rooms*, then *standalone batch*, each on the remaining unmasked text. This prevents "TSU-201A" matching the room regex and "B1" inside "D-306 (B1)" double-counting as a standalone batch.

### 3.2 Axis detection (which way do days run?)

```
for orientation in [asIs, transposed]:
    dayAxisScore  = max over columns c of |distinct day tokens among cells in column c|
    timeAxisScore = max over rows r of |cells in row r matching Rx.timeRange or Rx.periodNum|
    score(orientation) = dayAxisScore(≥3 ? value : 0) + timeAxisScore(≥3 ? value : 0)
pick the winner; require score ≥ 6 (≥3 distinct days AND ≥3 time headers) else FAIL → escalate whole doc to rung 3/4 / manual
```

Transposition is virtual: swap `rowRange`/`colRange` on every `GridCell`. From here on, **days are rows, times are columns** (the RUAS layout).

Day column = the column index with max distinct day tokens. A neighbor column whose cells all match `Rx.rowNumber` (RUAS's "1", "2", …) is marked *ignorable*. Strip a leading `\d+\s*` from day cells before matching (handles a merged "1 Monday" cell).

### 3.3 Time-header parsing

Find the header row = row with max `Rx.timeRange` matches (RUAS: the "Time:" row; the "Period:" row above it maps `Rx.periodNum` → column, used as fallback labels).

```
columnSpec[c] ∈ { time(start,end, inferred: Bool), break, period(n), dayAxis, ignorable, unknown }

for each header cell:
    if Rx.breakWord matches its own text OR the period-row cell above says Tea/Lunch → break
    else if Rx.timeRange → resolve meridiem:
        explicit AM → keep; explicit PM and h<12 → h+12; h==12 with AM → 0
        missing meridiem → heuristic: h ∈ 8…11 → AM; h == 12 → keep; h ∈ 1…7 → PM (+12); mark inferred=true
        if end ≤ start after resolution → end += 12h (crossing noon, e.g. "11.15 to 12.05")
    else if Rx.periodNum → period(n)
monotonic repair pass, left→right:
    if columnSpec[c].start < columnSpec[c-1].start → add 12h to both start,end (missed PM); still smaller → mark unknown
period(n)-only columns: if ≥1 timed column exists and periods are consecutive, synthesize by chaining
    (start = previous column's end, duration = median timed-column duration); mark inferred=true.
    If NO timed columns at all: keep period labels, times nil → every slot in that column gets .unknownTimeHeader
    (confirm UI asks once per column: "When is period 3?" and applies to the whole column).
backup break detection: a non-break column whose body cells are ≥80% empty AND duration ≤ 45 min → break
```

RUAS resolves to: `08:15–09:05 · 09:05–09:55 · 09:55–10:45 · BREAK(tea) · 11:15–12:05 · 12:05–12:55 · 12:55–13:45 · BREAK(lunch) · 14:30–15:20 · 15:20–16:10 · 16:10–17:00` — matching the ground-truth `_meta` note exactly (p1–p9, 50 min each).

### 3.4 Day-band detection + teacher-row zipping

```
dayOf(row r) = day token of the cell in the day column whose rowRange contains r  (day cells span bands)
band = maximal run of consecutive body rows with the same day        // RUAS: every band = 2 rows
within a band, classify each row:
    subjectRow: ≥1 cell matches Rx.code, or has text > 12 chars that isn't name-like
    teacherRow: every non-empty cell is name-like (Rx.teacher prefix, or ≤4 Title-Case words,
                or Rx.contact) and contains no Rx.code and no Rx.timeRange
zip: teacherFor(subjectCell) = the teacherRow cell whose colRange overlaps subjectCell.colRange
     (max-overlap wins; a teacher cell may span exactly under a merged subject cell — RUAS does this)
if a band has no teacherRow → every slot in band gets .noTeacherRow (cosmetic; teacher is optional)
```

### 3.5 Slot emission (per subject-row cell)

```
skip if: cell in day/ignorable column · text empty · Rx.blocklist · header row
skip if: every column in colRange is a break column
effectiveCols = colRange minus break columns          // a merged cell that *spans* a break keeps one slot
start = columnSpec[first effectiveCol].start
end   = columnSpec[last  effectiveCol].end            // ← merged-cell / multi-period-lab rule
// span==1 → 50-min lecture; span==2 → 100-min (Tue lab); span==3 → 150-min (Mon TSU, Fri labs)

cell text grammar (with masking order from §3.1):
    codes    = all Rx.code matches, normalized "TSU-201A" → "TSU201A"        (display keeps printed form)
    if codes.count > 1 → ONE slot, kind=.elective, electiveChoices=codes, +.multipleSubjectsInCell
    name     = text after "code:"/"code -" up to first '(', '[', or room match; else full unmasked text
    roomPairs= Rx.roomBatch matches → [RoomAssignment(room:"D-306",batch:"1"), ...]
    bareRoom = Rx.room on residual → RoomAssignment(room, batch:nil)
    rooms    = roomPairs + bareRooms; if empty → [defaultRoom] (from header, §3.6), no issue
    if rooms.count > 1 → +.splitRoom; primary = rooms[0]
    batch    = Rx.batch on residual ("Batch 1") → "1"
               else if roomPairs all share one batch → that batch
               else if roomPairs span batches {1,2} → batch=nil, +.ambiguousBatch   // Sat case
    kind     = .contactHour if Rx.contact in cell OR zipped teacher cell   (+.contactHour)
               else .lab  if Rx.labKind             // "Laboratory", "(MATLAB)" both hit
               else .tutorial if Rx.tutKind
               else .lecture
    teacher  = zipped teacher-cell text (nil if it was "Contact Hour")
```

**Same subject twice a day:** two *separate* single-column cells with the same code (Thu MCC301A p4 + p5) remain two slots — the parser only merges when Vision reports one `Cell` with `colRange` span > 1. It never merges adjacent cells. (Confirm UI offers an optional "merge back-to-back" action.)

**Saturday columns:** nothing special — `sat` is just another day token; bands emit normally.

### 3.6 Header metadata (outside/above the grid)

Scan `grid.headerParagraphs` + the top meta-rows of the table:
- `Room\s*(?:No)?\.?\s*:?\s*([A-Z]{1,2}\s?-?\s?\d{2,3}[A-Z]?)` → `defaultRoom` ("A-306")
- `Start\s*Date\s*:?\s*([\d/.-]+)` → `semesterStart` (parse `M/d/yyyy` then `d/M/yyyy`; ambiguous → nil)

### 3.7 Confidence scoring (what makes a slot low-confidence)

`confidence = 1.0 ×` product of applicable penalties; `isLowConfidence = confidence < 0.75 || issues ≠ ∅`.

| condition | ×factor | issue |
|---|---|---|
| min line confidence of the cell < 0.5 | 0.50 | `.ocrLowConfidence` |
| min line confidence 0.5–0.8 | 0.80 | `.ocrLowConfidence` |
| column time synthesized from periods / nil | 0.50 | `.unknownTimeHeader` |
| meridiem inferred on start or end column | 0.90 | `.meridiemInferred` |
| no `Rx.code` match (name = raw text) | 0.60 | `.subjectUnknown` |
| multiple codes in one cell | 0.50 | `.multipleSubjectsInCell` |
| batch ambiguous (both-batch cell, no user batch) | 0.85 | `.ambiguousBatch` |
| split room | 0.90 | `.splitRoom` |
| contact-hour | 0.90 | `.contactHour` |
| overlap with another slot same day (both slots) | 0.60 | `.timeOverlap` |
| duration ∉ {45,50,55,60,90,100,105,110,120,150,165,180} min | 0.70 | `.oddDuration` |

Flagged slots render at the top of the confirm list under "**Check these**" with an orange dot and a one-line reason ("Couldn't read the room clearly", "Which batch are you in?"). Neutral tone, never blocking.

### 3.8 Subject roster synthesis

Group emitted slots by normalized code → `DraftSubject(code, name: longest name string seen, teacher: most frequent teacher)`. Elective choices become provisional subjects only after the user picks one in confirm. Batch pick sheet (onboarding "optional batch pick"): if any slot has a batch tag, ask once — then **delete the other batch's slots** (ground-truth `_meta` rule 3: keeping them silently corrupts the attendance denominator, which is the whole product).

---

## 4. Rung 3 — FoundationModels refiner (Apple Intelligence devices)

### 4.1 Availability guard (exact enum, swiftinterface lines 554–568)

```swift
import FoundationModels

var fmAvailable: Bool {
    switch SystemLanguageModel.default.availability {
    case .available: return true
    case .unavailable(.deviceNotEligible),          // no Apple Intelligence hardware
         .unavailable(.appleIntelligenceNotEnabled),// user turned it off
         .unavailable(.modelNotReady),              // still downloading — could retry later
         .unavailable: return false
    @unknown default: return false
    }
}
```

### 4.2 `@Generable` draft schema

Small on purpose — the on-device window is ~4k tokens and the schema is injected into the prompt (`includeSchemaInPrompt` defaults `true`). Strings + `.anyOf`/`.pattern` guides keep the schema cheap and the output constrained (guide macros verified: `@Guide(description:)`, `@Guide(description:_ guides: GenerationGuide…)`, `@Guide(description:_ guides: Regex)`).

```swift
@Generable(description: "One class meeting parsed from a college timetable grid")
struct FMSlotDraft {
    @Guide(description: "Day of week", .anyOf(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]))
    var day: String
    @Guide(description: "Start time, 24-hour HH:mm", .pattern(/^([01]\d|2[0-3]):[0-5]\d$/))
    var start: String
    @Guide(description: "End time, 24-hour HH:mm", .pattern(/^([01]\d|2[0-3]):[0-5]\d$/))
    var end: String
    @Guide(description: "Course code exactly as printed, like CSD206B. Empty string if none printed.")
    var code: String
    @Guide(description: "Subject name without the code, room or batch")
    var name: String
    @Guide(description: "Room like A-306 or A-103G. Empty string if not printed.")
    var room: String
    @Guide(description: "Type of class", .anyOf(["lecture","lab","tutorial","contact_hour","elective"]))
    var kind: String
    @Guide(description: "Batch number like 1 or 2 if only one batch attends. Empty string otherwise.")
    var batch: String
}

@Generable(description: "All class slots for a single day of a timetable")
struct FMDayDraft {
    @Guide(description: "Slots in chronological order", .count(0...12))
    var slots: [FMSlotDraft]
}
```

### 4.3 Session, instructions, call shape

```swift
private let fmInstructions = """
You convert OCR'd college-timetable grid cells into structured class slots.
Rules:
- TRUST THE GRID. Each CELLS line is: <columns> | <subject cell text> | <teacher cell text>. \
Never invent a slot that has no cell; never drop a cell that has text.
- Times: use the HEADERS line. A cell spanning columns cA-cB is ONE slot from cA's start to cB's end. \
Normalize to 24-hour HH:mm ("9.05 AM"→"09:05", "1.45 PM"→"13:45").
- kind: "Laboratory"/"Lab"/"Practical"/"MATLAB"→lab; "Tutorial"→tutorial; \
"Contact Hour" in either cell→contact_hour; two or more course codes in one cell→elective; else lecture.
- batch: "Batch 1"/"(B1)"→"1"; "Batch 2"/"(B2)"→"2"; both or none→"".
- room: token like A-306 or A-103G, usually in () or []. Two rooms with batch tags→put the first in room.
- Fix obvious OCR damage in names (e.g. "Kowledge"→"Knowledge") but NEVER change course codes.
"""

func fmRefine(day: Weekday, serialized: String) async throws -> FMDayDraft {
    let session = LanguageModelSession(model: .default, instructions: fmInstructions) // fresh per day
    let response = try await session.respond(
        to: serialized,
        generating: FMDayDraft.self,
        options: GenerationOptions(sampling: .greedy)     // deterministic; temperature nil
    )
    return response.content
}
```

`session.prewarm()` once when the confirm screen is about to appear (verified: `prewarm(promptPrefix:)`).

### 4.4 Input serialization (compact grid, shared with Rung 4)

One day per call. ~25 lines ≈ 400–600 tokens; instructions+schema ≈ 700; output ≤ 1024 — comfortably inside 4k.

```
DAY Tue
HEADERS: c2 08:15-09:05 | c3 09:05-09:55 | c4 09:55-10:45 | c5 BREAK | c6 11:15-12:05 | c7 12:05-12:55 | c8 12:55-13:45 | c9 BREAK | c10 14:30-15:20 | c11 15:20-16:10 | c12 16:10-17:00
CELLS:
c3 | MCC301A : Optimization Techniques-1 | Dr Gayathri M
c4 | CSC202B: System Architecture and Programming | Ms. Supriya M S
c6-c7 | CSC202B: System Architecture and Programming Laboratory (A-103G) Batch 1 | Ms. Supriya M S
c8 | CSD206B: Design and Analysis of Algorithms | Dr. Yogesh K M
c10 | TSN201A : Essence of Indian Kowledge System [A 205] | Ms. Shantha Sheela
c11 | CSD209A: Database Systems | Contact Hour
c12 | MTF212A: Additional Mathematics - 2 | Dr Manohar G.
RAW: <container.text lines for the band — ONLY when the band produced <2 cells>
```

### 4.5 Guardrails

- **Chunk by day**; only send days that contain ≥1 low-confidence slot or a hole (band with raw text but no emitted slots). Fresh session per day → transcript never accumulates.
- `maximumResponseTokens: 1024` via `GenerationOptions`.
- Catch `LanguageModelSession.GenerationError`: on `.exceededContextWindowSize` split the day's CELLS in half and retry each half once; on any second failure or `.guardrailViolation`/`.refusal`, **keep the grid result** and move on (rung 3 is best-effort).
- Wall-clock budget 10 s per day (`Task` + timeout); it's a refinement pass on an onboarding screen, not a blocker.

---

## 5. Rung 4 — Claude API (only if user pasted a key in Settings)

Key stored in Keychain (`kSecClassGenericPassword`, service `"studex.anthropic"`), never in UserDefaults. Raw `URLSession` — no SDK dependency.

### 5.1 Image downscale rule (base64 ≤ ~1.5 MB)

Base64 inflates 4/3 ⇒ JPEG budget ≈ **1.1 MB**.

```swift
func claudeJPEG(from cg: CGImage) -> Data? {
    var image = UIImage(cgImage: cg), quality: CGFloat = 0.75
    var side: CGFloat = 2048                       // ≤2576 (Sonnet 5 high-res cap); 2048 is plenty for a timetable
    for _ in 0..<6 {
        let scaled = image.scaled(maxDimension: side)          // renderer helper from §1.3
        if let d = scaled.jpegData(compressionQuality: quality), d.count <= 1_100_000 { return d }
        if quality > 0.5 { quality -= 0.1 } else { side *= 0.85 }
    }
    return image.scaled(maxDimension: 1280).jpegData(compressionQuality: 0.5)
}
```

### 5.2 Exact request

`POST https://api.anthropic.com/v1/messages` — headers: `content-type: application/json`, `x-api-key: <user key>`, `anthropic-version: 2023-06-01`.

```json
{
  "model": "claude-sonnet-5",
  "max_tokens": 8192,
  "system": "You extract college timetables. You receive the timetable image and the OCR'd grid. TRUST THE GRID for structure; use the image only to repair unreadable cells. A cell spanning columns cA-cB is one slot from cA's start to cB's end. Times 24h HH:mm. kind: lab for Laboratory/Practical/MATLAB, tutorial, contact_hour when a cell says Contact Hour, elective when one cell lists multiple course codes, else lecture. batch \"1\"/\"2\" only when a single batch attends, else empty. Never invent slots that have no cell. Never alter course codes.",
  "output_config": {
    "format": {
      "type": "json_schema",
      "schema": {
        "type": "object",
        "properties": {
          "slots": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "day":   { "type": "string", "enum": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] },
                "start": { "type": "string" },
                "end":   { "type": "string" },
                "code":  { "type": "string" },
                "name":  { "type": "string" },
                "room":  { "type": "string" },
                "kind":  { "type": "string", "enum": ["lecture","lab","tutorial","contact_hour","elective"] },
                "batch": { "type": "string", "enum": ["", "1", "2", "3", "4"] }
              },
              "required": ["day","start","end","code","name","room","kind","batch"],
              "additionalProperties": false
            }
          }
        },
        "required": ["slots"],
        "additionalProperties": false
      }
    }
  },
  "messages": [{
    "role": "user",
    "content": [
      { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "<base64 jpeg, ≤1.5MB>" } },
      { "type": "text",  "text": "OCR GRID (one block per day):\n<serialized §4.4 for ALL days>\n\nLOW-CONFIDENCE SLOTS TO FIX: <list of day+time+reason>\n\nReturn every slot for the whole week." }
    ]
  }]
}
```

Notes (per current API): **no `temperature`** (non-default sampling params are rejected on `claude-sonnet-5`); `output_config.format` guarantees the first `text` block is schema-valid JSON; image block goes *before* the text block; 8192 max_tokens is far above a week's output (~2k) while staying safely non-streaming.

### 5.3 Tolerant decoding (belt and suspenders)

```swift
struct ClaudeSlot: Decodable { let day, start, end, code, name, room, kind, batch: String }
struct ClaudeDraft: Decodable { let slots: [ClaudeSlot] }

func decodeClaude(_ body: Data) throws -> ClaudeDraft {
    // 1. envelope: {"content":[{"type":"text","text":"..."}], "stop_reason": ...}
    let env = try JSONSerialization.jsonObject(with: body) as? [String: Any]
    if let stop = env?["stop_reason"] as? String, stop == "refusal" { throw ClaudeError.refused }
    guard let blocks = env?["content"] as? [[String: Any]],
          var text = blocks.first(where: { $0["type"] as? String == "text" })?["text"] as? String
    else { throw ClaudeError.badEnvelope }
    // 2. tolerant: strip fences, clamp to outermost braces (defensive even with output_config)
    text = text.replacingOccurrences(of: "```json", with: "").replacingOccurrences(of: "```", with: "")
    if let a = text.firstIndex(of: "{"), let b = text.lastIndex(of: "}") { text = String(text[a...b]) }
    var draft = try JSONDecoder().decode(ClaudeDraft.self, from: Data(text.utf8))
    // 3. field tolerance: "9.05"→"09:05", "1:45 PM"→"13:45", lowercase days, kind synonyms
    draft = draft.normalizedTimesAndEnums()
    return draft
}
```

HTTP handling: `401` → "Key rejected — check Settings"; `429`/`529`/`5xx` → one retry after `retry-after`; anything else → keep grid result silently. The pipeline **never blocks** on rung 4.

---

## 6. Merge policy

`func merge(grid: [DraftSlot], refined: [RefinedSlot], from rung: ExtractionRung) -> [DraftSlot]`

1. **Grid always runs and is the skeleton.** Rung 3 gets only low-confidence *days*; rung 4 (if keyed) gets the whole week but is instructed to focus on the flagged list. Run 3 then 4; 4's output supersedes 3's *suggestions* only (higher-capability refiner), never grid facts.
2. Match refined→grid by key `(day, time-overlap ≥ 50%)`:
   - **Grid slot high-confidence (≥0.75, no issues): never overridden.** If the refiner disagrees on `code`/`kind`/`batch`, attach `SlotSuggestion` + `.refinerSuggestion`; the confirm row shows "Did you mean CSC202B?" as a tappable chip. Silent override is forbidden.
   - **Grid slot low-confidence:** adopt refined fields *fieldwise* — only fields that were the reason for the flag (`.subjectUnknown` → take code+name; `.unknownTimeHeader` → take times; `.ambiguousBatch` → take batch **only if refiner picked exactly one**). Confidence rises to `max(existing, 0.8)`; issues resolved by adopted fields are removed; provenance stays `.grid` with `suggestion.from` recording the refiner.
3. **Holes:** refined slots with no grid counterpart are appended with `provenance = rung`, `confidence = 0.6`, `.refinerAdded` — always in the "Check these" section.
4. Refined slots are dropped when: day invalid, end ≤ start, duration > 6h, or code matches no roster subject *and* no `Rx.code` pattern (hallucination guard).
5. Everything → editable confirm list (sorted day, start; flagged section pinned on top). The list is the single source of truth the user commits.

---

## 7. Acceptance: slot-accuracy, defined precisely

Normalize first: `code' = uppercased, all non-alphanumerics stripped` ("TSU-201A" ≡ "TSU201A"); day → 3-letter; times → minutes.

- **Key match:** predicted p matches ground-truth g iff `day equal ∧ code' equal ∧ |Δstart| ≤ 5 min ∧ |Δend| ≤ 5 min`. Matching is 1:1 greedy in (day,start) order; each g consumed once.
- **`keyF1 = 2·|M| / (|P| + |GT|)`** — penalizes both misses and spam.
- **Field accuracy over M:** `kindAcc` (exact enum), `roomAcc` (normalized primary room; GT `alt_room` accepted), `batchScore` — a batch is *correct* if equal, *flagged-unknown* if `batch == nil ∧ .ambiguousBatch ∈ issues`, else *wrong*.

**Acceptance gate (rungs 1+2 only, RUAS fixture, run in CI as an XCTest that loads the .jpg + groundtruth.json on an Apple-silicon simulator):**

```
keyF1 ≥ 0.90            (GT has 25 slots ⇒ ≥ 23 key matches with |P| ≈ 25)
kindAcc ≥ 0.90 · roomAcc ≥ 0.85 over matched pairs
batch wrong-count == 0  (flagged-unknown is allowed; silently wrong batch is not — it breaks the % math)
```

Expected on RUAS: parser emits 25 slots (Mon 2 · Tue 7 · Wed 4 · Thu 6 · Fri 4 · Sat 2) → 25/25 key matches; the two Saturday slots land as `batch = nil` + `.ambiguousBatch` + `.splitRoom` (flagged-unknown, resolved by the batch-pick sheet), and the two Contact Hour slots carry `.contactHour`, mirroring `_meta.ambiguous_cells` exactly.

---

## 8. Worked RUAS rows (grid → slots)

Header row parses to `columnSpec`: `c2 515–545? no — minutes: c2 495–545 (08:15–09:05), c3 545–595, c4 595–645, c5 BREAK, c6 675–725 (11:15–12:05), c7 725–775, c8 775–825 (12:55–13:45), c9 BREAK, c10 870–920 (14:30–15:20), c11 920–970, c12 970–1020 (16:10–17:00)`. `defaultRoom = "A-306"` from "Room No: A-306".

| Vision cell (colRange · text · zipped teacher) | Emitted slot | Notes |
|---|---|---|
| Mon `c6…c8` "TSU-201A: Universal Human Values – II" · "Ms. Sushma R" | Mon 11:15–13:45 TSU201A lecture A-306 conf 1.0 | merged 3-col cell → one slot; ✓ GT row 1 |
| Mon `c10…c11` "CSD206B: Design and Analysis of Algorithms" · "Dr. Yogesh K M" | Mon 14:30–16:10 CSD206B lecture A-306 | ✓ GT |
| Tue `c6…c7` "CSC202B: … Laboratory (A-103G) Batch 1" · "Ms. Supriya M S" | Tue 11:15–12:55 CSC202B **lab** room A-103G **batch 1** | `Rx.labKind`("Laboratory"), bare room in parens, `Rx.batch`("Batch 1"); ✓ GT |
| Tue `c10` "TSN201A : Essence of Indian Kowledge System [A 205]" · "Ms. Shantha Sheela" | Tue 14:30–15:20 TSN201A lecture room **A-205** | bracketed space-form room normalized; OCR'd "Kowledge" kept (roster keyed by code) |
| Tue `c11` "CSD209A: Database Systems" · teacher cell = "Contact Hour" | Tue 15:20–16:10 CSD209A **contact_hour** conf 0.9, issue `.contactHour` | teacher-cell rule; confirm UI asks "counts for attendance?" — matches `_meta.ambiguous_cells[0]` |
| Thu `c6` and `c7`, two separate cells, both "MCC301A: Optimization Techniques–1" · "Dr Gayathri M" each | **two** slots Thu 11:15–12:05 and 12:05–12:55 | same-subject-twice rule: distinct Cells never merge; ✓ GT rows |
| Fri `c10…c12` "CSC202B: … Laboratory (A-103G) Batch 2" · "Ms. Supriya M S" | Fri 14:30–17:00 CSC202B lab A-103G batch 2 | 3-col merged lab; ✓ GT |
| Sat `c2…c4` "MTF212A: Additional Mathematics - 2 (MATLAB) [D-306 (B1) / D-404 (B2)]" · "Ms Harshitha R / Mr Madan Desai" | Sat 08:15–10:45 MTF212A **lab** rooms [D-306(B1), D-404(B2)] batch nil conf ≈0.77 issues {`.splitRoom`, `.ambiguousBatch`} | kind from "MATLAB" keyword; `Rx.roomBatch` ×2 spanning batches ⇒ batch nil + flags. Key-matches GT (day/code/times); batch resolved by the batch-pick sheet, which also sets room to the picked batch's room |

Failure-mode coverage: "Mathematics - 2" cannot false-positive as a room (needs 2–3 digits); "B.Tech"/"TSU" cannot false-positive (word boundaries + code-masking order); lunch/tea columns can never emit (break columns excluded before cell parsing).