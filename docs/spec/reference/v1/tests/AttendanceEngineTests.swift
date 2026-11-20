import Testing
@testable import Studex

struct AttendanceEngineTests {

    @Test func tallyFoldsBaselineAndMarks() {
        let t = AttendanceEngine.tally(priorAttended: 20, priorHeld: 24, markedAttended: 5, markedBunked: 1)
        #expect(t.attended == 25)
        #expect(t.held == 30)
        #expect(abs(t.percent - (25.0 / 30.0 * 100)) < 0.001)
    }

    @Test func zeroHeldReadsAsFullAttendance() {
        let t = AttendanceEngine.tally(priorAttended: 0, priorHeld: 0, markedAttended: 0, markedBunked: 0)
        #expect(t.percent == 100)
    }

    @Test func canMissBasicBudget() {
        // 80 attended of 100 held, 20 remaining, 75% threshold:
        // (80 + 20 - m) >= 0.75 * 120  =>  m <= 10
        let m = AttendanceEngine.canMiss(attended: 80, held: 100, totalScheduled: 20, threshold: 75)
        #expect(m == 10)
    }

    @Test func mustAttendRecovery() {
        // 60 of 100 held (60%), 40 remaining, want 75% of 140 = 105 → need 45 > 40 → unreachable
        let unreachable = AttendanceEngine.mustAttend(attended: 60, held: 100, totalScheduled: 40, threshold: 75)
        #expect(unreachable == nil)
        // 70 of 100, 40 remaining, want 75% of 140 = 105 → need 35
        let needed = AttendanceEngine.mustAttend(attended: 70, held: 100, totalScheduled: 40, threshold: 75)
        #expect(needed == 35)
    }

    // MARK: - Non-default thresholds

    @Test func canMissAtThreshold65() {
        // 80/100, 20 remaining, 65%: m <= 100 - 0.65*120 = 22 → capped at 20 remaining
        let m = AttendanceEngine.canMiss(attended: 80, held: 100, totalScheduled: 20, threshold: 65)
        #expect(m == 20)
    }

    @Test func canMissAtThreshold85() {
        // 80/100, 20 remaining, 85%: 100 - 0.85*120 = -2 → clamps to 0
        let m = AttendanceEngine.canMiss(attended: 80, held: 100, totalScheduled: 20, threshold: 85)
        #expect(m == 0)
    }

    @Test func mustAttendAtThreshold85Unreachable() {
        // Need 0.85*120 = 102 attended; 80 + all 20 remaining = 100 < 102 → nil
        let x = AttendanceEngine.mustAttend(attended: 80, held: 100, totalScheduled: 20, threshold: 85)
        #expect(x == nil)
    }

    @Test func mustAttendAtThreshold65AlreadySafe() {
        // Need 0.65*120 = 78; already at 80 → 0 required
        let x = AttendanceEngine.mustAttend(attended: 80, held: 100, totalScheduled: 20, threshold: 65)
        #expect(x == 0)
    }

    // MARK: - Zero remaining

    @Test func zeroRemainingYieldsZeroBudget() {
        #expect(AttendanceEngine.canMiss(attended: 90, held: 100, totalScheduled: 0, threshold: 75) == 0)
        // Safe already, nothing left to attend → 0 needed.
        #expect(AttendanceEngine.mustAttend(attended: 90, held: 100, totalScheduled: 0, threshold: 75) == 0)
        // Below the line with nothing left → unreachable.
        #expect(AttendanceEngine.mustAttend(attended: 60, held: 100, totalScheduled: 0, threshold: 75) == nil)
    }

    @Test func zeroTotalEverywhereIsSafe() {
        // Nothing held, nothing scheduled: mustAttend 0, canMiss 0, percent 100.
        #expect(AttendanceEngine.mustAttend(attended: 0, held: 0, totalScheduled: 0, threshold: 75) == 0)
        #expect(AttendanceEngine.canMiss(attended: 0, held: 0, totalScheduled: 0, threshold: 75) == 0)
    }

    // MARK: - Negative clamps

    @Test func negativeInputsClamp() {
        let t = AttendanceEngine.tally(priorAttended: -5, priorHeld: -10, markedAttended: 3, markedBunked: -2)
        #expect(t.attended == 3)
        #expect(t.held == 3)
        #expect(AttendanceEngine.canMiss(attended: 10, held: 20, totalScheduled: -4, threshold: 75) == 0)
        #expect(AttendanceEngine.mustAttend(attended: 10, held: 20, totalScheduled: -4, threshold: 75) == nil)
    }

    // MARK: - Verdict bands

    @Test func verdictBandsFollowThresholdAndMargin() {
        #expect(AttendanceEngine.verdict(percent: 74.9, canMissToday: true, threshold: 75) == .below)
        #expect(AttendanceEngine.verdict(percent: 75, canMissToday: true, threshold: 75) == .close)
        #expect(AttendanceEngine.verdict(percent: 80.9, canMissToday: true, threshold: 75) == .close)
        #expect(AttendanceEngine.verdict(percent: 81, canMissToday: true, threshold: 75) == .good)
        // No slack today demotes borderline-good to close.
        #expect(AttendanceEngine.verdict(percent: 81, canMissToday: false, threshold: 75) == .close)
        // The margin rides the threshold: 65 + 6 = 71.
        #expect(AttendanceEngine.verdict(percent: 71, canMissToday: true, threshold: 65) == .good)
        #expect(AttendanceEngine.verdict(percent: 70.9, canMissToday: true, threshold: 65) == .close)
    }
}
