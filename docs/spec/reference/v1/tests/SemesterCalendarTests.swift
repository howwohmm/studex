import Testing
import Foundation
import SwiftData
@testable import Studex

// MARK: - Shared core-test helpers (also used by StandingTests)

/// Build a date from fixed components via Calendar.current — the same calendar
/// SemesterCalendar computes with. All fixtures use January 2026:
/// Jan 5 = Monday, Jan 10 = Saturday, Jan 11 = Sunday, Jan 25 = Sunday.
func coreTestDate(_ year: Int, _ month: Int, _ day: Int,
                  hour: Int = 0, minute: Int = 0) -> Date {
    var comps = DateComponents()
    comps.year = year
    comps.month = month
    comps.day = day
    comps.hour = hour
    comps.minute = minute
    return Calendar.current.date(from: comps)!
}

/// Fresh in-memory container over the app's single model list.
func makeCoreTestContainer() throws -> ModelContainer {
    let schema = Schema(AppModelContainer.allModels)
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    return try ModelContainer(for: schema, configurations: [config])
}

// MARK: - SemesterCalendarTests

struct SemesterCalendarTests {

    // MARK: Occurrences

    @Test func holidayExcludedByStartOfDayCompare() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        let slot = ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                startMinutes: 9 * 60, endMinutes: 10 * 60)
        context.insert(slot)

        // Holiday stored mid-day must still knock out the whole Monday.
        let holidayAtNoon = coreTestDate(2026, 1, 5, hour: 12, minute: 30)
        let occ = SemesterCalendar.occurrences(of: slot,
                                               from: coreTestDate(2026, 1, 5),
                                               to: coreTestDate(2026, 1, 11),
                                               holidays: [holidayAtNoon])
        #expect(occ.isEmpty)

        // Without the holiday the Monday is back.
        let occNoHoliday = SemesterCalendar.occurrences(of: slot,
                                                        from: coreTestDate(2026, 1, 5),
                                                        to: coreTestDate(2026, 1, 11),
                                                        holidays: [])
        #expect(occNoHoliday.count == 1)
    }

    @Test func saturdaySlotCountedAndNormalizedToStartOfDay() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        let slot = ScheduleSlot(dayOfWeekRaw: Weekday.sat.rawValue,
                                startMinutes: 8 * 60 + 15, endMinutes: 10 * 60 + 45)
        context.insert(slot)

        let occ = SemesterCalendar.occurrences(of: slot,
                                               from: coreTestDate(2026, 1, 5),
                                               to: coreTestDate(2026, 1, 11),
                                               holidays: [])
        #expect(occ.count == 1)
        // Sat Jan 10, normalized to startOfDay.
        #expect(occ.first == coreTestDate(2026, 1, 10))
    }

    @Test func multiPeriodLabIsOneOccurrence() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        // A 3h50m lab block: one slot, one occurrence per matching day.
        let lab = ScheduleSlot(dayOfWeekRaw: Weekday.wed.rawValue,
                               startMinutes: 9 * 60, endMinutes: 12 * 60 + 50,
                               kindRaw: ClassKind.lab.rawValue)
        context.insert(lab)

        let occ = SemesterCalendar.occurrences(of: lab,
                                               from: coreTestDate(2026, 1, 5),
                                               to: coreTestDate(2026, 1, 11),
                                               holidays: [])
        #expect(occ.count == 1)
    }

    @Test func invertedRangeYieldsNothing() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        let slot = ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                startMinutes: 9 * 60, endMinutes: 10 * 60)
        context.insert(slot)

        let occ = SemesterCalendar.occurrences(of: slot,
                                               from: coreTestDate(2026, 1, 11),
                                               to: coreTestDate(2026, 1, 5),
                                               holidays: [])
        #expect(occ.isEmpty)
    }

    // MARK: Remaining budgets

    @Test func contactHourExcludedFromRemaining() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        let subject = Subject(name: "Mentoring-heavy Subject")
        context.insert(subject)
        // Lecture Mon + tutorial Tue count; contact hour Wed must not.
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                    startMinutes: 9 * 60, endMinutes: 10 * 60,
                                    kindRaw: ClassKind.lecture.rawValue,
                                    subject: subject))
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.tue.rawValue,
                                    startMinutes: 9 * 60, endMinutes: 10 * 60,
                                    kindRaw: ClassKind.tutorial.rawValue,
                                    subject: subject))
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.wed.rawValue,
                                    startMinutes: 9 * 60, endMinutes: 10 * 60,
                                    kindRaw: ClassKind.contactHour.rawValue,
                                    subject: subject))
        try context.save()

        let config = SemesterConfig(startDate: coreTestDate(2026, 1, 5),
                                    endDate: coreTestDate(2026, 1, 11))
        context.insert(config)

        let remaining = SemesterCalendar.remainingScheduled(for: subject,
                                                            config: config,
                                                            after: coreTestDate(2026, 1, 4))
        #expect(remaining == 2)
    }

    @Test func afterDateIsExclusiveAtDayGranularity() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        let subject = Subject(name: "DBMS")
        context.insert(subject)
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                    startMinutes: 9 * 60, endMinutes: 10 * 60,
                                    subject: subject))
        try context.save()

        let config = SemesterConfig(startDate: coreTestDate(2026, 1, 5),
                                    endDate: coreTestDate(2026, 1, 11))
        context.insert(config)

        // "after Monday 08:00" excludes that whole Monday — even though the
        // class hasn't started yet, remaining* is day-granular and exclusive.
        let afterMondayMorning = SemesterCalendar.remainingScheduled(
            for: subject, config: config,
            after: coreTestDate(2026, 1, 5, hour: 8))
        #expect(afterMondayMorning == 0)

        // "after Sunday" includes Monday.
        let afterSunday = SemesterCalendar.remainingScheduled(
            for: subject, config: config,
            after: coreTestDate(2026, 1, 4))
        #expect(afterSunday == 1)
    }

    @Test func fourMonthSemesterCountsEveryMonday() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        let subject = Subject(name: "Networks")
        context.insert(subject)
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                    startMinutes: 9 * 60, endMinutes: 10 * 60,
                                    subject: subject))
        try context.save()

        // Jan 5 → May 5, 2026. Mondays: Jan 5,12,19,26 · Feb 2,9,16,23 ·
        // Mar 2,9,16,23,30 · Apr 6,13,20,27 · May 4 = 18.
        let config = SemesterConfig(startDate: coreTestDate(2026, 1, 5),
                                    endDate: coreTestDate(2026, 5, 5))
        context.insert(config)

        let remaining = SemesterCalendar.remainingScheduled(for: subject,
                                                            config: config,
                                                            after: coreTestDate(2026, 1, 4))
        #expect(remaining == 18)

        // A holiday landing on one of those Mondays removes exactly one.
        config.holidayDates = [coreTestDate(2026, 3, 16, hour: 9)]
        let withHoliday = SemesterCalendar.remainingScheduled(for: subject,
                                                              config: config,
                                                              after: coreTestDate(2026, 1, 4))
        #expect(withHoliday == 17)
    }

    @Test func twoSlotsOnSameDayCountAsTwo() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        let subject = Subject(name: "Maths")
        context.insert(subject)
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                    startMinutes: 9 * 60, endMinutes: 10 * 60,
                                    subject: subject))
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                    startMinutes: 14 * 60, endMinutes: 15 * 60,
                                    subject: subject))
        try context.save()

        let config = SemesterConfig(startDate: coreTestDate(2026, 1, 5),
                                    endDate: coreTestDate(2026, 1, 11))
        context.insert(config)

        let remaining = SemesterCalendar.remainingScheduled(for: subject,
                                                            config: config,
                                                            after: coreTestDate(2026, 1, 4))
        #expect(remaining == 2)
    }

    @Test func remainingOverallSumsSubjects() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        let a = Subject(name: "A")
        let b = Subject(name: "B")
        context.insert(a)
        context.insert(b)
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                    startMinutes: 9 * 60, endMinutes: 10 * 60,
                                    subject: a))
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.tue.rawValue,
                                    startMinutes: 9 * 60, endMinutes: 10 * 60,
                                    subject: b))
        try context.save()

        let config = SemesterConfig(startDate: coreTestDate(2026, 1, 5),
                                    endDate: coreTestDate(2026, 1, 11))
        context.insert(config)

        let overall = SemesterCalendar.remainingScheduledOverall(
            subjects: [a, b], config: config, after: coreTestDate(2026, 1, 4))
        #expect(overall == 2)
    }

    @Test func degenerateConfigYieldsZero() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        let subject = Subject(name: "Backwards")
        context.insert(subject)
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                    startMinutes: 9 * 60, endMinutes: 10 * 60,
                                    subject: subject))
        try context.save()

        // end before start
        let inverted = SemesterConfig(startDate: coreTestDate(2026, 1, 11),
                                      endDate: coreTestDate(2026, 1, 5))
        context.insert(inverted)
        #expect(SemesterCalendar.remainingScheduled(for: subject,
                                                    config: inverted,
                                                    after: coreTestDate(2026, 1, 1)) == 0)

        // "after" already past the end
        let normal = SemesterConfig(startDate: coreTestDate(2026, 1, 5),
                                    endDate: coreTestDate(2026, 1, 11))
        context.insert(normal)
        #expect(SemesterCalendar.remainingScheduled(for: subject,
                                                    config: normal,
                                                    after: coreTestDate(2026, 1, 11)) == 0)
    }

    @Test func semesterEndDayIsInclusiveDespiteTimeComponents() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        let subject = Subject(name: "Sat Lab")
        context.insert(subject)
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.sat.rawValue,
                                    startMinutes: 8 * 60, endMinutes: 11 * 60,
                                    kindRaw: ClassKind.lab.rawValue,
                                    subject: subject))
        try context.save()

        // Dates carrying times still count the full end day (Sat Jan 10).
        let config = SemesterConfig(startDate: coreTestDate(2026, 1, 5, hour: 9),
                                    endDate: coreTestDate(2026, 1, 10, hour: 17))
        context.insert(config)

        let remaining = SemesterCalendar.remainingScheduled(for: subject,
                                                            config: config,
                                                            after: coreTestDate(2026, 1, 4))
        #expect(remaining == 1)
    }

    // MARK: Catch-up helper

    @Test func scheduledCountClampsToSemesterAndSkipsContactHours() throws {
        let container = try makeCoreTestContainer()
        let context = ModelContext(container)
        let subject = Subject(name: "DBMS")
        context.insert(subject)
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.mon.rawValue,
                                    startMinutes: 9 * 60, endMinutes: 10 * 60,
                                    subject: subject))
        context.insert(ScheduleSlot(dayOfWeekRaw: Weekday.wed.rawValue,
                                    startMinutes: 15 * 60, endMinutes: 16 * 60,
                                    kindRaw: ClassKind.contactHour.rawValue,
                                    subject: subject))
        try context.save()

        let config = SemesterConfig(startDate: coreTestDate(2026, 1, 5),
                                    endDate: coreTestDate(2026, 5, 5))
        context.insert(config)

        // Asking from before the semester clamps to the start: Mondays
        // Jan 5, 12, 19 fall in [start, Jan 20] → 3. Contact hours skipped.
        let held = SemesterCalendar.scheduledCount(for: subject,
                                                   config: config,
                                                   from: coreTestDate(2025, 12, 1),
                                                   to: coreTestDate(2026, 1, 20))
        #expect(held == 3)
    }
}
