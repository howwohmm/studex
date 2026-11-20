import Testing
import Foundation
import SwiftData
@testable import Studex

/// Standing computation + marker + locked-copy formatter, on a synthetic
/// in-memory container. Fixture dates: Jan 2026 (Jan 5 = Monday,
/// Jan 10 = Saturday, Jan 25 = Sunday). Helpers live in SemesterCalendarTests.
struct StandingTests {

    // MARK: - SubjectStanding

    @Test func subjectStandingFoldsBaselinePlusRecords() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)

        let subject = Subject(name: "CS204: Database Systems",
                              priorAttended: 20, priorHeld: 24)
        context.insert(subject)
        let slot = ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                startMinutes: 9 * 60, endMinutes: 10 * 60,
                                subject: subject)
        context.insert(slot)

        // 5 attended + 1 bunked count; notHeld and unmarked must not.
        for i in 0..<5 {
            context.insert(AttendanceRecord(date: coreTestDate(2026, 1, 5 + i, hour: 9),
                                            statusRaw: AttendanceStatus.attended.rawValue,
                                            subject: subject, slot: slot))
        }
        context.insert(AttendanceRecord(date: coreTestDate(2026, 1, 3, hour: 9),
                                        statusRaw: AttendanceStatus.bunked.rawValue,
                                        subject: subject, slot: slot))
        context.insert(AttendanceRecord(date: coreTestDate(2026, 1, 2, hour: 9),
                                        statusRaw: AttendanceStatus.notHeld.rawValue,
                                        subject: subject, slot: slot))
        context.insert(AttendanceRecord(date: coreTestDate(2026, 1, 1, hour: 9),
                                        statusRaw: AttendanceStatus.unmarked.rawValue,
                                        subject: subject, slot: slot))
        try context.save()

        let config = SemesterConfig(startDate: coreTestDate(2026, 1, 5),
                                    endDate: coreTestDate(2026, 1, 25),
                                    thresholdPercent: 75)
        context.insert(config)

        // As of Sat Jan 10: remaining Mondays are Jan 12 and Jan 19 → 2.
        let standing = SubjectStanding.compute(subject: subject,
                                               config: config,
                                               context: context,
                                               asOf: coreTestDate(2026, 1, 10))

        #expect(standing.tally.attended == 25)   // 20 prior + 5 marked
        #expect(standing.tally.held == 30)       // 24 prior + 5 + 1
        #expect(abs(standing.percent - (25.0 / 30.0 * 100)) < 0.001)
        #expect(standing.remaining == 2)
        // canMiss: floor(25 + 2 − 0.75·32) = 3, capped at 2 remaining.
        #expect(standing.canMiss == 2)
        #expect(standing.mustAttend == 0)        // already safe
        #expect(standing.band == .good)          // 83.3 ≥ 75 + 6 with slack
        #expect(standing.threshold == 75)

        // Locked §7 status line off the computed standing.
        #expect(StandingFormatter.statusLine(for: standing)
                == "83%. You can bunk 2 more and stay above 75%.")
        #expect(StandingFormatter.budgetChip(for: standing) == "2 to spare")
        #expect(StandingFormatter.a11ySubjectLine(name: "Database Systems", standing: standing)
                == "Database Systems. 83 percent. 25 of 30 attended. You can bunk 2 more.")
    }

    // MARK: - OverallStanding

    @Test func overallStandingAggregatesSubjects() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)

        // A: perfect, no future classes. B: 50%, two Mondays left.
        let a = Subject(name: "A", priorAttended: 10, priorHeld: 10)
        let b = Subject(name: "B", priorAttended: 5, priorHeld: 10)
        context.insert(a)
        context.insert(b)
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                    startMinutes: 9 * 60, endMinutes: 10 * 60,
                                    subject: b))
        try context.save()

        let config = SemesterConfig(startDate: coreTestDate(2026, 1, 5),
                                    endDate: coreTestDate(2026, 1, 25),
                                    thresholdPercent: 75)
        context.insert(config)

        let overall = OverallStanding.compute(subjects: [a, b],
                                              config: config,
                                              context: context,
                                              asOf: coreTestDate(2026, 1, 10))

        #expect(overall.tally.attended == 15)
        #expect(overall.tally.held == 20)
        #expect(overall.percent == 75.0)
        #expect(overall.remaining == 2)
        // canMiss: floor(15 + 2 − 0.75·22) = floor(0.5) = 0.
        #expect(overall.canMiss == 0)
        // mustAttend: ceil(0.75·22 − 15) = 2.
        #expect(overall.mustAttend == 2)
        #expect(overall.band == .close)

        // Budget 0 at threshold → the locked close sentence (§5).
        #expect(StandingFormatter.verdictLine(for: overall)
                == "You're at 75%. One bunk puts you under 75%.")
        #expect(StandingFormatter.spokenVerdictLine(for: overall)
                == "You're at 75 percent overall. One bunk puts you under 75.")
    }

    // MARK: - AttendanceMarker

    @Test func markerKeepsOneRecordPerSlotDay() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)

        let subject = Subject(name: "DBMS")
        context.insert(subject)
        let slot = ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                startMinutes: 9 * 60, endMinutes: 10 * 60,
                                subject: subject)
        context.insert(slot)
        try context.save()

        // Mark, then re-mark the same calendar day at another time-of-day:
        // still ONE record, status updated in place.
        let first = AttendanceMarker.mark(slot: slot,
                                          on: coreTestDate(2026, 1, 5, hour: 10, minute: 30),
                                          as: .attended, context: context)
        #expect(first?.status == .attended)
        let second = AttendanceMarker.mark(slot: slot,
                                           on: coreTestDate(2026, 1, 5, hour: 18),
                                           as: .bunked, context: context)
        #expect(second?.id == first?.id)

        var all = try context.fetch(FetchDescriptor<AttendanceRecord>())
        #expect(all.count == 1)
        #expect(all.first?.status == .bunked)
        #expect(all.first?.subject?.id == subject.id)

        // Backfill a different (past or future) day → a second record.
        AttendanceMarker.mark(slot: slot, on: coreTestDate(2026, 1, 12),
                              as: .attended, context: context)
        all = try context.fetch(FetchDescriptor<AttendanceRecord>())
        #expect(all.count == 2)

        // record(for:on:) finds the day's record anywhere inside the day.
        let found = AttendanceMarker.record(for: slot,
                                            on: coreTestDate(2026, 1, 12, hour: 23, minute: 59),
                                            context: context)
        #expect(found?.status == .attended)

        // clearMark removes the day's record; marking .unmarked does too.
        AttendanceMarker.clearMark(slot: slot, on: coreTestDate(2026, 1, 5),
                                   context: context)
        #expect(try context.fetch(FetchDescriptor<AttendanceRecord>()).count == 1)
        let cleared = AttendanceMarker.mark(slot: slot, on: coreTestDate(2026, 1, 12),
                                            as: .unmarked, context: context)
        #expect(cleared == nil)
        #expect(try context.fetch(FetchDescriptor<AttendanceRecord>()).isEmpty)
    }

    @Test func markerSeparatesTwoSlotsOnTheSameDay() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)

        let subject = Subject(name: "Maths")
        context.insert(subject)
        let morning = ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                   startMinutes: 9 * 60, endMinutes: 10 * 60,
                                   subject: subject)
        let afternoon = ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                     startMinutes: 14 * 60, endMinutes: 15 * 60,
                                     subject: subject)
        context.insert(morning)
        context.insert(afternoon)
        try context.save()

        let day = coreTestDate(2026, 1, 5, hour: 16)
        AttendanceMarker.mark(slot: morning, on: day, as: .attended, context: context)
        AttendanceMarker.mark(slot: afternoon, on: day, as: .bunked, context: context)

        let all = try context.fetch(FetchDescriptor<AttendanceRecord>())
        #expect(all.count == 2)
        #expect(AttendanceMarker.record(for: morning, on: day, context: context)?.status == .attended)
        #expect(AttendanceMarker.record(for: afternoon, on: day, context: context)?.status == .bunked)
    }

    // MARK: - StandingFormatter locked copy

    @Test func lockedSentencesMatchCopyPack() {
        // §5/§7 atoms
        #expect(StandingFormatter.budgetLine(above: 2, threshold: 75)
                == "You can bunk 2 more and stay above 75%.")
        #expect(StandingFormatter.budgetLine(above: 1, threshold: 75)
                == "You can bunk 1 more and stay above 75%.")
        #expect(StandingFormatter.recoveryLine(below: 3, threshold: 75)
                == "Attend the next 3 to reach 75%.")
        #expect(StandingFormatter.closeLine(threshold: 75)
                == "One bunk puts you under 75%.")
        // §6/§7 counts
        #expect(StandingFormatter.countsLine(attended: 23, held: 30)
                == "23 of 30 attended")
        // §5 recovery toast — the app's only exclamation mark.
        #expect(StandingFormatter.recoveredToast(threshold: 75)
                == "You're back above 75%!")
        // Non-default threshold flows through every sentence.
        #expect(StandingFormatter.budgetLine(above: 4, threshold: 85)
                == "You can bunk 4 more and stay above 85%.")
    }

    @Test func verdictLinePicksBudgetBasedBand() {
        // ABOVE: budget ≥ 1.
        #expect(StandingFormatter.verdictLine(percent: 83.33, canMiss: 2,
                                              mustAttend: 0, remaining: 2, threshold: 75)
                == "You're at 83%. You can bunk 2 more and stay above 75%.")
        // CLOSE: at/over threshold, budget 0.
        #expect(StandingFormatter.verdictLine(percent: 76.0, canMiss: 0,
                                              mustAttend: 0, remaining: 3, threshold: 75)
                == "You're at 76%. One bunk puts you under 75%.")
        // BELOW: under threshold → recovery number.
        #expect(StandingFormatter.verdictLine(percent: 64.2, canMiss: 0,
                                              mustAttend: 5, remaining: 9, threshold: 75)
                == "You're at 64%. Attend the next 5 to reach 75%.")
        // BELOW + unreachable (mustAttend nil) falls back to all remaining.
        #expect(StandingFormatter.verdictLine(percent: 50.0, canMiss: 0,
                                              mustAttend: nil, remaining: 4, threshold: 75)
                == "You're at 50%. Attend the next 4 to reach 75%.")
    }

    @Test func chipAndA11yFollowBands() {
        let below = SubjectStanding(tally: .init(attended: 14, held: 22),
                                    canMiss: 0, mustAttend: 5, band: .below,
                                    remaining: 9, threshold: 75)
        #expect(StandingFormatter.budgetChip(for: below) == "attend next 5")
        #expect(StandingFormatter.statusLine(for: below)
                == "64%. Attend the next 5 to reach 75%.")
        #expect(StandingFormatter.a11ySubjectLine(name: "Networks", standing: below)
                == "Networks. 64 percent. 14 of 22 attended. Attend the next 5 to reach 75 percent.")

        let close = SubjectStanding(tally: .init(attended: 18, held: 23),
                                    canMiss: 0, mustAttend: 0, band: .close,
                                    remaining: 2, threshold: 75)
        #expect(StandingFormatter.budgetChip(for: close) == "0 to spare")
        #expect(StandingFormatter.a11ySubjectLine(name: "DBMS", standing: close)
                == "DBMS. 78 percent. 18 of 23 attended. No bunks to spare.")
        #expect(StandingFormatter.spokenBunkLine(subjectName: "DBMS", standing: close)
                == "DBMS is at 78 percent. Bunk it and you're under 75.")
    }
}
