import { describe, expect, it } from 'vitest';
import {
  colorBand,
  copyBand,
  displayPercent,
  isEligible,
  recovery,
  safeNowBudget,
  simulate,
  tally,
  termEndForecast,
} from '../index.js';
import type {
  AttendancePolicy,
  Horizon,
  Mark,
  Tally,
  UpcomingOccurrence,
} from '../index.js';

const exact = (thresholdBp = 7500): AttendancePolicy => ({
  thresholdBp,
  rounding: 'exact',
  basis: 'per_subject',
  excused: { on_duty: 'present', medical: 'excluded', other: 'absent' },
});

const halfUp = (thresholdBp = 7500): AttendancePolicy => ({
  ...exact(thresholdBp),
  rounding: 'half_up_integer',
});

const upcomingOf = (units: readonly number[]): UpcomingOccurrence[] =>
  units.map((u, i) => ({
    occurrenceKey: `o${i}`,
    startsAt: 'x',
    units: u,
    subjectId: 's',
  }));

const h = (units: readonly number[], termEndKnown: boolean): Horizon => ({
  upcoming: upcomingOf(units),
  termEndKnown,
});

const t = (attended: number, held: number): Tally => ({ attended, held });

const mark = (over: Partial<Mark> & Pick<Mark, 'status'>): Mark => ({
  occurrenceKey: 'k',
  localDate: '2026-11-01',
  units: 1,
  ...over,
});

const baseline = (attended: number, held: number, asOf: string | null = null) => ({
  attended,
  held,
  asOf,
});

describe('§6 unknown term end — virtual 1-unit continuation', () => {
  it('FR-ATT-005: safe-now continues past the list with virtual classes (33/40, R=3 → 4)', () => {
    // After 3 bunks: 33/43 still eligible; closed form floor((330000-322500)/7500)=1 more.
    expect(safeNowBudget(t(33, 40), h([1, 1, 1], false), exact())).toBe(4);
  });

  it('FR-ATT-005: T=0 with unknown end returns Infinity; with known end returns R', () => {
    expect(safeNowBudget(t(1, 2), h([1, 1], false), exact(0))).toBe(Infinity);
    expect(safeNowBudget(t(1, 2), h([1, 1], true), exact(0))).toBe(2);
  });

  it('FR-ATT-005: half_up_integer virtual continuation (33/40, R=2 → 4)', () => {
    // P(33/44)=75 eligible, P(33/45)=73 not — two more after the list.
    expect(safeNowBudget(t(33, 40), h([1, 1], false), halfUp())).toBe(4);
  });

  it('FR-ATT-005: recovery continues past the list with virtual classes (6/10, R=2 → 6)', () => {
    expect(recovery(t(6, 10), h([1, 1], false), exact())).toEqual({
      kind: 'recoverable',
      n: 6,
    });
  });

  it('FR-ATT-005: half_up_integer virtual recovery (1/2, R=1 → 2)', () => {
    expect(recovery(t(1, 2), h([1], false), halfUp())).toEqual({
      kind: 'recoverable',
      n: 2,
    });
  });

  it('FR-ATT-008: T=10000 with unknown end is unreachable (1/2 can never reach 100%)', () => {
    expect(recovery(t(1, 2), h([1, 1, 1], false), exact(10_000))).toEqual({
      kind: 'unreachable',
      maxReachableDisplay: null,
    });
  });

  it('FR-ATT-005: half_up_integer virtual recovery over a longer gap (5/10, R=0 → 10)', () => {
    expect(recovery(t(5, 10), h([], false), halfUp())).toEqual({
      kind: 'recoverable',
      n: 10,
    });
  });

  it('FR-ATT-005: T=0 is always eligible → recovery says eligible', () => {
    expect(recovery(t(0, 5), h([1], false), exact(0))).toEqual({ kind: 'eligible' });
  });
});

describe('§6.3 term-end forecast edges', () => {
  it('FR-ATT-006: null when term end unknown', () => {
    expect(termEndForecast(t(30, 40), h([1], false), exact())).toBeNull();
  });

  it('G10b / FR-ATT-006: 0/0 with no upcoming classes → null forecast', () => {
    expect(termEndForecast(t(0, 0), h([], true), exact())).toBeNull();
  });

  it('FR-ATT-006: mixed units — skips smallest first (30/40, units 4,3,2,1 → 1)', () => {
    // s_u = floor((400000 - 375000) / 10000) = 2 → only the 1-unit occurrence fits.
    const f = termEndForecast(t(30, 40), h([4, 3, 2, 1], true), exact());
    expect(f).toMatchObject({
      remaining: 4,
      remainingUnits: 10,
      maxSkippable: 1,
      minToAttend: 3,
      reachable: true,
    });
  });
});

describe('§6.8 simulate', () => {
  it('FR-ATT-010: returns the tally after each step', () => {
    const p = exact();
    const out = simulate(t(0, 0), [
      { units: 1, status: 'attended' },
      { units: 2, status: 'bunked' },
      { units: 1, status: 'cancelled' },
      { units: 1, status: 'excused', excusedKind: 'on_duty' },
    ], p);
    expect(out).toEqual([
      { attended: 1, held: 1 },
      { attended: 1, held: 3 },
      { attended: 1, held: 3 },
      { attended: 2, held: 4 },
    ]);
  });

  it('FR-ATT-010: excused excluded mapping contributes nothing', () => {
    const out = simulate(t(1, 1), [
      { units: 1, status: 'excused', excusedKind: 'medical' },
    ], exact());
    expect(out).toEqual([{ attended: 1, held: 1 }]);
  });
});

describe('§2 excused mappings', () => {
  it('FR-ATT-009: policy.excused null → excused marks count as excluded (0,0)', () => {
    const p = { ...exact(), excused: null };
    expect(tally(baseline(0, 0), [mark({ status: 'excused', excusedKind: 'on_duty' })], p))
      .toEqual({ attended: 0, held: 0 });
  });

  it('FR-ATT-009: excused → absent counts (0,u); missing kind defaults to other', () => {
    expect(
      tally(baseline(0, 0), [mark({ status: 'excused', excusedKind: 'other' })], exact()),
    ).toEqual({ attended: 0, held: 1 });
    expect(tally(baseline(0, 0), [mark({ status: 'excused' })], exact())).toEqual({
      attended: 0,
      held: 1,
    });
  });

  it('FR-ATT-009: invalid mark data throws RangeError', () => {
    const badStatus = mark({ status: 'sleeped' as Mark['status'] });
    const badKind = mark({
      status: 'excused',
      excusedKind: 'bogus' as unknown as NonNullable<Mark['excusedKind']>,
    });
    const noMapping = mark({ status: 'excused', excusedKind: 'medical' });
    const partial: AttendancePolicy = {
      ...exact(),
      excused: { on_duty: 'present' } as AttendancePolicy['excused'],
    };
    for (const fn of [
      () => tally(baseline(0, 0), [badStatus], exact()),
      () => tally(baseline(0, 0), [badKind], exact()),
      () => tally(baseline(0, 0), [noMapping], partial),
    ]) {
      expect(fn).toThrowError(RangeError);
      expect(fn).toThrowError(/^attendance:/);
    }
  });
});

describe('§10 local-date validation', () => {
  it('FR-ATT-009: 2024-02-29 and 2000-02-29 are real dates and accepted', () => {
    for (const d of ['2024-02-29', '2000-02-29']) {
      expect(
        tally(baseline(0, 0), [mark({ status: 'attended', localDate: d })], exact()),
      ).toEqual({ attended: 1, held: 1 });
    }
  });

  it('FR-ATT-009: fake calendar dates throw', () => {
    for (const d of ['2026-02-29', '1900-02-29', '2026-00-15', '2026-01-00', '2026-04-31', '2026-1-5']) {
      expect(() =>
        tally(baseline(0, 0), [mark({ status: 'attended', localDate: d })], exact()),
      ).toThrowError(/^attendance:/);
    }
  });
});

describe('§6.6 bands', () => {
  it('FR-ATT-007: held 0 → not_started even with a non-null k', () => {
    expect(copyBand(t(0, 0), 5, exact())).toBe('not_started');
    expect(colorBand(t(0, 0), 5, exact())).toBe('not_started');
  });

  it('FR-ATT-007: eligible with k≥1 but inside the 6-point margin → color close', () => {
    // 31/40 = 77.5% ≥ 75%, k=1, but 77.5 < 81 → not comfortable.
    const p = exact();
    const tl = t(31, 40);
    expect(safeNowBudget(tl, h([1, 1, 1], true), p)).toBe(1);
    expect(colorBand(tl, 1, p)).toBe('close');
    expect(copyBand(tl, 1, p)).toBe('above');
  });
});
