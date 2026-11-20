import {
  assertCapped,
  assertLocalDate,
  assertPolicy,
  assertTally,
  assertUnits,
  fail,
} from './validate';
import type {
  AttendancePolicy,
  Baseline,
  ExcusedKind,
  ExcusedMapping,
  Mark,
  Tally,
} from './types';

const VALID_STATUSES = new Set(['attended', 'bunked', 'cancelled', 'excused']);
const VALID_EXCUSED_KINDS = new Set(['on_duty', 'medical', 'other']);

function excusedMappingFor(policy: AttendancePolicy, kind: ExcusedKind): ExcusedMapping {
  if (policy.excused === null) return 'excluded';
  return policy.excused[kind];
}

export function markContribution(mark: Mark, policy: AttendancePolicy): Tally {
  assertUnits(mark.units, 'mark.units');
  assertLocalDate(mark.localDate, 'mark.localDate');
  if (!VALID_STATUSES.has(mark.status)) fail(`unknown mark status '${mark.status}'`);
  switch (mark.status) {
    case 'attended':
      return { attended: mark.units, held: mark.units };
    case 'bunked':
      return { attended: 0, held: mark.units };
    case 'cancelled':
      return { attended: 0, held: 0 };
    case 'excused': {
      const kind = mark.excusedKind ?? 'other';
      if (!VALID_EXCUSED_KINDS.has(kind)) fail(`unknown excused kind '${kind}'`);
      const mapping = excusedMappingFor(policy, kind);
      switch (mapping) {
        case 'present':
          return { attended: mark.units, held: mark.units };
        case 'excluded':
          return { attended: 0, held: 0 };
        case 'absent':
          return { attended: 0, held: mark.units };
      }
    }
  }
}

export function tally(
  baseline: Baseline,
  marks: readonly Mark[],
  policy: AttendancePolicy,
): Tally {
  assertPolicy(policy);
  assertTally(baseline);
  if (baseline.asOf !== null) assertLocalDate(baseline.asOf, 'baseline.asOf');
  let attended = baseline.attended;
  let held = baseline.held;
  for (const mark of marks) {
    const c = markContribution(mark, policy);
    // The baseline already covers every occurrence through asOf (inclusive).
    if (baseline.asOf !== null && mark.localDate <= baseline.asOf) continue;
    attended += c.attended;
    held += c.held;
    assertCapped(attended, 'attended');
    assertCapped(held, 'held');
  }
  return { attended, held };
}

export function overallTally(subjects: readonly Tally[]): Tally {
  let attended = 0;
  let held = 0;
  for (const s of subjects) {
    assertTally(s);
    attended += s.attended;
    held += s.held;
  }
  return { attended, held };
}
