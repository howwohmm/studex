import { describe, expect, it } from 'vitest';
import { recovery, safeNowBudget } from '../index';
import type { AttendancePolicy, Horizon } from '../index';

const R = 30;

const horizon: Horizon = {
  upcoming: Array.from({ length: R }, (_, i) => ({
    occurrenceKey: `o${i}`,
    startsAt: 'x',
    units: 1,
    subjectId: 's',
  })),
  termEndKnown: true,
};

const policy = (thresholdBp: number): AttendancePolicy => ({
  thresholdBp,
  rounding: 'exact',
  basis: 'per_subject',
  excused: null,
});

const eligible = (A: number, H: number, T: number): boolean => 10_000 * A >= T * H;

/** Independent brute force: bunk occurrences one by one until ineligible. */
function bruteSafeNow(A: number, H: number, T: number): number {
  if (!eligible(A, H, T)) return 0;
  let k = 0;
  while (k < R && eligible(A, H + k + 1, T)) k += 1;
  return k;
}

/** Independent brute force: attend occurrences one by one until eligible. */
function bruteRecovery(A: number, H: number, T: number): number | 'eligible' | 'unreachable' {
  if (eligible(A, H, T)) return 'eligible';
  for (let n = 1; n <= R; n += 1) {
    if (eligible(A + n, H + n, T)) return n;
  }
  return 'unreachable';
}

describe('§11.3 exhaustive boundary sweep (closed form == brute force)', () => {
  const thresholds = [5000, 6000, 6500, 6667, 7000, 7500, 7550, 8000, 8500, 9000, 9500, 10_000];
  it.each(thresholds)('T=%i over all H∈[1,300], A∈[0,H]', (T) => {
    const p = policy(T);
    for (let H = 1; H <= 300; H += 1) {
      for (let A = 0; A <= H; A += 1) {
        const tl = { attended: A, held: H };
        expect(safeNowBudget(tl, horizon, p), `safeNow A=${A} H=${H}`).toBe(
          bruteSafeNow(A, H, T),
        );
        const expected = bruteRecovery(A, H, T);
        const actual = recovery(tl, horizon, p);
        if (expected === 'unreachable') {
          expect(actual.kind, `recovery A=${A} H=${H}`).toBe('unreachable');
        } else if (expected === 'eligible') {
          expect(actual, `recovery A=${A} H=${H}`).toEqual({ kind: 'eligible' });
        } else {
          expect(actual, `recovery A=${A} H=${H}`).toEqual({ kind: 'recoverable', n: expected });
        }
      }
    }
  });
});

describe('§11.3 unknown term end (empty upcoming, H∈[1,40] — narrowed for the <10s budget)', () => {
  const openHorizon: Horizon = { upcoming: [], termEndKnown: false };
  const thresholds = [5000, 6000, 6500, 6667, 7000, 7500, 7550, 8000, 8500, 9000, 9500, 10_000];

  /** Independent brute force over virtual 1-unit bunks. */
  function bruteOpenSafeNow(A: number, H: number, T: number): number {
    if (!eligible(A, H, T)) return 0;
    let k = 0;
    while (eligible(A, H + k + 1, T)) k += 1;
    return k;
  }

  /** Independent brute force over virtual 1-unit attends. */
  function bruteOpenRecovery(A: number, H: number, T: number): number | 'eligible' | 'unreachable' {
    if (eligible(A, H, T)) return 'eligible';
    if (T === 10_000) return 'unreachable';
    for (let n = 1; ; n += 1) {
      if (eligible(A + n, H + n, T)) return n;
    }
  }

  it.each(thresholds)('T=%i over all H∈[1,40], A∈[0,H]', (T) => {
    const p = policy(T);
    for (let H = 1; H <= 40; H += 1) {
      for (let A = 0; A <= H; A += 1) {
        const tl = { attended: A, held: H };
        expect(safeNowBudget(tl, openHorizon, p), `safeNow A=${A} H=${H}`).toBe(
          bruteOpenSafeNow(A, H, T),
        );
        const expected = bruteOpenRecovery(A, H, T);
        const actual = recovery(tl, openHorizon, p);
        if (expected === 'unreachable') {
          expect(actual, `recovery A=${A} H=${H}`).toEqual({
            kind: 'unreachable',
            maxReachableDisplay: null,
          });
        } else if (expected === 'eligible') {
          expect(actual, `recovery A=${A} H=${H}`).toEqual({ kind: 'eligible' });
        } else {
          expect(actual, `recovery A=${A} H=${H}`).toEqual({ kind: 'recoverable', n: expected });
        }
      }
    }
  });
});
