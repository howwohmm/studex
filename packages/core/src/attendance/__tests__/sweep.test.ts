import { describe, expect, it } from 'vitest';
import { recovery, safeNowBudget } from '../index.js';
import type { AttendancePolicy, Horizon } from '../index.js';

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
