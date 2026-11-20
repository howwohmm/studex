import Foundation
import SwiftData

/// The ONLY write-path for attendance marks. Guarantees exactly one
/// `AttendanceRecord` per (slot, calendar day) — find-or-create — and is
/// backfill-safe: `date` can be any day (today, a past day from the heatmap
/// sheet, a notification action's fire date).
///
/// Unmarked is represented by the ABSENCE of a record: marking `.unmarked`
/// deletes any existing record for that slot-day.
enum AttendanceMarker {

    // MARK: - Mark

    /// Find-or-create the record for (`slot`, same calendar day as `date`),
    /// set its status, and save. Passing `.unmarked` clears the mark instead
    /// (removes the record). Returns the record, or nil after a clear.
    @discardableResult
    static func mark(slot: ScheduleSlot,
                     on date: Date,
                     as status: AttendanceStatus,
                     context: ModelContext) -> AttendanceRecord? {
        if status == .unmarked {
            clearMark(slot: slot, on: date, context: context)
            return nil
        }

        if let existing = record(for: slot, on: date, context: context) {
            existing.statusRaw = status.rawValue
            try? context.save()
            return existing
        }

        let created = AttendanceRecord(date: timestamp(for: slot, on: date),
                                       statusRaw: status.rawValue,
                                       subject: slot.subject,
                                       slot: slot)
        context.insert(created)
        try? context.save()
        return created
    }

    // MARK: - Fetch

    /// The existing record for (`slot`, same calendar day as `date`), if any.
    static func record(for slot: ScheduleSlot,
                       on date: Date,
                       context: ModelContext) -> AttendanceRecord? {
        let calendar = Calendar.current
        let dayStart = calendar.startOfDay(for: date)
        guard let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) else {
            return nil
        }

        let predicate = #Predicate<AttendanceRecord> {
            $0.date >= dayStart && $0.date < dayEnd
        }
        let descriptor = FetchDescriptor<AttendanceRecord>(predicate: predicate)
        guard let dayRecords = try? context.fetch(descriptor) else { return nil }

        let slotID = slot.id
        return dayRecords.first { $0.slot?.id == slotID }
    }

    // MARK: - Clear

    /// Delete the record for (`slot`, same calendar day as `date`), returning
    /// that occurrence to the unmarked state. No-op when nothing is marked.
    static func clearMark(slot: ScheduleSlot,
                          on date: Date,
                          context: ModelContext) {
        guard let existing = record(for: slot, on: date, context: context) else { return }
        context.delete(existing)
        try? context.save()
    }

    // MARK: - Helpers

    /// Stable timestamp for a new record: the slot's start time pinned onto
    /// `date`'s calendar day (falls back to startOfDay). Keeps every record
    /// inside its day bucket regardless of when the user actually tapped.
    private static func timestamp(for slot: ScheduleSlot, on date: Date) -> Date {
        let calendar = Calendar.current
        let hour = (slot.startMinutes / 60) % 24
        let minute = slot.startMinutes % 60
        return calendar.date(bySettingHour: hour, minute: minute, second: 0, of: date)
            ?? calendar.startOfDay(for: date)
    }
}
