export type BasisPoints = number;
export type Units = number;
export type MarkStatus = 'attended' | 'bunked' | 'cancelled' | 'excused';
export type ExcusedKind = 'on_duty' | 'medical' | 'other';
export type ExcusedMapping = 'present' | 'excluded' | 'absent';

export interface AttendancePolicy {
  thresholdBp: BasisPoints;
  rounding: 'exact' | 'half_up_integer';
  basis: 'per_subject' | 'overall' | 'both';
  excused: Record<ExcusedKind, ExcusedMapping> | null;
}

export interface Tally {
  attended: Units;
  held: Units;
}

/** Catch-up numbers covering every occurrence from term start through `asOf` (inclusive). */
export interface Baseline {
  attended: Units;
  held: Units;
  /** Local date `YYYY-MM-DD`, or null when nothing is covered yet. */
  asOf: string | null;
}

export interface Mark {
  occurrenceKey: string;
  /** Local date `YYYY-MM-DD` of the occurrence. */
  localDate: string;
  status: MarkStatus;
  excusedKind?: ExcusedKind;
  units: Units;
}

export interface UpcomingOccurrence {
  occurrenceKey: string;
  startsAt: string;
  units: Units;
  subjectId: string;
}

export interface Horizon {
  upcoming: readonly UpcomingOccurrence[];
  termEndKnown: boolean;
}
