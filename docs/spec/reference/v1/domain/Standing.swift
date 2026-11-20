import Foundation
import SwiftData

// MARK: - SubjectStanding

/// One subject's complete computed standing: baseline + marked records folded
/// through `AttendanceEngine.tally`, forward budgets from
/// `SemesterCalendar.remainingScheduled`, band from `AttendanceEngine.verdict`.
///
/// EVERY surface (Today, Subjects rows, Subject Detail, intents, widgets,
/// notifications) must compute standings through this type — never re-derive
/// the math in a view.
struct SubjectStanding: Hashable {
    /// attended/held after folding priors + marked records.
    var tally: AttendanceEngine.SubjectTally
    /// Future classes you can miss and stay at/above threshold (never negative).
    var canMiss: Int
    /// Future classes you must attend to reach threshold. 0 = already safe,
    /// nil = unreachable even attending everything remaining.
    var mustAttend: Int?
    /// Color/tone band from the engine (+`closeBandMargin` semantics).
    var band: Verdict
    /// Remaining scheduled occurrences (contact hours excluded).
    var remaining: Int
    /// The threshold percent these numbers were computed against.
    var threshold: Double

    var percent: Double { tally.percent }

    /// Compute the standing for `subject` as of `date` (defaults to now).
    /// Records fold via the `subject.records` relationship; only `.attended`
    /// and `.bunked` count — `.unmarked` / `.notHeld` touch neither side.
    /// `context` is part of the stable call contract (reserved for fetch-based
    /// folding); it is not currently read.
    static func compute(subject: Subject,
                        config: SemesterConfig,
                        context: ModelContext,
                        asOf date: Date = Date()) -> SubjectStanding {
        var markedAttended = 0
        var markedBunked = 0
        for record in subject.records {
            switch record.status {
            case .attended: markedAttended += 1
            case .bunked: markedBunked += 1
            case .unmarked, .notHeld: break
            }
        }

        let tally = AttendanceEngine.tally(priorAttended: subject.priorAttended,
                                           priorHeld: subject.priorHeld,
                                           markedAttended: markedAttended,
                                           markedBunked: markedBunked)
        let remaining = SemesterCalendar.remainingScheduled(for: subject,
                                                            config: config,
                                                            after: date)
        let threshold = config.thresholdPercent
        let canMiss = AttendanceEngine.canMiss(attended: tally.attended,
                                               held: tally.held,
                                               totalScheduled: remaining,
                                               threshold: threshold)
        let mustAttend = AttendanceEngine.mustAttend(attended: tally.attended,
                                                     held: tally.held,
                                                     totalScheduled: remaining,
                                                     threshold: threshold)
        let band = AttendanceEngine.verdict(percent: tally.percent,
                                            canMissToday: canMiss > 0,
                                            threshold: threshold)
        return SubjectStanding(tally: tally,
                               canMiss: canMiss,
                               mustAttend: mustAttend,
                               band: band,
                               remaining: remaining,
                               threshold: threshold)
    }
}

// MARK: - OverallStanding

/// The aggregate standing across all subjects — the Today header number.
/// Same field semantics as `SubjectStanding`, computed over summed tallies and
/// `SemesterCalendar.remainingScheduledOverall`.
struct OverallStanding: Hashable {
    var tally: AttendanceEngine.SubjectTally
    var canMiss: Int
    var mustAttend: Int?
    var band: Verdict
    var remaining: Int
    var threshold: Double

    var percent: Double { tally.percent }

    /// Compute the overall standing across `subjects` as of `date`.
    /// `context` is part of the stable call contract; not currently read.
    static func compute(subjects: [Subject],
                        config: SemesterConfig,
                        context: ModelContext,
                        asOf date: Date = Date()) -> OverallStanding {
        var totalAttended = 0
        var totalHeld = 0
        for subject in subjects {
            var markedAttended = 0
            var markedBunked = 0
            for record in subject.records {
                switch record.status {
                case .attended: markedAttended += 1
                case .bunked: markedBunked += 1
                case .unmarked, .notHeld: break
                }
            }
            let tally = AttendanceEngine.tally(priorAttended: subject.priorAttended,
                                               priorHeld: subject.priorHeld,
                                               markedAttended: markedAttended,
                                               markedBunked: markedBunked)
            totalAttended += tally.attended
            totalHeld += tally.held
        }

        let tally = AttendanceEngine.SubjectTally(attended: totalAttended,
                                                  held: totalHeld)
        let remaining = SemesterCalendar.remainingScheduledOverall(subjects: subjects,
                                                                   config: config,
                                                                   after: date)
        let threshold = config.thresholdPercent
        let canMiss = AttendanceEngine.canMiss(attended: tally.attended,
                                               held: tally.held,
                                               totalScheduled: remaining,
                                               threshold: threshold)
        let mustAttend = AttendanceEngine.mustAttend(attended: tally.attended,
                                                     held: tally.held,
                                                     totalScheduled: remaining,
                                                     threshold: threshold)
        let band = AttendanceEngine.verdict(percent: tally.percent,
                                            canMissToday: canMiss > 0,
                                            threshold: threshold)
        return OverallStanding(tally: tally,
                               canMiss: canMiss,
                               mustAttend: mustAttend,
                               band: band,
                               remaining: remaining,
                               threshold: threshold)
    }
}

// MARK: - StandingFormatter

/// The LOCKED sentences from specs/briefs/copy.md — encoded once, verbatim.
/// Views must never assemble these strings themselves.
///
/// Sentence-band selection follows copy.md's conventions line, which is
/// BUDGET-based (ABOVE = bunk budget ≥ 1 · CLOSE = at/over threshold, budget 0
/// · BELOW = under threshold) so every sentence stays mathematically true.
/// The color band (`Verdict` via the engine's +6 margin) is a separate axis —
/// read it from the standing's `band` for tinting, not for copy.
enum StandingFormatter {

    // MARK: Sentence atoms (LOCKED)

    /// copy.md §5/§7 above-band tail: "You can bunk {n} more and stay above {threshold}%."
    static func budgetLine(above n: Int, threshold: Double) -> String {
        "You can bunk \(n) more and stay above \(pct(threshold))%."
    }

    /// copy.md §5/§7 below-band tail: "Attend the next {n} to reach {threshold}%."
    static func recoveryLine(below n: Int, threshold: Double) -> String {
        "Attend the next \(n) to reach \(pct(threshold))%."
    }

    /// copy.md §5/§7 close-band tail: "One bunk puts you under {threshold}%."
    static func closeLine(threshold: Double) -> String {
        "One bunk puts you under \(pct(threshold))%."
    }

    /// copy.md §6 `subjects.row.subtitle` / §7 `detail.status.counts`:
    /// "{attended} of {held} attended"
    static func countsLine(attended: Int, held: Int) -> String {
        "\(attended) of \(held) attended"
    }

    /// copy.md §5 `today.toast.recovered`: "You're back above {threshold}%!"
    /// THE ONLY EXCLAMATION MARK IN THE APP. Fires once, on crossing up
    /// through the threshold.
    static func recoveredToast(threshold: Double) -> String {
        "You're back above \(pct(threshold))%!"
    }

    // MARK: today.verdict.* (§5 — Today header, overall)

    /// "You're at {percent}%. " + the band tail.
    static func verdictLine(percent: Double,
                            canMiss: Int,
                            mustAttend: Int?,
                            remaining: Int,
                            threshold: Double) -> String {
        let prefix = "You're at \(pct(percent))%. "
        switch copyBand(percent: percent, canMiss: canMiss, threshold: threshold) {
        case .good:
            return prefix + budgetLine(above: canMiss, threshold: threshold)
        case .close:
            return prefix + closeLine(threshold: threshold)
        case .below:
            return prefix + recoveryLine(below: mustAttend ?? remaining, threshold: threshold)
        }
    }

    static func verdictLine(for standing: OverallStanding) -> String {
        verdictLine(percent: standing.percent,
                    canMiss: standing.canMiss,
                    mustAttend: standing.mustAttend,
                    remaining: standing.remaining,
                    threshold: standing.threshold)
    }

    // MARK: detail.status.* (§7 — Subject Detail status card)

    /// "{percent}%. " + the band tail.
    static func statusLine(percent: Double,
                           canMiss: Int,
                           mustAttend: Int?,
                           remaining: Int,
                           threshold: Double) -> String {
        let prefix = "\(pct(percent))%. "
        switch copyBand(percent: percent, canMiss: canMiss, threshold: threshold) {
        case .good:
            return prefix + budgetLine(above: canMiss, threshold: threshold)
        case .close:
            return prefix + closeLine(threshold: threshold)
        case .below:
            return prefix + recoveryLine(below: mustAttend ?? remaining, threshold: threshold)
        }
    }

    static func statusLine(for standing: SubjectStanding) -> String {
        statusLine(percent: standing.percent,
                   canMiss: standing.canMiss,
                   mustAttend: standing.mustAttend,
                   remaining: standing.remaining,
                   threshold: standing.threshold)
    }

    // MARK: Today row budget chip (SPEC §Screens)

    /// The per-row chip appended to a Today row subtitle with "· ":
    /// "2 to spare" (above, incl. "0 to spare" at zero budget) or
    /// "attend next 1" (below). The caller supplies the separator.
    static func budgetChip(percent: Double,
                           canMiss: Int,
                           mustAttend: Int?,
                           remaining: Int,
                           threshold: Double) -> String {
        switch copyBand(percent: percent, canMiss: canMiss, threshold: threshold) {
        case .good:
            return "\(canMiss) to spare"
        case .close:
            return "0 to spare"
        case .below:
            return "attend next \(mustAttend ?? remaining)"
        }
    }

    static func budgetChip(for standing: SubjectStanding) -> String {
        budgetChip(percent: standing.percent,
                   canMiss: standing.canMiss,
                   mustAttend: standing.mustAttend,
                   remaining: standing.remaining,
                   threshold: standing.threshold)
    }

    // MARK: a11y.subject.* (§6 — VoiceOver for Subjects row + gauge)

    /// "{subject}. {percent} percent. {attended} of {held} attended. " + band tail.
    static func a11ySubjectLine(name: String, standing: SubjectStanding) -> String {
        let base = "\(name). \(pct(standing.percent)) percent. "
            + countsLine(attended: standing.tally.attended, held: standing.tally.held)
            + ". "
        switch copyBand(percent: standing.percent,
                        canMiss: standing.canMiss,
                        threshold: standing.threshold) {
        case .good:
            return base + "You can bunk \(standing.canMiss) more."
        case .close:
            return base + "No bunks to spare."
        case .below:
            return base + "Attend the next \(standing.mustAttend ?? standing.remaining) to reach \(pct(standing.threshold)) percent."
        }
    }

    // MARK: siri.verdict.* (§11 — spoken, no "%" symbol)

    /// "You're at {percent} percent overall. " + spoken band tail.
    static func spokenVerdictLine(for standing: OverallStanding) -> String {
        let prefix = "You're at \(pct(standing.percent)) percent overall. "
        switch copyBand(percent: standing.percent,
                        canMiss: standing.canMiss,
                        threshold: standing.threshold) {
        case .good:
            return prefix + "You can bunk \(standing.canMiss) more and stay above \(pct(standing.threshold))."
        case .close:
            return prefix + "One bunk puts you under \(pct(standing.threshold))."
        case .below:
            return prefix + "Attend the next \(standing.mustAttend ?? standing.remaining) to reach \(pct(standing.threshold))."
        }
    }

    // MARK: siri.bunk.* (§11 — spoken, subject-scoped)

    /// "{subject} is at {percent} percent. " + spoken band tail.
    static func spokenBunkLine(subjectName: String, standing: SubjectStanding) -> String {
        let prefix = "\(subjectName) is at \(pct(standing.percent)) percent. "
        switch copyBand(percent: standing.percent,
                        canMiss: standing.canMiss,
                        threshold: standing.threshold) {
        case .good:
            return prefix + "You've got \(standing.canMiss) bunks in the budget."
        case .close:
            return prefix + "Bunk it and you're under \(pct(standing.threshold))."
        case .below:
            return prefix + "Attend the next \(standing.mustAttend ?? standing.remaining) to reach \(pct(standing.threshold))."
        }
    }

    // MARK: Helpers

    /// copy.md conventions line — the copy band is BUDGET-based:
    /// ABOVE = bunk budget ≥ 1 · CLOSE = at/over threshold, budget 0 ·
    /// BELOW = under threshold.
    private static func copyBand(percent: Double,
                                 canMiss: Int,
                                 threshold: Double) -> Verdict {
        if percent < threshold { return .below }
        if canMiss >= 1 { return .good }
        return .close
    }

    /// Whole-number rendering for percents and thresholds ("83", "75").
    private static func pct(_ value: Double) -> String {
        String(Int(value.rounded()))
    }
}
