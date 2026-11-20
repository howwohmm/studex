import Foundation

// MARK: - Weekday

/// Days of the week, raw values matching ISO-ish Mon=1 ... Sun=7
/// (also aligns with the extraction contract: days are 1..7 Mon..Sun).
enum Weekday: Int, CaseIterable, Identifiable, Hashable {
    case mon = 1
    case tue = 2
    case wed = 3
    case thu = 4
    case fri = 5
    case sat = 6
    case sun = 7

    var id: Int { rawValue }

    /// Short label, e.g. "Mon".
    var short: String {
        switch self {
        case .mon: return "Mon"
        case .tue: return "Tue"
        case .wed: return "Wed"
        case .thu: return "Thu"
        case .fri: return "Fri"
        case .sat: return "Sat"
        case .sun: return "Sun"
        }
    }

    /// Full label, e.g. "Monday".
    var full: String {
        switch self {
        case .mon: return "Monday"
        case .tue: return "Tuesday"
        case .wed: return "Wednesday"
        case .thu: return "Thursday"
        case .fri: return "Friday"
        case .sat: return "Saturday"
        case .sun: return "Sunday"
        }
    }

    /// Today's weekday. Calendar.component(.weekday) is Sun=1...Sat=7,
    /// remap to our Mon=1...Sun=7 scheme.
    static var today: Weekday {
        let comp = Calendar.current.component(.weekday, from: Date())
        // Sun=1 Mon=2 ... Sat=7  ->  Mon=1 ... Sun=7
        let mapped = comp == 1 ? 7 : comp - 1
        return Weekday(rawValue: mapped) ?? .mon
    }
}

// MARK: - ClassKind

/// The kind of a scheduled class. Stored as raw Int.
///
/// Budget math: lectures, labs and tutorials all count toward attendance;
/// contact hours are EXCLUDED from forward budgets (see SemesterCalendar) and
/// default to "not held" unless individually marked.
enum ClassKind: Int, CaseIterable, Identifiable, Hashable {
    case lecture = 0
    case lab = 1
    case contactHour = 2
    case tutorial = 3

    var id: Int { rawValue }

    /// Human-facing name, e.g. "Lecture".
    var displayName: String {
        switch self {
        case .lecture: return "Lecture"
        case .lab: return "Lab"
        case .contactHour: return "Contact Hour"
        case .tutorial: return "Tutorial"
        }
    }

    /// Legacy spelling kept for existing call sites; prefer `displayName`.
    var label: String { displayName }
}

// MARK: - AttendanceStatus

/// Per-class attendance mark. Stored as raw Int.
enum AttendanceStatus: Int, CaseIterable, Identifiable, Hashable {
    case unmarked = 0
    case attended = 1
    case bunked = 2
    case notHeld = 3

    var id: Int { rawValue }

    var label: String {
        switch self {
        case .unmarked: return "Unmarked"
        case .attended: return "Attended"
        case .bunked: return "Bunked"
        case .notHeld: return "Not Held"
        }
    }
}

// MARK: - Verdict

/// The 3-band attendance verdict. BAND LOGIC ONLY — this enum carries no
/// user-facing copy. Every locked sentence lives in `StandingFormatter`
/// (Domain/Standing.swift); band boundaries live in
/// `AttendanceEngine.verdict(percent:canMissToday:threshold:)` with the
/// "close" width in `AttendanceEngine.closeBandMargin`.
///
/// good = comfortably above threshold · close = at/above but no slack ·
/// below = under threshold.
enum Verdict: Hashable, CaseIterable {
    case good
    case close
    case below
}
