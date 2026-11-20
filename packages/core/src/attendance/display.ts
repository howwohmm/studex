import { assertPolicy, assertTally } from './validate.js';
import { roundedPercent } from './eligibility.js';
import type { AttendancePolicy, Tally } from './types.js';

export function displayPercent(
  t: Tally,
  policy: AttendancePolicy,
  decimals: 0 | 1,
): string | null {
  assertPolicy(policy);
  assertTally(t);
  if (t.held === 0) return null;
  if (policy.rounding === 'half_up_integer') {
    return String(roundedPercent(t));
  }
  const A = BigInt(t.attended);
  const H = BigInt(t.held);
  if (decimals === 0) {
    return String((100n * A) / H);
  }
  const tenths = (1000n * A) / H;
  return `${tenths / 10n}.${tenths % 10n}`;
}
