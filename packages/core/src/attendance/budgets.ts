import {
  assertPolicy,
  assertTally,
  assertUnits,
  floorDivBig,
} from './validate.js';
import { isEligible } from './eligibility.js';
import type {
  AttendancePolicy,
  Horizon,
  Tally,
} from './types.js';

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
  for (const occ of h.upcoming) {
    assertUnits(occ.units, 'upcoming.units');
  }
}

function eligibleBig(A: bigint, H: bigint, policy: AttendancePolicy): boolean {
  const T = BigInt(policy.thresholdBp);
  if (policy.rounding === 'exact') {
    return 10_000n * A >= T * H;
  }
  const p = (200n * A + H) / (2n * H);
  return 100n * p >= T;
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
  let lo = 0;
  let hi = 1;
  while (eligibleBig(A, H + BigInt(hi), policy)) hi *= 2;
  while (hi - lo > 1) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (eligibleBig(A, H + BigInt(mid), policy)) lo = mid;
    else hi = mid;
  }
  return lo;
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
  let lo = 0;
  let hi = 1;
  while (!eligibleBig(A + BigInt(hi), H + BigInt(hi), policy)) hi *= 2;
  while (hi - lo > 1) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (eligibleBig(A + BigInt(mid), H + BigInt(mid), policy)) hi = mid;
    else lo = mid;
  }
  return hi;
}

export function safeNowBudget(
  t: Tally,
  h: Horizon,
  policy: AttendancePolicy,
): number | null {
  assertPolicy(policy);
  assertTally(t);
  assertHorizon(h);
  if (t.held === 0) return null;
  const eligible = isEligible(t, policy);
  if (eligible !== true) return 0;
  let A = BigInt(t.attended);
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

export function recovery(
  t: Tally,
  h: Horizon,
  policy: AttendancePolicy,
): Recovery {
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
    const maxDisplay = String(
      (100n * (BigInt(t.attended) + BigInt(ru))) / (BigInt(t.held) + BigInt(ru)),
    );
    return { kind: 'unreachable', maxReachableDisplay: maxDisplay };
  }
  if (policy.thresholdBp === 10_000) {
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
  const sUnits = floorDivBig(10_000n * (A + BigInt(ru)) - T * (H + BigInt(ru)), 10_000n);
  const reachable = sUnits >= 0n;
  let maxSkippable = 0;
  if (reachable) {
    const sorted = h.upcoming.map((occ) => occ.units).sort((a, b) => a - b);
    let spent = 0;
    for (const u of sorted) {
      if (BigInt(spent) + BigInt(u) > sUnits) break;
      spent += u;
      maxSkippable += 1;
    }
  }
  const maxReachableDisplay = String((100n * (A + BigInt(ru))) / (H + BigInt(ru)));
  return {
    remaining: R,
    remainingUnits: ru,
    maxSkippable,
    minToAttend: R - maxSkippable,
    reachable,
    maxReachableDisplay,
  };
}
