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

describe('review fixes — policy-aware forecasts and input cap', () => {
  it('R1 / FR-ATT-006: half_up 149/200 with one class left → reachable, skips 0, display "75"', () => {
    // Attend-all gives 150/201 → rounds to 75 → eligible; the exact-only formula
    // wrongly said sUnits = -1 → unreachable.
    const f = termEndForecast(t(149, 200), h([1], true), halfUp());
    expect(f).toMatchObject({
      remaining: 1,
      remainingUnits: 1,
      maxSkippable: 0,
      minToAttend: 1,
      reachable: true,
      maxReachableDisplay: '75',
    });
  });

  it('R2 / FR-ATT-008: half_up T=10000 198/199 unknown end → recoverable n=1 (rounded 100%)', () => {
    // 199/200 = 99.5% → rounds to 100 → eligible under the college rule.
    expect(recovery(t(198, 199), h([], false), halfUp(10_000))).toEqual({
      kind: 'recoverable',
      n: 1,
    });
    // The exact shortcut still applies under exact:
    expect(recovery(t(198, 199), h([], false), exact(10_000))).toEqual({
      kind: 'unreachable',
      maxReachableDisplay: null,
    });
  });

  it('R3 / FR-ATT-001: held 1,000,001 throws; near-cap half_up recovery finishes fast via bigint search', { timeout: 5000 }, () => {
    const p = halfUp(9999);
    expect(() => isEligible(t(0, 1_000_001), p)).toThrowError(/^attendance:/);
    expect(() => safeNowBudget(t(5, 5), h([1_000_001], true), p)).toThrowError(/^attendance:/);
    expect(() => safeNowBudget(t(5, 5), h([999_999, 2], true), p)).toThrowError(/^attendance:/);

    const rec = recovery(t(0, 1_000_000), h([], false), p);
    // Independent check: smallest k with 100·floor((200k + H)/(2H)) ≥ T.
    const H = 1_000_000n;
    let expected = 0n;
    for (let k = 1n; ; k *= 2n) {
      if ((200n * k + (H + k)) / (2n * (H + k)) * 100n >= 9999n) {
        let lo = k / 2n;
        let hi = k;
        while (hi - lo > 1n) {
          const mid = lo + (hi - lo) / 2n;
          const ok = (200n * mid + (H + mid)) / (2n * (H + mid)) * 100n >= 9999n;
          if (ok) hi = mid; else lo = mid;
        }
        expected = hi;
        break;
      }
    }
    expect(rec).toEqual({ kind: 'recoverable', n: Number(expected) });
  });
});

describe('validate helpers', () => {
  it('FR-ATT-001: floorDivBig is true mathematical floor for negative numerators', async () => {
    const { floorDivBig } = await import('../validate.js');
    expect(floorDivBig(-75_000n, 10_000n)).toBe(-8n); // not -7 (JS truncates toward 0)
    expect(floorDivBig(75_000n, 10_000n)).toBe(7n);
    expect(floorDivBig(-80_000n, 10_000n)).toBe(-8n); // exact division stays exact
    expect(floorDivBig(0n, 10_000n)).toBe(0n);
  });
});

describe('§10 input validation — budgets, accumulation caps, policy fields', () => {
  it('FR-ATT-001: copyBand/colorBand reject invalid k', () => {
    const p = exact();
    const tl = t(33, 40);
    for (const bad of [-1, 0.5, NaN, -Infinity]) {
      expect(() => copyBand(tl, bad, p)).toThrowError(/^attendance:/);
      expect(() => colorBand(tl, bad, p)).toThrowError(/^attendance:/);
    }
    // Infinity is legal — the unknown-term-end T=0 path produces it.
    const inf = safeNowBudget(t(1, 2), h([1], false), exact(0));
    expect(inf).toBe(Infinity);
    expect(copyBand(tl, inf, p)).toBe('above');
    expect(colorBand(t(39, 40), inf, p)).toBe('good');
    expect(copyBand(tl, 2, p)).toBe('above');
  });

  it('FR-ATT-001: accumulated attended/held above 1,000,000 throws (tally and simulate)', () => {
    const p = exact();
    expect(() =>
      tally(
        baseline(999_999, 999_999),
        [mark({ status: 'attended', units: 2 })],
        p,
      ),
    ).toThrowError(/^attendance:/);
    expect(() =>
      simulate(t(999_999, 999_999), [{ units: 2, status: 'attended' }], p),
    ).toThrowError(/^attendance:/);
  });

  it('FR-ATT-001: assertPolicy rejects bad rounding, basis and excused maps', () => {
    const good = exact();
    const bads: AttendancePolicy[] = [
      { ...good, rounding: 'bankers' as AttendancePolicy['rounding'] },
      { ...good, basis: 'weekly' as AttendancePolicy['basis'] },
      { ...good, excused: { on_duty: 'present', medical: 'excluded' } as AttendancePolicy['excused'] },
      { ...good, excused: { on_duty: 'present', medical: 'half' as never, other: 'absent' } },
    ];
    for (const bad of bads) {
      expect(() => isEligible(t(3, 4), bad)).toThrowError(/^attendance:/);
    }
  });
});
