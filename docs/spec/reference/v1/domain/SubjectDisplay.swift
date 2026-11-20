import Foundation

extension Subject {
    /// A clean, human-facing subject name with any leading course-code token
    /// stripped. Extraction often yields names like
    /// "TSU-201A: Universal Human Values" or "CS201 - Data Structures";
    /// this returns just "Universal Human Values" / "Data Structures".
    ///
    /// Robust to names that have no code prefix — those are returned trimmed,
    /// unchanged. The full `name` and `code` remain available untouched.
    var displayName: String {
        let stripped = SubjectNameFormatter.strippingLeadingCode(from: name)
        return stripped.isEmpty ? name.trimmingCharacters(in: .whitespacesAndNewlines) : stripped
    }
}

/// Pure string logic for stripping a leading course-code token from a subject
/// name. Kept separate so it's testable and reusable (e.g. for previews).
enum SubjectNameFormatter {
    /// Strips a leading code token followed by a separator (": " or " - ").
    /// A code token is letters then digits, optionally with an internal dash and
    /// trailing letters, e.g. "TSU-201A", "CS201", "MATH-1001", "BIO2L".
    ///
    /// Returns the trimmed remainder, or the trimmed original if no code prefix
    /// is found.
    static func strippingLeadingCode(from raw: String) -> String {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "" }

        // ^<letters>(-?<digits><letters?>)  then  ": " or " - " or ":" / " - "
        // Allow 1+ leading letters, optional dash, 1+ digits, optional trailing
        // letters. Then a separator: colon (optionally spaced) or dash padded
        // with spaces.
        let pattern = #"^[A-Za-z]+-?\d+[A-Za-z]*\s*(?::|-)\s+(.+)$"#
        if let regex = try? NSRegularExpression(pattern: pattern),
           let match = regex.firstMatch(
                in: trimmed,
                range: NSRange(trimmed.startIndex..., in: trimmed)),
           match.numberOfRanges >= 2,
           let r = Range(match.range(at: 1), in: trimmed) {
            let rest = String(trimmed[r]).trimmingCharacters(in: .whitespacesAndNewlines)
            if !rest.isEmpty { return rest }
        }

        return trimmed
    }
}
