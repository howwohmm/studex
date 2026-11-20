import { assertPolicy, assertTally } from './validate.js';
import { markContribution } from './tally.js';
import type {
  AttendancePolicy,
  ExcusedKind,
  MarkStatus,
  Tally,
} from './types.js';

export interface SimulationStep {
  units: number;
  status: MarkStatus;
  excusedKind?: ExcusedKind;
}

/** Returns the tally after each step of the proposed sequence. */
export function simulate(
  t: Tally,
  sequence: readonly SimulationStep[],
  policy: AttendancePolicy,
): Tally[] {
  assertPolicy(policy);
  assertTally(t);
  let current: Tally = { attended: t.attended, held: t.held };
  const out: Tally[] = [];
  for (const step of sequence) {
    const mark =
      step.excusedKind === undefined
        ? { occurrenceKey: '', localDate: '2000-01-01', status: step.status, units: step.units }
        : {
            occurrenceKey: '',
            localDate: '2000-01-01',
            status: step.status,
            excusedKind: step.excusedKind,
            units: step.units,
          };
    const c = markContribution(mark, policy);
    current = { attended: current.attended + c.attended, held: current.held + c.held };
    out.push(current);
  }
  return out;
}
