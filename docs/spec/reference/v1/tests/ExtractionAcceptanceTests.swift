import Testing
import Foundation
import UIKit
import Vision
@testable import Studex

// MARK: - Extraction acceptance gate (extract.md §7) — DO NOT WEAKEN
//
// This suite is the accuracy gate for the shipping extraction path: rungs 1+2
// ONLY (Vision `RecognizeDocumentsRequest` OCR → deterministic grid parser).
// No FoundationModels, no Claude — this must pass on every device with no AI.
//
// It runs the REAL pipeline on the real fixture photo (ruas-cse-sem4.jpg) and
// scores the result against hand-transcribed ground truth
// (ruas-cse-sem4.groundtruth.json) using the extract.md §7 metric definitions,
// re-implemented here verbatim and self-contained on purpose, so that a change
// to app-side helpers can never quietly change what the gate measures:
//
//     keyF1 >= 0.90  ·  kindAcc >= 0.90  ·  batch wrong-count == 0
//
// If this test fails after a parser/OCR change, extraction accuracy regressed
// on the reference timetable. Fix the code — NEVER weaken the thresholds, the
// matching rules, the normalization, or the fixture. A full ground-truth vs
// prediction diff table is printed on every run so failures are debuggable
// straight from the log.
//
// Why the orchestrator is not called: `TimetableExtractor.extract(pages:
// claudeImageData:)` conditionally runs rung 3 (FoundationModels — fires
// whenever Apple Intelligence is available on the host) and rung 4 (Claude —
// fires whenever a key is in the Keychain), which would make this gate
// environment-dependent. Instead the test invokes exactly the pieces the
// orchestrator uses for rungs 1+2, in the same order:
//
//     ImageNormalizer.normalizedForOCR          (rung 0, ImageIngest.swift)
//   → TimetableOCR.recognize(_:)                (rung 1, OCRService.swift)
//   → TimetableOCR.makeGrid(from:)              (rung 1→2 flattening)
//   → GridLineDetector.verticalLines(in:)       (ruled-line map for merges)
//   → GridParser.parsePage(_:lines:).result     (rung 2, GridParser.swift)
//
// Vision OCR on a simulator can take a while for the single image — that is
// expected and fine; the suite processes exactly one photo.

/// Class anchor for `Bundle(for:)` — Swift Testing suites are structs, so the
/// test bundle has to be located via a throwaway ObjC-visible class.
private final class FixtureAnchor: NSObject {}

/// Fixtures live in a `Fixtures/` subdirectory of the synchronized test
/// folder. Depending on how Xcode copies synchronized-folder resources they
/// land either under `Fixtures/` inside the bundle or flattened at the bundle
/// root — accept both layouts.
private func fixtureURL(_ name: String, _ ext: String) -> URL? {
    let bundle = Bundle(for: FixtureAnchor.self)
    return bundle.url(forResource: name, withExtension: ext, subdirectory: "Fixtures")
        ?? bundle.url(forResource: name, withExtension: ext)
}

// MARK: - Ground truth model (ruas-cse-sem4.groundtruth.json)

private struct GroundTruth: Decodable {
    let slots: [Slot]

    struct Slot: Decodable {
        let day: String        // "Mon" … "Sat"
        let start: String      // "08:15" (24-hour HH:MM)
        let end: String        // "09:05"
        let code: String       // "TSU-201A" (printed form, may contain hyphen)
        let room: String?      // "A-306"
        let type: String       // "lecture" | "lab" | "contact_hour"
        let batch: String?     // "1"/"2" when only one batch attends
        let altRoom: String?   // "D-404 (B2)" — accepted for roomAcc (§7)

        enum CodingKeys: String, CodingKey {
            case day, start, end, code, room, type, batch
            case altRoom = "alt_room"
        }
    }
}

// MARK: - §7 normalization, implemented exactly

/// code' = uppercased, all non-alphanumerics stripped ("TSU-201A" ≡ "TSU201A").
private func normCode(_ raw: String) -> String {
    String(raw.unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) }).uppercased()
}

/// day → 3-letter form, case-insensitive ("Monday"/"Mon"/"mon" → "MON").
private func dayKey(_ raw: String) -> String {
    String(raw.prefix(3)).uppercased()
}

private let dayOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

private func dayIndex(_ key: String) -> Int {
    dayOrder.firstIndex(of: key) ?? dayOrder.count
}

/// "HH:MM" (24-hour) → minutes since midnight; nil when malformed.
private func parseHHMM(_ raw: String) -> Int? {
    let parts = raw.split(separator: ":")
    guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]),
          (0..<24).contains(h), (0..<60).contains(m) else { return nil }
    return h * 60 + m
}

private func formatHHMM(_ minutes: Int) -> String {
    String(format: "%02d:%02d", (minutes / 60) % 24, minutes % 60)
}

/// Room comparison form (informational roomAcc only): text before the first
/// "(", uppercased alphanumerics — "D-404 (B2)" → "D404", "[A 205]" → "A205".
private func normRoom(_ raw: String) -> String {
    let head = raw.split(separator: "(").first.map(String.init) ?? raw
    return String(head.unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) }).uppercased()
}

// MARK: - §7 key matching

/// The (day, code', start, end) key of one slot, in metric currency.
private struct SlotKey {
    let day: String       // 3-letter uppercased
    let dayIdx: Int
    let code: String      // uppercased alphanumerics only ("" when no code)
    let start: Int        // minutes since midnight
    let end: Int
}

/// §7: p matches g iff day equal ∧ code' equal ∧ |Δstart| ≤ 5 ∧ |Δend| ≤ 5.
private func keyMatches(_ p: SlotKey, _ g: SlotKey) -> Bool {
    p.day == g.day && p.code == g.code
        && abs(p.start - g.start) <= 5 && abs(p.end - g.end) <= 5
}

private func isOrderedBefore(_ a: SlotKey, _ b: SlotKey) -> Bool {
    (a.dayIdx, a.start, a.end, a.code) < (b.dayIdx, b.start, b.end, b.code)
}

/// GT "type" → the exact SlotKind the parser must emit for kindAcc.
private func expectedKind(_ gtType: String) -> SlotKind {
    switch gtType {
    case "contact_hour": return .contactHour
    case "lab": return .lab
    default: return .lecture
    }
}

// MARK: - Diff-table rendering

private func pad(_ s: String, _ width: Int) -> String {
    s.count >= width ? s : s + String(repeating: " ", count: width - s.count)
}

private func gtColumns(_ g: GroundTruth.Slot) -> String {
    let room = (g.room ?? "-") + (g.altRoom.map { " / " + $0 } ?? "")
    return pad(dayKey(g.day), 4) + pad(normCode(g.code), 9)
        + pad("\(g.start)-\(g.end)", 13) + pad(g.type, 13)
        + pad(room, 21) + pad(g.batch ?? "-", 5)
}

private func predColumns(_ p: DraftSlot) -> String {
    let rooms = p.rooms.isEmpty
        ? "-"
        : p.rooms.map { room in room.room + (room.batch.map { b in "(B\(b))" } ?? "") }.joined(separator: "/")
    let batch = p.batch ?? (p.issues.contains(.ambiguousBatch) ? "?" : "-")
    let code = p.code.map(normCode) ?? "-"
    return pad(p.day.rawValue.uppercased(), 4) + pad(code, 9)
        + pad("\(formatHHMM(p.start))-\(formatHHMM(p.end))", 13)
        + pad(p.kind.rawValue, 13) + pad(rooms, 21) + pad(batch, 5)
}

// MARK: - The gate

struct ExtractionAcceptanceTests {

    @Test func ruasFixtureRungs1And2MeetAcceptanceGates() async throws {
        // ---- Fixtures. ----
        let jpgURL = try #require(
            fixtureURL("ruas-cse-sem4", "jpg"),
            "ruas-cse-sem4.jpg missing from the test bundle — is StudexTests/Fixtures/ part of the StudexTests target resources?")
        let gtURL = try #require(
            fixtureURL("ruas-cse-sem4.groundtruth", "json"),
            "ruas-cse-sem4.groundtruth.json missing from the test bundle")

        let groundTruth = try JSONDecoder().decode(GroundTruth.self, from: Data(contentsOf: gtURL))
        try #require(groundTruth.slots.count == 25,
                     "fixture integrity: the RUAS ground truth must contain exactly 25 slots, found \(groundTruth.slots.count)")

        // ---- Rungs 0+1+2, exactly as TimetableExtractor runs them (no refiners). ----
        let image = try #require(UIImage(contentsOfFile: jpgURL.path),
                                 "could not decode ruas-cse-sem4.jpg")
        let page = try #require(ImageNormalizer.normalizedForOCR(image),
                                "rung 0: ImageNormalizer.normalizedForOCR returned nil")
        let observations = try await TimetableOCR.recognize(page)          // rung 1 (Vision, slow on simulator — fine)
        let grid = try #require(TimetableOCR.makeGrid(from: observations),
                                "rung 1: Vision recognized no table on the RUAS fixture")
        let parse = GridParser.parsePage(grid, lines: GridLineDetector.verticalLines(in: page))   // rung 2
        let result = parse.result
        try #require(result.failure == nil,
                     "rung 2: GridParser failed with \(String(describing: result.failure))")
        #expect(parse.pageScore > 0,
                "page score is 0 — the orchestrator would discard this page as a cover/signature page")

        // ---- Keyed slots, sorted (day, start) for the greedy 1:1 match. ----
        var gtEntries: [(key: SlotKey, slot: GroundTruth.Slot)] = []
        for slot in groundTruth.slots {
            let start = try #require(parseHHMM(slot.start), "unparseable GT start \(slot.start)")
            let end = try #require(parseHHMM(slot.end), "unparseable GT end \(slot.end)")
            let day = dayKey(slot.day)
            gtEntries.append((key: SlotKey(day: day, dayIdx: dayIndex(day), code: normCode(slot.code),
                                           start: start, end: end),
                              slot: slot))
        }
        gtEntries.sort { isOrderedBefore($0.key, $1.key) }

        var predEntries: [(key: SlotKey, slot: DraftSlot)] = result.slots.map { slot in
            let day = dayKey(slot.day.rawValue)
            return (key: SlotKey(day: day, dayIdx: dayIndex(day), code: normCode(slot.code ?? ""),
                                 start: slot.start, end: slot.end),
                    slot: slot)
        }
        predEntries.sort { isOrderedBefore($0.key, $1.key) }

        // ---- §7 greedy 1:1 matching in (day, start) order; each g consumed once. ----
        var gMatchedBy = [Int?](repeating: nil, count: gtEntries.count)   // gt idx → pred idx
        var pMatchedTo = [Int?](repeating: nil, count: predEntries.count) // pred idx → gt idx
        for (pi, p) in predEntries.enumerated() {
            for (gi, g) in gtEntries.enumerated() where gMatchedBy[gi] == nil {
                if keyMatches(p.key, g.key) {
                    gMatchedBy[gi] = pi
                    pMatchedTo[pi] = gi
                    break
                }
            }
        }
        var pairs: [(pi: Int, gi: Int)] = []
        for (pi, gi) in pMatchedTo.enumerated() {
            if let gi { pairs.append((pi: pi, gi: gi)) }
        }

        // ---- §7 metrics. ----
        // keyF1 = 2|M| / (|P| + |GT|) — penalizes both misses and spam.
        let keyF1 = Double(2 * pairs.count) / Double(max(1, predEntries.count + gtEntries.count))

        var kindCorrect = 0
        var batchCorrect = 0
        var batchFlaggedUnknown = 0
        var batchWrong = 0
        var roomCorrect = 0
        for (pi, gi) in pairs {
            let p = predEntries[pi].slot
            let g = gtEntries[gi].slot

            // kindAcc: exact enum over matched pairs.
            if p.kind == expectedKind(g.type) { kindCorrect += 1 }

            // batchScore, §7 clause order: correct if equal (nil == nil included);
            // flagged-unknown if predicted nil AND .ambiguousBatch is flagged
            // (the confirm UI's batch-pick sheet resolves it); else WRONG.
            // A silently wrong batch corrupts the attendance denominator.
            if p.batch == g.batch {
                batchCorrect += 1
            } else if p.batch == nil && p.issues.contains(.ambiguousBatch) {
                batchFlaggedUnknown += 1
            } else {
                batchWrong += 1
            }

            // roomAcc (informational here): normalized primary room; GT alt_room accepted.
            let accepted = [g.room, g.altRoom].compactMap { $0 }.map(normRoom)
            if let primary = p.rooms.first?.room, accepted.contains(normRoom(primary)) {
                roomCorrect += 1
            }
        }
        let kindAcc = pairs.isEmpty ? 0 : Double(kindCorrect) / Double(pairs.count)
        let roomAcc = pairs.isEmpty ? 0 : Double(roomCorrect) / Double(pairs.count)

        // ---- Always print the metrics and the full side-by-side diff table. ----
        var log: [String] = []
        log.append("==== EXTRACTION ACCEPTANCE (extract.md §7) — RUAS fixture, rungs 1+2 only ====")
        log.append("|P| = \(predEntries.count)   |GT| = \(gtEntries.count)   |M| = \(pairs.count)")
        log.append(String(format: "keyF1   = %.3f   (gate >= 0.90)", keyF1))
        log.append(String(format: "kindAcc = %.3f   (gate >= 0.90)", kindAcc))
        log.append("batch   = correct \(batchCorrect) / flagged-unknown \(batchFlaggedUnknown) / wrong \(batchWrong)   (gate: wrong == 0)")
        log.append(String(format: "roomAcc = %.3f   (informational; §7 lists 0.85 — not asserted by this gate)", roomAcc))
        log.append("")
        let sideHeader = pad("DAY", 4) + pad("CODE", 9) + pad("START-END", 13)
            + pad("KIND", 13) + pad("ROOM", 21) + pad("BATCH", 5)
        log.append(pad("STATUS", 10) + pad("GROUND TRUTH", 68) + "PREDICTION")
        log.append(pad("", 10) + pad(sideHeader, 68) + sideHeader)
        for (gi, entry) in gtEntries.enumerated() {
            if let pi = gMatchedBy[gi] {
                log.append(pad("MATCH", 10) + pad(gtColumns(entry.slot), 68) + predColumns(predEntries[pi].slot))
            } else {
                log.append(pad("MISS", 10) + pad(gtColumns(entry.slot), 68) + "-")
            }
        }
        for (pi, entry) in predEntries.enumerated() where pMatchedTo[pi] == nil {
            log.append(pad("SPURIOUS", 10) + pad("-", 68) + predColumns(entry.slot))
        }
        print(log.joined(separator: "\n"))

        // ---- The acceptance gate (extract.md §7). Never weaken these. ----
        #expect(keyF1 >= 0.90,
                "keyF1 \(keyF1) is below the 0.90 acceptance gate — the grid pipeline missed or invented slots; see the diff table in the log")
        #expect(kindAcc >= 0.90,
                "kindAcc \(kindAcc) is below the 0.90 acceptance gate — lecture/lab/contact-hour classification regressed; see the diff table in the log")
        #expect(batchWrong == 0,
                "\(batchWrong) matched slot(s) carry a silently WRONG batch — §7 allows flagged-unknown (batch nil + .ambiguousBatch, resolved by the batch-pick sheet) but never a wrong batch: it corrupts the attendance percentage math")
    }
}
