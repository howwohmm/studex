import { describe, expect, it } from 'vitest';
import {
  colorBand,
  copyBand,
  displayPercent,
  isEligible,
  overallTally,
  recovery,
  safeNowBudget,
  tally,
  termEndForecast,
} from '../index.js';
import type {
  AttendancePolicy,
  Baseline,
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

export function upcomingOf(
  R: number,
  units: number | readonly number[] = 1,
): UpcomingOccurrence[] {
  return Array.from({ length: R }, (_, i) => ({
    occurrenceKey: `o${i}`,
    startsAt: `2026-11-${String(20 + i).padStart(2, '0')}T09:00:00.000Z`,
    units: Array.isArray(units) ? (units[i] ?? 1) : (units as number),
    subjectId: 's',
  }));
}

const horizon = (upcoming: UpcomingOccurrence[], termEndKnown = true): Horizon => ({
  upcoming,
  termEndKnown,
});

const t = (attended: number, held: number): Tally => ({ attended, held });
const baseline = (attended: number, held: number, asOf: string | null = null): Baseline => ({
  attended,
  held,
  asOf,
});
const mark = (
  status: Mark['status'],
  localDate = '2026-11-01',
  units = 1,
  excusedKind?: Mark['excusedKind'],
): Mark =>
  excusedKind === undefined
    ? { occurrenceKey: 'k', localDate, status, units }
    : { occurrenceKey: 'k', localDate, status, excusedKind, units };

describe('golden table §8', () => {
  it('G1 / FR-ATT-005: 30/40 T7500 R40 → 75/75.0, eligible, k=0, term-end 10·30, CLOSE', () => {
    const p = exact();
    const tl = t(30, 40);
    const h = horizon(upcomingOf(40));
    expect(displayPercent(tl, p, 0)).toBe('75');
    expect(displayPercent(tl, p, 1)).toBe('75.0');
    expect(isEligible(tl, p)).toBe(true);
    const k = safeNowBudget(tl, h, p);
    expect(k).toBe(0);
    expect(recovery(tl, h, p)).toEqual({ kind: 'eligible' });
    expect(termEndForecast(tl, h, p)).toMatchObject({
      maxSkippable: 10,
      minToAttend: 30,
      reachable: true,
    });
    expect(copyBand(tl, k, p)).toBe('close');
    expect(colorBand(tl, k, p)).toBe('close');
  });

  it('G2 / FR-ATT-005: 33/40 R20 → 82/82.5, k=4, term-end 8·12, ABOVE', () => {
    const p = exact();
    const tl = t(33, 40);
    const h = horizon(upcomingOf(20));
    expect(displayPercent(tl, p, 0)).toBe('82');
    expect(displayPercent(tl, p, 1)).toBe('82.5');
    expect(safeNowBudget(tl, h, p)).toBe(4);
    expect(termEndForecast(tl, h, p)).toMatchObject({
      maxSkippable: 8,
      minToAttend: 12,
    });
    expect(copyBand(tl, 4, p)).toBe('above');
    expect(colorBand(tl, 4, p)).toBe('good');
  });

  it('G3 / FR-ATT-005: 29/40 R20 → 72/72.5, n=4, term-end 4·16, BELOW', () => {
    const p = exact();
    const tl = t(29, 40);
    const h = horizon(upcomingOf(20));
    expect(displayPercent(tl, p, 0)).toBe('72');
    expect(displayPercent(tl, p, 1)).toBe('72.5');
    expect(isEligible(tl, p)).toBe(false);
    expect(safeNowBudget(tl, h, p)).toBe(0);
    expect(recovery(tl, h, p)).toEqual({ kind: 'recoverable', n: 4 });
    expect(termEndForecast(tl, h, p)).toMatchObject({
      maxSkippable: 4,
      minToAttend: 16,
    });
    expect(copyBand(tl, 0, p)).toBe('below');
    expect(colorBand(tl, 0, p)).toBe('below');
  });

  it('G4 / FR-ATT-004: 149/200 R50 → 74/74.5 (never 75), n=4, term-end 11·39', () => {
    const p = exact();
    const tl = t(149, 200);
    const h = horizon(upcomingOf(50));
    expect(displayPercent(tl, p, 0)).toBe('74');
    expect(displayPercent(tl, p, 1)).toBe('74.5');
    expect(isEligible(tl, p)).toBe(false);
    expect(recovery(tl, h, p)).toEqual({ kind: 'recoverable', n: 4 });
    expect(termEndForecast(tl, h, p)).toMatchObject({
      maxSkippable: 11,
      minToAttend: 39,
    });
  });

  it('G4b / FR-ATT-001: 149/200 under half_up_integer → college 75, eligible, CLOSE', () => {
    const p = halfUp();
    const tl = t(149, 200);
    const h = horizon(upcomingOf(50));
    expect(displayPercent(tl, p, 0)).toBe('75');
    expect(displayPercent(tl, p, 1)).toBe('75');
    expect(isEligible(tl, p)).toBe(true);
    expect(safeNowBudget(tl, h, p)).toBe(0);
    expect(copyBand(tl, 0, p)).toBe('close');
  });

  it('G5 / FR-ATT-005: 23/29 R10 → 79/79.3, k=1, term-end 3·7, ABOVE', () => {
    const p = exact();
    const tl = t(23, 29);
    const h = horizon(upcomingOf(10));
    expect(displayPercent(tl, p, 0)).toBe('79');
    expect(displayPercent(tl, p, 1)).toBe('79.3');
    expect(safeNowBudget(tl, h, p)).toBe(1);
    expect(termEndForecast(tl, h, p)).toMatchObject({
      maxSkippable: 3,
      minToAttend: 7,
    });
    expect(copyBand(tl, 1, p)).toBe('above');
  });

  it('G6 / FR-ATT-005: 90/100 R5 → 90/90.0, k capped at 5, term-end 5·0', () => {
    const p = exact();
    const tl = t(90, 100);
    const h = horizon(upcomingOf(5));
    expect(displayPercent(tl, p, 0)).toBe('90');
    expect(displayPercent(tl, p, 1)).toBe('90.0');
    expect(safeNowBudget(tl, h, p)).toBe(5); // uncapped would be 20
    expect(termEndForecast(tl, h, p)).toMatchObject({
      maxSkippable: 5,
      minToAttend: 0,
    });
  });

  it('G7 / FR-ATT-008: 20/40 R10 → unreachable this sem, max 60%', () => {
    const p = exact();
    const tl = t(20, 40);
    const h = horizon(upcomingOf(10));
    expect(displayPercent(tl, p, 0)).toBe('50');
    expect(isEligible(tl, p)).toBe(false);
    expect(recovery(tl, h, p)).toEqual({
      kind: 'unreachable',
      maxReachableDisplay: '60',
    });
    expect(termEndForecast(tl, h, p)).toMatchObject({
      reachable: false,
      maxSkippable: 0,
      minToAttend: 10,
      maxReachableDisplay: '60',
    });
  });

  it('G8 / FR-ATT-005: 10/12 with units [2,1,1] → k=0 (2-unit lab is next; closed form would lie)', () => {
    const p = exact();
    const tl = t(10, 12);
    const h = horizon(upcomingOf(3, [2, 1, 1]));
    expect(displayPercent(tl, p, 0)).toBe('83');
    expect(displayPercent(tl, p, 1)).toBe('83.3');
    expect(isEligible(tl, p)).toBe(true);
    expect(safeNowBudget(tl, h, p)).toBe(0);
    expect(copyBand(tl, 0, p)).toBe('close');
  });

  it('G9 / FR-ATT-005: 2/3 R10 → 66/66.6, n=1, term-end 2·8', () => {
    const p = exact();
    const tl = t(2, 3);
    const h = horizon(upcomingOf(10));
    expect(displayPercent(tl, p, 0)).toBe('66');
    expect(displayPercent(tl, p, 1)).toBe('66.6');
    expect(recovery(tl, h, p)).toEqual({ kind: 'recoverable', n: 1 });
    expect(termEndForecast(tl, h, p)).toMatchObject({
      maxSkippable: 2,
      minToAttend: 8,
    });
  });

  it('G10 / FR-ATT-004 / FR-ATT-006: 0/0 R40 → no standing, "No classes yet", term-end can miss 10 of 40', () => {
    const p = exact();
    const tl = t(0, 0);
    const h = horizon(upcomingOf(40));
    expect(displayPercent(tl, p, 0)).toBeNull();
    expect(displayPercent(tl, p, 1)).toBeNull();
    expect(isEligible(tl, p)).toBeNull();
    expect(safeNowBudget(tl, h, p)).toBeNull();
    expect(recovery(tl, h, p)).toEqual({ kind: 'not_started' });
    expect(copyBand(tl, null, p)).toBe('not_started');
    expect(colorBand(tl, null, p)).toBe('not_started');
    expect(termEndForecast(tl, h, p)).toMatchObject({
      remaining: 40,
      maxSkippable: 10,
      minToAttend: 30,
      reachable: true,
    });
  });

  it('G11 / FR-ATT-004: overall is aggregate (19/25 = 76), never a mean of percentages', () => {
    const p = exact();
    const subjects = [t(18, 20), t(1, 5)];
    const overall = overallTally(subjects);
    expect(overall).toEqual({ attended: 19, held: 25 });
    expect(displayPercent(overall, p, 0)).toBe('76');
    expect(displayPercent(overall, p, 0)).not.toBe('55'); // mean of 90 and 20 is forbidden
    expect(isEligible(overall, p)).toBe(true);
    expect(isEligible(subjects[1]!, p)).toBe(false);
    const h = horizon(upcomingOf(20));
    expect(recovery(subjects[1]!, h, p)).toEqual({ kind: 'recoverable', n: 11 });
  });

  it('G12 / FR-ATT-005: 34/40 T8500 R20 → 85/85.0, eligible but k=0 → CLOSE', () => {
    const p = exact(8500);
    const tl = t(34, 40);
    const h = horizon(upcomingOf(20));
    expect(displayPercent(tl, p, 0)).toBe('85');
    expect(displayPercent(tl, p, 1)).toBe('85.0');
    expect(isEligible(tl, p)).toBe(true);
    expect(safeNowBudget(tl, h, p)).toBe(0);
    expect(termEndForecast(tl, h, p)).toMatchObject({
      maxSkippable: 3,
      minToAttend: 17,
    });
    expect(copyBand(tl, 0, p)).toBe('close');
  });

  it('G13 / FR-ATT-001: 2/3 T6667 → not eligible (20000 < 20001), n=1, term-end 3·7', () => {
    const p = exact(6667);
    const tl = t(2, 3);
    const h = horizon(upcomingOf(10));
    expect(displayPercent(tl, p, 0)).toBe('66');
    expect(displayPercent(tl, p, 1)).toBe('66.6');
    expect(isEligible(tl, p)).toBe(false);
    expect(recovery(tl, h, p)).toEqual({ kind: 'recoverable', n: 1 });
    expect(termEndForecast(tl, h, p)).toMatchObject({
      maxSkippable: 3,
      minToAttend: 7,
    });
  });

  it('G14 / FR-ATT-001: 8 attended + 2 bunked + 1 excused on-duty(present) → A=9 H=11, 81/81.8', () => {
    const p = exact();
    const marks: Mark[] = [
      ...Array.from({ length: 8 }, () => mark('attended')),
      ...Array.from({ length: 2 }, () => mark('bunked')),
      mark('excused', '2026-11-01', 1, 'on_duty'),
    ];
    const tl = tally(baseline(0, 0), marks, p);
    expect(tl).toEqual({ attended: 9, held: 11 });
    expect(displayPercent(tl, p, 0)).toBe('81');
    expect(displayPercent(tl, p, 1)).toBe('81.8');
    expect(isEligible(tl, p)).toBe(true);
  });

  it('G15 / FR-ATT-003: cancelled and unmarked occurrences never change the tally', () => {
    const p = exact();
    const base = [mark('attended'), mark('bunked')];
    const withNoise = [
      mark('cancelled', '2026-11-02'),
      ...base,
      mark('cancelled', '2026-11-03'),
    ];
    expect(tally(baseline(0, 0), withNoise, p)).toEqual(
      tally(baseline(0, 0), base, p),
    );
  });

  it('G16 / FR-ATT-003: contact hour — unmarked contributes (0,0), attended contributes (1,1)', () => {
    const p = exact();
    expect(tally(baseline(0, 0), [], p)).toEqual({ attended: 0, held: 0 });
    expect(tally(baseline(0, 0), [mark('attended')], p)).toEqual({
      attended: 1,
      held: 1,
    });
  });

  it('G17a / FR-ATT-002: baseline 30/40 asOf 2026-11-19 swallows a same-day Bunked mark → 30/40', () => {
    const p = exact();
    const tl = tally(
      baseline(30, 40, '2026-11-19'),
      [mark('bunked', '2026-11-19')],
      p,
    );
    expect(tl).toEqual({ attended: 30, held: 40 });
    expect(displayPercent(tl, p, 0)).toBe('75');
    expect(isEligible(tl, p)).toBe(true);
  });

  it('G17b / FR-ATT-002: baseline 30/40 asOf 2026-11-19 + Bunked on 2026-11-20 → 30/41, n=3', () => {
    const p = exact();
    const tl = tally(
      baseline(30, 40, '2026-11-19'),
      [mark('bunked', '2026-11-20')],
      p,
    );
    expect(tl).toEqual({ attended: 30, held: 41 });
    expect(displayPercent(tl, p, 0)).toBe('73');
    expect(isEligible(tl, p)).toBe(false);
    expect(recovery(tl, horizon(upcomingOf(10)), p)).toEqual({
      kind: 'recoverable',
      n: 3,
    });
  });
});

describe('§9 v1.0 defect regressions', () => {
  it('D1 / FR-ATT-005: 30/40 R40 → safe-now k=0, not the v1 term-end "10"', () => {
    const p = exact();
    const h = horizon(upcomingOf(40));
    expect(safeNowBudget(t(30, 40), h, p)).toBe(0);
    // The 10 belongs only to the term-end forecast:
    expect(termEndForecast(t(30, 40), h, p)).toMatchObject({ maxSkippable: 10 });
  });

  it('D2 / FR-ATT-005: 6/10 R30 → recovery n=6, not v1\'s term-end "next 24"', () => {
    const p = exact();
    expect(recovery(t(6, 10), horizon(upcomingOf(30)), p)).toEqual({
      kind: 'recoverable',
      n: 6,
    });
  });

  it('D3 / FR-ATT-004: 149/200 displays 74 and 74.5, never the rounded "75"', () => {
    const p = exact();
    expect(displayPercent(t(149, 200), p, 0)).toBe('74');
    expect(displayPercent(t(149, 200), p, 1)).toBe('74.5');
  });

  it('D4 / FR-ATT-004: zero held → null display and not_started, not 100%', () => {
    const p = exact();
    const tl = t(0, 0);
    expect(displayPercent(tl, p, 0)).toBeNull();
    expect(isEligible(tl, p)).toBeNull();
    expect(copyBand(tl, null, p)).toBe('not_started');
  });

  it('D5 / FR-ATT-001: integer basis points — G13 boundary 6667 decided exactly', () => {
    const p = exact(6667);
    expect(isEligible(t(2, 3), p)).toBe(false);
    expect(isEligible(t(3, 4), p)).toBe(true);
  });

  // D6 (instant-granular upcoming set) belongs to occurrence math — ticket P1-02.
});

describe('§10 validation', () => {
  const p = exact();
  const h = horizon(upcomingOf(5));
  it.each([
    () => isEligible(t(-1, 5), p),
    () => isEligible(t(1.5, 5), p),
    () => isEligible(t(6, 5), p),
    () => displayPercent(t(Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 2), p, 0),
    () => safeNowBudget(t(3, 4), h, exact(-1)),
    () => safeNowBudget(t(3, 4), h, exact(10_001)),
    () => tally(baseline(0, 0), [mark('attended', 'not-a-date')], p),
    () => tally(baseline(0, 0), [mark('attended', '2026-02-30')], p),
    () => tally(baseline(0, 0, '2026-13-01'), [], p),
    () => safeNowBudget(t(3, 4), horizon(upcomingOf(1, 0)), p),
  ])('invalid input throws RangeError with attendance: prefix', fn => {
    expect(fn).toThrowError(RangeError);
    expect(fn).toThrowError(/^attendance:/);
  });
});
