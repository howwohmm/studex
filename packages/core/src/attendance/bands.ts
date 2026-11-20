import { assertPolicy, assertTally, fail } from './validate.js';
import { isEligible } from './eligibility.js';
import type { AttendancePolicy, Tally } from './types.js';

export const CLOSE_MARGIN_BP = 600;

function assertBudget(k: number | null): void {
  if (k === null || k === Infinity) return;
  if (!Number.isInteger(k) || !Number.isSafeInteger(k) || k < 0) {
    fail(`budget k must be null, a non-negative integer or Infinity, got ${k}`);
  }
}

export function copyBand(
  t: Tally,
  k: number | null,
  policy: AttendancePolicy,
): 'above' | 'close' | 'below' | 'not_started' {
  assertPolicy(policy);
  assertTally(t);
  assertBudget(k);
  if (t.held === 0 || k === null) return 'not_started';
  if (isEligible(t, policy) === true) {
    return k >= 1 ? 'above' : 'close';
  }
  return 'below';
}

export function colorBand(
  t: Tally,
  k: number | null,
  policy: AttendancePolicy,
): 'good' | 'close' | 'below' | 'not_started' {
  assertPolicy(policy);
  assertTally(t);
  assertBudget(k);
  if (t.held === 0 || k === null) return 'not_started';
  if (isEligible(t, policy) !== true) return 'below';
  const A = BigInt(t.attended);
  const H = BigInt(t.held);
  const comfortable = 10_000n * A >= (BigInt(policy.thresholdBp) + BigInt(CLOSE_MARGIN_BP)) * H;
  return comfortable && k >= 1 ? 'good' : 'close';
}
