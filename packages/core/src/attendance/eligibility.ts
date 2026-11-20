import { assertPolicy, assertTally } from './validate.js';
import type { AttendancePolicy, Tally } from './types.js';

/** College-rounded integer percent under half_up_integer: floor((200A + H) / (2H)). */
export function roundedPercentBig(A: bigint, H: bigint): bigint {
  return (200n * A + H) / (2n * H);
}

export function isEligible(t: Tally, policy: AttendancePolicy): boolean | null {
  assertPolicy(policy);
  assertTally(t);
  if (t.held === 0) return null;
  const T = BigInt(policy.thresholdBp);
  const A = BigInt(t.attended);
  const H = BigInt(t.held);
  if (policy.rounding === 'exact') {
    return 10_000n * A >= T * H;
  }
  return 100n * roundedPercentBig(A, H) >= T;
}
