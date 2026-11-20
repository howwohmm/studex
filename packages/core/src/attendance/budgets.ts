import { assertCapped, assertPolicy, assertTally, assertUnits, floorDivBig } from './validate';
import { isEligible, roundedPercentBig } from './eligibility';
import type { AttendancePolicy, Horizon, Tally } from './types';

export type Recovery =
  | { kind: 'not_started' }
  | { kind: 'eligible' }
  | { kind: 'recoverable'; n: number }
  | { kind: 'unreachable'; maxReachableDisplay: string | null };

export interface TermEndForecast {
  remaining: number;
  remainingUnits: number;
  maxSkippable: number;
  minToAttend: number;
  reachable: boolean;
  maxReachableDisplay: string;
}

function assertHorizon(h: Horizon): void {
  let total = 0;
  for (const occ of h.upcoming) {
    assertUnits(occ.units, 'upcoming.units');
    total += occ.units;
  }
  assertCapped(total, 'sum of upcoming units');
}

/** Integer display of a derived tally under the policy's display rule (§5). */
function policyPercent(A: bigint, H: bigint, policy: AttendancePolicy): string {
  if (policy.rounding === 'exact') return String((100n * A) / H);
  return String(roundedPercentBig(A, H));
}

function eligibleBig(A: bigint, H: bigint, policy: AttendancePolicy): boolean {
  const T = BigInt(policy.thresholdBp);
  if (policy.rounding === 'exact') {
    return 10_000n * A >= T * H;
  }
  return 100n * roundedPercentBig(A, H) >= T;
}

/**
 * Number of further 1-unit bunks that keep (A, H) eligible, when the term end is
 * unknown so the upcoming list is followed by unbounded virtual 1-unit classes.
 */
function virtualBunkBudget(A: bigint, H: bigint, policy: AttendancePolicy): number {
  const T = BigInt(policy.thresholdBp);
  if (T === 0n) return Infinity;
  if (policy.rounding === 'exact') {
    return Number(floorDivBig(10_000n * A - T * H, T));
  }
  // half_up_integer: eligibility is non-increasing in H with A fixed.
  let lo = 0n;
  let hi = 1n;
  while (eligibleBig(A, H + hi, policy)) hi *= 2n;
  while (hi - lo > 1n) {
    const mid = lo + (hi - lo) / 2n;
    if (eligibleBig(A, H + mid, policy)) lo = mid;
    else hi = mid;
  }
  return Number(lo);
}

/**
 * Smallest k >= 1 of attended virtual 1-unit classes that makes (A, H) eligible.
 * Callers guarantee T < 10_000, so the all-attend limit (100%) reaches it.
 */
function virtualRecoveryCount(A: bigint, H: bigint, policy: AttendancePolicy): number {
  const T = BigInt(policy.thresholdBp);
  if (policy.rounding === 'exact') {
    const k = floorDivBig(T * H - 10_000n * A + (10_000n - T - 1n), 10_000n - T);
    return Number(k);
  }
  // half_up_integer: eligibility under attend-all is non-decreasing in k.
  let lo = 0n;
  let hi = 1n;
  while (!eligibleBig(A + hi, H + hi, policy)) hi *= 2n;
  while (hi - lo > 1n) {
    const mid = lo + (hi - lo) / 2n;
    if (eligibleBig(A + mid, H + mid, policy)) hi = mid;
    else lo = mid;
  }
  return Number(hi);
}

export function safeNowBudget(t: Tally, h: Horizon, policy: AttendancePolicy): number | null {
  assertPolicy(policy);
  assertTally(t);
  assertHorizon(h);
  if (t.held === 0) return null;
  const eligible = isEligible(t, policy);
  if (eligible !== true) return 0;
  const A = BigInt(t.attended);
  let H = BigInt(t.held);
  let k = 0;
  for (const occ of h.upcoming) {
    H += BigInt(occ.units);
    if (!eligibleBig(A, H, policy)) break;
    k += 1;
  }
  if (h.termEndKnown || k < h.upcoming.length) return k;
  return k + virtualBunkBudget(A, H, policy);
}

export function recovery(t: Tally, h: Horizon, policy: AttendancePolicy): Recovery {
  assertPolicy(policy);
  assertTally(t);
  assertHorizon(h);
  if (t.held === 0) return { kind: 'not_started' };
  const eligible = isEligible(t, policy);
  if (eligible === true) return { kind: 'eligible' };
  let A = BigInt(t.attended);
  let H = BigInt(t.held);
  let n = 0;
  for (const occ of h.upcoming) {
    const u = BigInt(occ.units);
    A += u;
    H += u;
    n += 1;
    if (eligibleBig(A, H, policy)) return { kind: 'recoverable', n };
  }
  const ru = h.upcoming.reduce((sum, occ) => sum + occ.units, 0);
  if (h.termEndKnown) {
    const maxDisplay = policyPercent(
      BigInt(t.attended) + BigInt(ru),
      BigInt(t.held) + BigInt(ru),
      policy,
    );
    return { kind: 'unreachable', maxReachableDisplay: maxDisplay };
  }
  // T = 10_000 is impossible only under exact; a rounded 100% stays reachable (§6.4).
  if (policy.rounding === 'exact' && policy.thresholdBp === 10_000) {
    return { kind: 'unreachable', maxReachableDisplay: null };
  }
  return { kind: 'recoverable', n: n + virtualRecoveryCount(A, H, policy) };
}

export function termEndForecast(
  t: Tally,
  h: Horizon,
  policy: AttendancePolicy,
): TermEndForecast | null {
  assertPolicy(policy);
  assertTally(t);
  assertHorizon(h);
  if (!h.termEndKnown) return null;
  const R = h.upcoming.length;
  const ru = h.upcoming.reduce((sum, occ) => sum + occ.units, 0);
  const A = BigInt(t.attended);
  const H = BigInt(t.held);
  const T = BigInt(policy.thresholdBp);
  if (H === 0n && ru === 0) return null;
  const attendAllA = A + BigInt(ru);
  const attendAllH = H + BigInt(ru);
  const reachable = eligibleBig(attendAllA, attendAllH, policy);
  let maxSkippable = 0;
  if (reachable && policy.rounding === 'exact' && h.upcoming.every((o) => o.units === 1)) {
    // Closed form (u = 1, exact): skippable units s_u clipped to [0, R].
    const sUnits = floorDivBig(10_000n * attendAllA - T * attendAllH, 10_000n);
    maxSkippable = Number(sUnits) < R ? Number(sUnits) : R;
  } else if (reachable) {
    // Reference definition (mandatory under half_up_integer, §6.3): skip the
    // smallest units first while attending the rest stays eligible.
    const sorted = h.upcoming.map((occ) => occ.units).sort((a, b) => a - b);
    let skipped = 0n;
    for (const u of sorted) {
      if (!eligibleBig(attendAllA - skipped - BigInt(u), attendAllH, policy)) break;
      skipped += BigInt(u);
      maxSkippable += 1;
    }
  }
  const maxReachableDisplay = policyPercent(attendAllA, attendAllH, policy);
  return {
    remaining: R,
    remainingUnits: ru,
    maxSkippable,
    minToAttend: R - maxSkippable,
    reachable,
    maxReachableDisplay,
  };
}
