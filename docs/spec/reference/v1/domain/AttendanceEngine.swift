import Foundation

/// Pure attendance math. NO SwiftData import here — callers fold in the
/// priorAttended/priorHeld baselines plus marked records into simple ints
/// before calling these functions.
enum AttendanceEngine {

    /// A computed standing for one subject (or an aggregate).
    struct SubjectTally: Hashable {
        var attended: Int
        var held: Int

        /// Percentage attended of held classes, 0...100. Zero held -> 100
        /// (you can't be below the line before any class has happened).
        var percent: Double {
            guard held > 0 else { return 100 }
            return (Double(attended) / Double(held)) * 100.0
        }
    }

    // MARK: - Tally

    /// Combine the prior baseline (from before the app started tracking) with
    /// in-app marked records into a single tally. "notHeld" / "unmarked"
    /// records simply don't contribute to either count and so are not passed in.
    static func tally(priorAttended: Int,
                      priorHeld: Int,
                      markedAttended: Int,
                      markedBunked: Int) -> SubjectTally {
        let attended = max(0, priorAttended) + max(0, markedAttended)
        let held = max(0, priorHeld) + max(0, markedAttended) + max(0, markedBunked)
        return SubjectTally(attended: attended, held: held)
    }

    // MARK: - Can Miss

    /// How many of the remaining/total scheduled classes you can still miss and
    /// stay at or above `threshold` percent.
    ///
    /// - Parameters:
    ///   - attended: classes attended so far.
    ///   - held: classes held so far.
    ///   - totalScheduled: classes that will be held over the term that are NOT
    ///     yet counted in `held` (i.e. the remaining future classes). Pass the
    ///     remaining count; the math treats every future class as a potential miss.
    ///   - threshold: required percent (e.g. 75).
    /// - Returns: number of remaining classes you can miss (>= 0).
    static func canMiss(attended: Int,
                        held: Int,
                        totalScheduled: Int,
                        threshold: Double) -> Int {
        let remaining = max(0, totalScheduled)
        let t = threshold / 100.0
        guard remaining > 0 else {
            // No future classes; you can "miss" 0 going forward.
            return 0
        }
        // Find the max number of future misses m (0...remaining) such that:
        //   attended + (remaining - m)   >=   t * (held + remaining)
        // Solve for m:
        //   m <= attended + remaining - t*(held + remaining)
        let allowed = Double(attended + remaining) - t * Double(held + remaining)
        if allowed < 0 { return 0 }
        let m = Int(floor(allowed))
        return min(remaining, max(0, m))
    }

    // MARK: - Must Attend

    /// The minimum number of the remaining classes you must attend to reach
    /// `threshold` by the end. Returns nil if already safe (0 needed) is not
    /// the intent — instead: returns nil when the threshold is unreachable even
    /// if you attend everything remaining; returns 0 when no further attendance
    /// is required.
    static func mustAttend(attended: Int,
                           held: Int,
                           totalScheduled: Int,
                           threshold: Double) -> Int? {
        let remaining = max(0, totalScheduled)
        let total = held + remaining
        let t = threshold / 100.0
        guard total > 0 else { return 0 }

        // Need: (attended + x) / total >= t   ->   x >= t*total - attended
        let needed = ceil(t * Double(total) - Double(attended))
        let x = Int(needed)

        if x <= 0 { return 0 }                 // already safe
        if x > remaining { return nil }        // unreachable even attending all
        return x
    }

    // MARK: - Verdict

    /// Width of the "close" band above the threshold, in percentage points.
    /// THE one place this constant lives — Theme and every other band consumer
    /// must read it from here, never re-declare 6.
    static let closeBandMargin: Double = 6

    /// Decide the verdict band from the current percent, the threshold, and
    /// whether you can afford to skip today. 3-band semantic:
    /// good = percent >= threshold + closeBandMargin,
    /// close = threshold <= percent < threshold + closeBandMargin,
    /// below = percent < threshold. `canMissToday` nudges a borderline-good case
    /// into "close" when there's no room to skip right now.
    static func verdict(percent: Double,
                        canMissToday: Bool,
                        threshold: Double) -> Verdict {
        if percent < threshold {
            return .below
        }
        if percent >= threshold + closeBandMargin {
            return canMissToday ? .good : .close
        }
        return .close
    }
}
