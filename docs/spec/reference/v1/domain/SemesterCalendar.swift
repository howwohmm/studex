import Foundation
import SwiftData

/// The ONLY source of scheduled-occurrence math (SPEC §SemesterCalendar).
/// Pure date arithmetic on `Calendar.current` — no fetches, no UI.
///
/// Rules:
/// - A slot contributes ONE occurrence per matching weekday-day in range that
///   is not a holiday. A multi-period lab (one slot spanning hours) is still
///   ONE occurrence.
/// - Holidays are compared by `startOfDay`, so a holiday stored with any
///   time-of-day still knocks out the whole day.
/// - `remaining*` is strictly AFTER the given date — day-granular and
///   exclusive — up to and including the semester end date.
/// - Contact hours (`ClassKind.contactHour`) never enter forward budgets;
///   tutorials count like lectures.
/// - Degenerate/inverted ranges (end before start) yield zero occurrences.
enum SemesterCalendar {

    // MARK: - Occurrences

    /// Concrete dates (each normalized to `startOfDay`) on which `slot` occurs
    /// in [`from`, `to`] inclusive, excluding holidays. Weekends are included
    /// only when the slot's weekday says so.
    static func occurrences(of slot: ScheduleSlot,
                            from: Date,
                            to: Date,
                            holidays: [Date]) -> [Date] {
        let calendar = Calendar.current
        var day = calendar.startOfDay(for: from)
        let last = calendar.startOfDay(for: to)
        guard day <= last else { return [] }

        let holidaySet = Set(holidays.map { calendar.startOfDay(for: $0) })
        let targetWeekday = slot.dayOfWeekRaw

        var result: [Date] = []
        while day <= last {
            if weekdayRaw(of: day, calendar: calendar) == targetWeekday,
               !holidaySet.contains(day) {
                result.append(day)
            }
            guard let next = calendar.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
        }
        return result
    }

    // MARK: - Remaining (forward budgets)

    /// Remaining markable occurrences for `subject` strictly AFTER `date`
    /// (exclusive, day-granular) through the semester end. Contact hours are
    /// excluded — they default to notHeld and never enter forward budgets.
    ///
    /// Feed this into `AttendanceEngine.canMiss/mustAttend` as `totalScheduled`.
    static func remainingScheduled(for subject: Subject,
                                   config: SemesterConfig,
                                   after date: Date) -> Int {
        let calendar = Calendar.current
        let dayAfter = calendar.date(byAdding: .day, value: 1,
                                     to: calendar.startOfDay(for: date))
            ?? calendar.startOfDay(for: date)
        let from = max(dayAfter, calendar.startOfDay(for: config.startDate))
        let to = calendar.startOfDay(for: config.endDate)
        guard from <= to else { return 0 }

        var count = 0
        for slot in subject.slots where slot.kind != .contactHour {
            count += occurrences(of: slot, from: from, to: to,
                                 holidays: config.holidayDates).count
        }
        return count
    }

    /// Sum of `remainingScheduled` across `subjects` — the overall budget
    /// denominator for the Today header, notifications and the intent.
    static func remainingScheduledOverall(subjects: [Subject],
                                          config: SemesterConfig,
                                          after date: Date) -> Int {
        subjects.reduce(0) {
            $0 + remainingScheduled(for: $1, config: config, after: date)
        }
    }

    // MARK: - Elapsed (catch-up defaults)

    /// Scheduled occurrences for `subject` in [`from`, `to`] inclusive, clamped
    /// to the semester window, holidays excluded, contact hours excluded.
    /// Powers the Catch Up screen's pre-computed "Classes held" default
    /// (semester start → today).
    static func scheduledCount(for subject: Subject,
                               config: SemesterConfig,
                               from: Date,
                               to: Date) -> Int {
        let calendar = Calendar.current
        let lower = max(calendar.startOfDay(for: from),
                        calendar.startOfDay(for: config.startDate))
        let upper = min(calendar.startOfDay(for: to),
                        calendar.startOfDay(for: config.endDate))
        guard lower <= upper else { return 0 }

        var count = 0
        for slot in subject.slots where slot.kind != .contactHour {
            count += occurrences(of: slot, from: lower, to: upper,
                                 holidays: config.holidayDates).count
        }
        return count
    }

    // MARK: - Helpers

    /// Map `Calendar.component(.weekday)` (Sun=1…Sat=7) to the app scheme
    /// (Mon=1…Sun=7) used by `Weekday` / `ScheduleSlot.dayOfWeekRaw`.
    private static func weekdayRaw(of day: Date, calendar: Calendar) -> Int {
        let component = calendar.component(.weekday, from: day)
        return component == 1 ? 7 : component - 1
    }
}
