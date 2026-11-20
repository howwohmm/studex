import type { AttendancePolicy, Tally, Units } from './types.js';

export function fail(message: string): never {
  throw new RangeError(`attendance: ${message}`);
}

export function assertInt(value: number, name: string): void {
  if (!Number.isInteger(value)) fail(`${name} must be an integer, got ${value}`);
  if (!Number.isSafeInteger(value)) fail(`${name} must be a safe integer, got ${value}`);
}

export const MAX_INPUT = 1_000_000;

export function assertNonNegative(value: number, name: string): void {
  assertInt(value, name);
  if (value < 0) fail(`${name} must be >= 0, got ${value}`);
}

export function assertCapped(value: number, name: string): void {
  assertNonNegative(value, name);
  if (value > MAX_INPUT) fail(`${name} must be <= ${MAX_INPUT}, got ${value}`);
}

export function assertUnits(value: Units, name: string): void {
  assertInt(value, name);
  if (value <= 0) fail(`${name} must be a positive integer, got ${value}`);
  if (value > MAX_INPUT) fail(`${name} must be <= ${MAX_INPUT}, got ${value}`);
}

export function assertPolicy(policy: AttendancePolicy): void {
  assertInt(policy.thresholdBp, 'thresholdBp');
  if (policy.thresholdBp < 0 || policy.thresholdBp > 10_000) {
    fail(`thresholdBp must be in 0..10000, got ${policy.thresholdBp}`);
  }
}

export function assertTally(t: Tally): void {
  assertCapped(t.attended, 'attended');
  assertCapped(t.held, 'held');
  if (t.attended > t.held) {
    fail(`attended (${t.attended}) exceeds held (${t.held})`);
  }
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(y: number): boolean {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}

/** Validates a `YYYY-MM-DD` local calendar date; throws RangeError otherwise. */
export function assertLocalDate(value: string, name: string): void {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m === null) fail(`${name} must be a YYYY-MM-DD date, got '${value}'`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) fail(`${name} has invalid month in '${value}'`);
  const dim =
    month === 2 && isLeapYear(year) ? 29 : (DAYS_IN_MONTH[month - 1] as number);
  if (day < 1 || day > dim) fail(`${name} has invalid day in '${value}'`);
}

/** True floor division on bigints; denominator must be positive. */
export function floorDivBig(numerator: bigint, denominator: bigint): bigint {
  const q = numerator / denominator;
  return numerator % denominator !== 0n && numerator < 0n ? q - 1n : q;
}
