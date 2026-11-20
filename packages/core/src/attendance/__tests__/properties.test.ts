import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  displayPercent,
  isEligible,
  overallTally,
  recovery,
  safeNowBudget,
  tally,
  termEndForecast,
} from '../index';
import type {
  AttendancePolicy,
  Baseline,
  Horizon,
  Mark,
  Tally,
} from '../index';

const RUNS = { numRuns: 10_000 };

const exactPolicy = (thresholdBp: number): AttendancePolicy => ({
  thresholdBp,
  rounding: 'exact',
  basis: 'per_subject',
  excused: { on_duty: 'present', medical: 'excluded', other: 'absent' },
});

const halfUpPolicy = (thresholdBp: number): AttendancePolicy => ({
  ...exactPolicy(thresholdBp),
  rounding: 'half_up_integer',
});

const arbTally = fc
  .record({ attended: fc.nat(500), held: fc.nat(500) })
  .filter((t) => t.attended <= t.held) as fc.Arbitrary<Tally>;

const arbNonZeroTally = arbTally.filter((t) => t.held > 0);
const arbT = fc.integer({ min: 0, max: 10_000 });

const unitHorizon = (R: number, termEndKnown = true): Horizon => ({
  upcoming: Array.from({ length: R }, (_, i) => ({
    occurrenceKey: `o${i}`,
    startsAt: 'x',
    units: 1,
    subjectId: 's',
  })),
  termEndKnown,
});

const bunkedMark = (units = 1): Mark => ({
  occurrenceKey: 'm',
  localDate: '2026-11-01',
  status: 'bunked',
  units,
});

const attendedMark = (units = 1): Mark => ({ ...bunkedMark(units), status: 'attended' });

const eligibleExact = (A: number, H: number, T: number): boolean =>
  10_000 * A >= T * H;

describe('properties §11.2', () => {
  it('P(a) / FR-ATT-005: safe-now closed form equals simulation when u=1 and exact', () => {
    fc.assert(
      fc.property(arbNonZeroTally, arbT, fc.nat(60), (tl, T, R) => {
        const p = exactPolicy(T);
        const sim = safeNowBudget(tl, unitHorizon(R), p);
        const closed =
          T === 0
            ? R // always eligible, capped at R
            : !eligibleExact(tl.attended, tl.held, T)
              ? 0
              : Math.min(Math.max(Math.floor((10_000 * tl.attended - T * tl.held) / T), 0), R);
        expect(sim).toBe(closed);
      }),
      RUNS,
    );
  });

  it('P(a2) / FR-ATT-005: recovery closed form equals simulation when u=1 and exact', () => {
    fc.assert(
      fc.property(arbNonZeroTally, arbT, fc.nat(60), (tl, T, R) => {
        const p = exactPolicy(T);
        const rec = recovery(tl, unitHorizon(R), p);
        if (eligibleExact(tl.attended, tl.held, T)) {
          expect(rec).toEqual({ kind: 'eligible' });
          return;
        }
        if (T === 10_000) {
          expect(rec).toEqual({ kind: 'unreachable', maxReachableDisplay: expect.any(String) });
          return;
        }
        const n = Math.ceil((T * tl.held - 10_000 * tl.attended) / (10_000 - T));
        if (n <= R) {
          expect(rec).toEqual({ kind: 'recoverable', n });
        } else {
          expect(rec).toMatchObject({ kind: 'unreachable' });
        }
      }),
      RUNS,
    );
  });

  it('P(b) / FR-ATT-004: attending never decreases and bunking never increases the floored percent', () => {
    fc.assert(
      fc.property(arbNonZeroTally, (tl) => {
        const p = exactPolicy(7500);
        const base: Baseline = { attended: tl.attended, held: tl.held, asOf: null };
        const before = Number(displayPercent(tl, p, 0));
        const afterAttend = displayPercent(tally(base, [attendedMark()], p), p, 0);
        const afterBunk = displayPercent(tally(base, [bunkedMark()], p), p, 0);
        expect(Number(afterAttend)).toBeGreaterThanOrEqual(before);
        expect(Number(afterBunk)).toBeLessThanOrEqual(before);
      }),
      RUNS,
    );
  });

  it('P(c) / FR-ATT-005: after k safe-now bunks still eligible, after k+1 not (unless capped by R)', () => {
    fc.assert(
      fc.property(arbNonZeroTally, arbT, fc.nat(60), (tl, T, R) => {
        const p = exactPolicy(T);
        const k = safeNowBudget(tl, unitHorizon(R), p);
        // held > 0 ⇒ never null; termEndKnown ⇒ capped at R, never Infinity.
        expect(k).not.toBeNull();
        if (k === null) throw new Error('unreachable');
        expect(Number.isFinite(k)).toBe(true);
        const bunkedTo = (n: number): Tally => ({ attended: tl.attended, held: tl.held + n });
        if (!eligibleExact(tl.attended, tl.held, T)) {
          expect(k).toBe(0);
          return;
        }
        expect(eligibleExact(bunkedTo(k).attended, bunkedTo(k).held, T)).toBe(true);
        if (k < R) {
          expect(eligibleExact(bunkedTo(k + 1).attended, bunkedTo(k + 1).held, T)).toBe(false);
        } else {
          expect(k).toBe(R);
        }
      }),
      RUNS,
    );
  });

  it('P(d) / FR-ATT-005: recovery n is minimal — eligible at n, not at n-1', () => {
    fc.assert(
      fc.property(arbNonZeroTally, arbT, fc.nat(60), (tl, T, R) => {
        const p = exactPolicy(T);
        const rec = recovery(tl, unitHorizon(R), p);
        if (rec.kind !== 'recoverable') return;
        expect(rec.n).toBeGreaterThanOrEqual(1);
        const at = (n: number): Tally => ({ attended: tl.attended + n, held: tl.held + n });
        expect(isEligible(at(rec.n), p)).toBe(true);
        expect(isEligible(at(rec.n - 1), p)).toBe(false);
      }),
      RUNS,
    );
  });

  it('P(e) / FR-ATT-004: overallTally equals the component sums', () => {
    fc.assert(
      fc.property(fc.array(arbTally, { maxLength: 20 }), (subjects) => {
        const o = overallTally(subjects);
        expect(o.attended).toBe(subjects.reduce((s, x) => s + x.attended, 0));
        expect(o.held).toBe(subjects.reduce((s, x) => s + x.held, 0));
      }),
      RUNS,
    );
  });

  it('P(f) / FR-ATT-004 §5: not eligible under exact + integer-% threshold ⇒ displayed integer < T/100', () => {
    fc.assert(
      fc.property(arbNonZeroTally, fc.integer({ min: 0, max: 100 }), (tl, tPct) => {
        const p = exactPolicy(tPct * 100);
        if (isEligible(tl, p) !== false) return;
        const shown = Number(displayPercent(tl, p, 0));
        expect(shown).toBeLessThan(tPct);
      }),
      RUNS,
    );
  });

  it('P(g) / FR-ATT-003: cancelled marks and marks covered by the baseline never change the tally', () => {
    fc.assert(
      fc.property(
        arbTally,
        fc.array(fc.constant(bunkedMark()), { maxLength: 20 }),
        fc.nat(10),
        (base, marks, extra) => {
          const p = exactPolicy(7500);
          const b: Baseline = { ...base, asOf: null };
          const clean = tally(b, marks, p);
          const cancelled: Mark[] = Array.from({ length: extra }, () => ({
            occurrenceKey: 'c',
            localDate: '2026-11-02',
            status: 'cancelled',
            units: 1,
          }));
          expect(tally(b, [...marks, ...cancelled], p)).toEqual(clean);
        },
      ),
      RUNS,
    );
  });

  it('P(g2) / FR-ATT-002: marks dated on or before baseline.asOf never change the tally', () => {
    fc.assert(
      fc.property(
        arbTally,
        fc.array(fc.constant(bunkedMark()), { maxLength: 20 }),
        fc.integer({ min: 1, max: 28 }),
        (base, marks, asOfDay) => {
          const p = exactPolicy(7500);
          const asOf = `2026-11-${String(asOfDay).padStart(2, '0')}`;
          const covered: Mark[] = marks.map((m) => ({
            ...m,
            localDate: `2026-11-${String(Math.min(asOfDay, 1 + ((m.units + 3) % asOfDay))).padStart(2, '0')}`,
          }));
          for (const c of covered) expect(c.localDate <= asOf).toBe(true);
          const b: Baseline = { ...base, asOf };
          expect(tally(b, covered, p)).toEqual({ attended: base.attended, held: base.held });
        },
      ),
      RUNS,
    );
  });

  it('P(h) / FR-ATT-003: valid inputs never yield attended > held', () => {
    fc.assert(
      fc.property(
        arbTally,
        fc.array(
          fc.record({
            units: fc.integer({ min: 1, max: 4 }),
            attended: fc.boolean(),
          }),
          { maxLength: 40 },
        ),
        (base, steps) => {
          const p = exactPolicy(7500);
          const marks: Mark[] = [];
          let a = base.attended;
          let h = base.held;
          for (const s of steps) {
            const status = s.attended ? 'attended' : 'bunked';
            marks.push({ occurrenceKey: 'm', localDate: '2026-11-01', status, units: s.units });
            h += s.units;
            if (s.attended) a += s.units;
          }
          const tl = tally({ ...base, asOf: null }, marks, p);
          expect(tl.attended).toBeLessThanOrEqual(tl.held);
          expect(tl.attended).toBe(a);
          expect(tl.held).toBe(h);
        },
      ),
      RUNS,
    );
  });

  // NOTE: the naive direction "exact ⇒ half_up" is false in general (e.g.
  // 1509/2000 at T=7540 is eligible exactly but rounds to 75 < 75.40).
  // The implication holds for whole-percent thresholds, which is what §5's
  // display guarantee needs, so the property is stated for T % 100 === 0.
  it('P(i) / FR-ATT-001: eligible under exact ⇒ eligible under half_up_integer (integer-% thresholds)', () => {
    fc.assert(
      fc.property(arbNonZeroTally, fc.integer({ min: 0, max: 100 }), (tl, tPct) => {
        if (isEligible(tl, exactPolicy(tPct * 100)) !== true) return;
        expect(isEligible(tl, halfUpPolicy(tPct * 100))).toBe(true);
      }),
      RUNS,
    );
  });
});

describe('policy-aware term-end forecast properties', () => {
  const arbUnitsList = fc.array(fc.integer({ min: 1, max: 4 }), { maxLength: 30 });
  const arbPolicy = fc
    .tuple(fc.integer({ min: 0, max: 10_000 }), fc.boolean())
    .map(([t, half]) => (half ? halfUpPolicy(t) : exactPolicy(t)));

  const horizonOf = (units: readonly number[]): Horizon => ({
    upcoming: units.map((u, i) => ({
      occurrenceKey: `o${i}`,
      startsAt: 'x',
      units: u,
      subjectId: 's',
    })),
    termEndKnown: true,
  });

  it('P(j) / FR-ATT-006: reachable ⇔ isEligible(attend-all); maxReachableDisplay === displayPercent(attend-all); maxSkippable maximal', () => {
    fc.assert(
      fc.property(arbTally, arbUnitsList, arbPolicy, (tl, units, p) => {
        const f = termEndForecast(tl, horizonOf(units), p);
        const ru = units.reduce((s, u) => s + u, 0);
        if (tl.held === 0 && ru === 0) {
          expect(f).toBeNull();
          return;
        }
        expect(f).not.toBeNull();
        const attendAll: Tally = { attended: tl.attended + ru, held: tl.held + ru };
        expect(f!.reachable).toBe(isEligible(attendAll, p));
        expect(f!.maxReachableDisplay).toBe(displayPercent(attendAll, p, 0));
        // Maximality: the next-smallest uns kipped occurrence breaks eligibility.
        const sorted = [...units].sort((a, b) => a - b);
        const skippedSum = sorted.slice(0, f!.maxSkippable).reduce((s, u) => s + u, 0);
        if (f!.maxSkippable < sorted.length) {
          const next = sorted[f!.maxSkippable]!;
          expect(
            isEligible(
              { attended: attendAll.attended - skippedSum - next, held: attendAll.held },
              p,
            ),
          ).toBe(false);
        }
        if (!f!.reachable) {
          expect(f!.maxSkippable).toBe(0);
        } else {
          // Feasibility: skipping exactly maxSkippable occurrences stays eligible.
          expect(f!.maxSkippable).toBeLessThanOrEqual(f!.remaining);
          expect(
            isEligible(
              { attended: attendAll.attended - skippedSum, held: attendAll.held },
              p,
            ),
          ).toBe(true);
        }
      }),
      { numRuns: 10_000 },
    );
  });
});
