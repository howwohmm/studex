# 05 — Attendance Engine Specification (normative)

This is the most trust-critical code in Studex. A wrong number at detention-list time ends the
relationship with the student. Implement it once, in `packages/core/attendance`, as **pure,
deterministic, integer arithmetic**, and use it from every surface (app screens, widgets,
notifications, API, exports). No surface may re-derive any of these numbers.

Golden values in §8 were computed by script and cross-checked against a brute-force reference
over ≈ 1 million (attended, held, threshold) combinations. They are immutable unless this file
changes through a `spec:` PR.

---

## 1. Principles

1. **Marks are facts; schedules are predictions.** Held/attended come only from baselines and
   marks. Remaining-class forecasts come from the schedule.
2. **Unknown is not zero and not 100.** No percentage exists until something has been held.
3. **Never round toward safety.** Displayed values are floored; comparisons are exact integers.
4. **Every sentence is literally true.** "Stay above" and "reach" describe what happens if the
   student does exactly what the sentence says, starting now.
5. **One implementation, many surfaces.** Any divergence between two screens is a P0 bug.

## 2. Inputs and contributions

- **Threshold `T`** in basis points (integer, 0–10,000): 7,500 = 75.00%. Stored per term with
  per-subject overrides. UI range 50–95% in steps of 1; API accepts 0–10,000.
- **Units `u`** per occurrence: positive integer, default 1. A multi-period lab is **one**
  occurrence (v1 rule) unless the student sets lab units to the number of periods.
- **Baseline** per subject: `(Ab, Hb)` with 0 ≤ Ab ≤ Hb (catch-up, CSV, reconciliation) and a
  coverage date `asOf` (inclusive): the baseline already counts every occurrence from term start
  through `asOf`. Catch-up sets `asOf` to the day before the onboarding commit (also for "Start
  from today", with 0/0); a subject created later gets the day before its creation;
  reconciliation (FR-ATT-014) moves it to the screenshot date.
- **Policy:** `rounding ∈ {exact, half_up_integer}`, `basis ∈ {per_subject, overall, both}`,
  `excused` mapping (or disabled), contact-hour handling.

**Contribution of each occurrence to (attended, held):**

| State | Attended | Held | Notes |
|---|---|---|---|
| Unmarked (no record) | 0 | 0 | Default. Never auto-marked. Past unmarked = "unresolved". |
| Attended | u | u | |
| Bunked | 0 | u | LOCKED word. |
| Cancelled | 0 | 0 | Class did not happen. Allowed in advance for future occurrences. |
| Excused → `present` | u | u | Typical for on-duty (OD). |
| Excused → `excluded` | 0 | 0 | Typical for medical leave. |
| Excused → `absent` | 0 | u | |

Contact hours: excluded from forward counts and unmarked by default; once marked they contribute
like any class.

**Tally:** `A = Ab + Σ attended`, `H = Hb + Σ held` over the subject's marks **dated after
`asOf`**. Marks dated on or before `asOf` are ignored: the baseline already contains those days,
and counting them again would double-count (a 30/40 baseline plus a Bunked mark for a covered day
must stay 30/40, not become 30/41). Invariant 0 ≤ A ≤ H (violations are data errors → reject the
write).
**Overall tally:** `A_o = Σ A_s`, `H_o = Σ H_s` over the term's active subjects with
`counts_in_overall = true` (default true; audit courses may be excluded). **Never** average
subject percentages: subjects (18/20, 1/5) are 19/25 = 76% overall, not 55%.

## 3. Occurrences and the remaining horizon

- `occurrences(slot, from, to, calendar)` returns dates in [from, to] where the slot version is
  valid, the weekday matches (weekly mode) or the day-order index matches (day-order mode), week
  parity matches (if set), the date is not a holiday or break, and no exception cancels it;
  plus one-off extra classes. Dates are local dates in the term timezone.
- **Day-order mode:** working days = term dates on the term's `working_weekdays` (default Mon–Fri
  for day-order terms; configurable) that are not holidays or breaks. The k-th working day
  (0-based from the anchor date) has order `((k + anchorOffset) mod N) + 1`. An override "date d
  follows order x" re-anchors so that the next working day is `(x mod N) + 1`.
- **Upcoming occurrences** for a subject at instant `now`: occurrences whose start instant (term
  timezone) is **after `now`**, up to the term end date inclusive, excluding contact hours and
  occurrences already marked Cancelled. Today's later classes count as upcoming (fix for v1
  defect D6).
- `R` = number of upcoming occurrences (and `R_u` = their total units). If the term has no end
  date, `R` is unknown: no caps apply and term-end forecasts are hidden ("Add your last day to see
  semester forecasts").
- Past occurrences dated after the baseline `asOf` without a mark are excluded from A, H and R
  and surface as "unresolved". Occurrences on or before `asOf` are covered by the baseline: never
  unresolved and never markable ("Covered by your catch-up numbers — edit those instead").

## 4. Eligibility predicate

- `H = 0` → **no standing** ("not started"): no percentage, no band, no eligibility.
- `exact` (default): **eligible ⇔ 10,000·A ≥ T·H**.
- `half_up_integer` (colleges that round): `P = floor((200·A + H) / (2·H))` (100·A/H rounded half
  up); **eligible ⇔ 100·P ≥ T**.

Example: T = 6,667 (66.67%), A = 2, H = 3 → 20,000 < 20,001 → **not eligible** (66.666…% <
66.67%).

## 5. Display rules

- Compact surfaces: integer `floor(100·A / H)`. Detail surfaces: one decimal,
  `floor(1000·A / H) / 10`. **Never round up.** Under `half_up_integer`, show the
  college-rounded integer `P` with the disclosure "Rounded as per your college's rule."
- Threshold text: `T / 100` without trailing zeros ("75", "66.67").
- **Guarantee (property-tested):** under `exact`, with an integer-percent threshold, a student
  who is not eligible never sees a displayed value ≥ the threshold.
- Fraction disclosure on every percentage: "{A} of {H} attended". If any unit weight ≠ 1 in the
  tally, append "(counted in periods)".
- `H = 0`: compact "—"; sentence "No classes yet."

## 6. Budgets, recovery and forecasts

All budget functions have a **reference definition by simulation** over the chronologically
ordered upcoming occurrences with their units. Closed forms are optimizations valid only when
every unit is 1 and the policy is `exact`; property tests assert they equal the simulation.

### 6.1 Safe-now bunk budget `k` (primary)
Largest k ≥ 0 such that bunking the next k upcoming occurrences keeps the student eligible after
each one (H += uᵢ per bunk). Capped at R when R is known. If not eligible, k = 0.
Closed form (u = 1, exact): **k = floor((10,000·A − T·H) / T)**, then min(k, R).
Sentence (ABOVE): "You can bunk {k} more and stay above {T}%."

### 6.2 Recovery `n` (primary when below)
Smallest n ≥ 1 such that attending the next n upcoming occurrences (A += uᵢ, H += uᵢ) makes
the student eligible. Closed form (u = 1, exact, T < 10,000): **n = ceil((T·H − 10,000·A) /
(10,000 − T))**. If T = 10,000 and A < H, or n > R (R known) → unreachable (§6.4).
Sentence (BELOW): "Attend the next {n} to reach {T}%." The number decrements by one with each
attended class (the live countdown in psych §5).

### 6.3 Term-end forecast (secondary; forecast panel only)
Assuming the student attends every upcoming occurrence except s of them:
**s_max = floor((10,000·(A + R) − T·(H + R)) / 10,000)**, clipped to [0, R] (u = 1; with
mixed units, express in units/periods). Lines:
"To finish the semester at {T}%, attend at least {R − s_max} of the remaining {R}." and
"You can miss up to {s_max} of them." If the raw value is negative, the term-end target is
unreachable → §6.4.

### 6.4 Honest impossibility (copy approved in psych.md)
"{T}% isn't reachable this sem. Max possible: {floor(100·(A + R) / (H + R))}%. Each class raises it."

### 6.5 Not started (H = 0)
"No classes yet." If R is known, forecast panel: "You can miss up to {floor((10,000 − T)·R /
10,000)} of the {R} classes this sem." (**new copy — needs Ohm's approval**).

### 6.6 Bands and sentences
- **Copy band** (from copy.md conventions): ABOVE = eligible ∧ k ≥ 1 · CLOSE = eligible ∧ k = 0
  · BELOW = not eligible.
- **Color band** (separate axis): good = eligible ∧ (100·A/H ≥ T/100 + 6) ∧ k ≥ 1 · close =
  other eligible · below = not eligible. The 6-point margin is the constant
  `CLOSE_MARGIN_BP = 600`, declared once in the engine.

| Surface | ABOVE | CLOSE | BELOW |
|---|---|---|---|
| Today header (`today.verdict.*`) | You're at {p}%. You can bunk {k} more and stay above {T}%. | You're at {p}%. One bunk puts you under {T}%. | You're at {p}%. Attend the next {n} to reach {T}%. |
| Subject detail (`detail.status.*`) | {p}%. You can bunk {k} more and stay above {T}%. | {p}%. One bunk puts you under {T}%. | {p}%. Attend the next {n} to reach {T}%. |
| Today row chip | {k} to spare | 0 to spare | attend next {n} |
| Subjects row | {A} of {H} · Can bunk {k} more | {A} of {H} · No bunks to spare | {A} of {H} · Needs {n} |

Plural forms are handled in `packages/copy` (ICU MessageFormat); "1 more" stays grammatical.

### 6.7 Composition across subjects: the three eligibility bases
Each subject is judged against its own threshold (the term threshold or its override); the
**aggregate** is judged against the term threshold on the overall tally. The big percentage on
Today is always the aggregate (status). Every sentence must stay true for every constraint the
basis imposes.

| Basis | Eligible means | Subject safe-now kₛ | Header total k |
|---|---|---|---|
| `per_subject` (default) | every subject eligible | simulate bunking the subject's next classes; stop when the subject fails its own threshold | k = Σₛ kₛ |
| `overall` | aggregate eligible | not shown per subject | aggregate safe-now over the merged chronological upcoming sequence |
| `both` | every subject eligible **and** the aggregate eligible | simulate bunking the subject's next classes; stop when the subject **or the aggregate** fails | largest count of upcoming occurrences, at most the per-subject kₛ from each subject, smallest units first, whose units fit the aggregate unit budget U_o = floor((10,000·A_o − T·H_o) / T); with all units 1, k = min(Σₛ kₛ, U_o) |

Header sentence, in precedence order:
1. `overall` or `both`, aggregate not eligible → the locked BELOW sentence with the aggregate
   recovery n.
2. `per_subject` or `both`, one or more subjects not eligible → **new copy (needs Ohm's
   approval)**: one subject: "You're at {p}% overall. {subject} needs the next {n} to reach {T}%."
   · several: "You're at {p}% overall. {m} subjects need classes to reach {T}%." Tap → breakdown
   sheet.
3. Otherwise ABOVE with the header total k when k ≥ 1, else CLOSE. The per-row chips show where
   the bunks can be spent.

Regression G18 (an override under `both`) is in §8.

### 6.8 Bunk planner and simulator
Pure functions over a proposed sequence of statuses (e.g. all occurrences on a chosen date marked
Bunked, others unchanged) returning the resulting tally, display value, eligibility and k/n per
subject and overall. No side effects.

## 7. Marking semantics

- Exactly one current mark per occurrence key (`{slotId}:{YYYY-MM-DD}` or `x:{exceptionId}`).
  Re-marking replaces; unmarking writes a tombstone. Every change appends an audit event.
- Future occurrences may only be marked **Cancelled** (known cancellations remove them from R).
- Marks always count by their status even if the schedule later changes (slot deleted, holiday
  declared and the user chose "keep"). Orphaned marks stay visible in the ledger.
- Backfill is allowed for any past date after the subject's baseline `asOf` (§2).
- **Recovered toast** fires when a mark (not a settings, baseline or policy edit) flips a subject
  or the overall tally from not eligible to eligible.

## 8. Golden test table (immutable)

T = 7,500 unless stated; all units 1 unless stated; policy `exact` unless stated.

| ID | A | H | T | R | Display (int / 1dp) | Eligible | k (safe-now) | n (recovery) | Term-end s_max · min attend | Band → sentence |
|---|---|---|---|---|---|---|---|---|---|---|
| G1 | 30 | 40 | 7500 | 40 | 75 / 75.0 | yes | 0 | 0 | 10 · 30 | CLOSE → "You're at 75%. One bunk puts you under 75%." |
| G2 | 33 | 40 | 7500 | 20 | 82 / 82.5 | yes | 4 | 0 | 8 · 12 | ABOVE → "…You can bunk 4 more and stay above 75%." |
| G3 | 29 | 40 | 7500 | 20 | 72 / 72.5 | no | 0 | 4 | 4 · 16 | BELOW → "…Attend the next 4 to reach 75%." |
| G4 | 149 | 200 | 7500 | 50 | 74 / 74.5 | no | 0 | 4 | 11 · 39 | BELOW (never displays 75) |
| G4b | 149 | 200 | 7500 | 50 | 75 (college-rounded) | yes (`half_up_integer`) | 0 | 0 | — | CLOSE |
| G5 | 23 | 29 | 7500 | 10 | 79 / 79.3 | yes | 1 | 0 | 3 · 7 | ABOVE ("1 more") |
| G6 | 90 | 100 | 7500 | 5 | 90 / 90.0 | yes | 5 (uncapped 20; capped at R) | 0 | 5 · 0 | ABOVE |
| G7 | 20 | 40 | 7500 | 10 | 50 / 50.0 | no | 0 | unreachable (40 > R) | unreachable | "75% isn't reachable this sem. Max possible: 60%. Each class raises it." |
| G8 | 10 | 12 | 7500 | 3 (units 2,1,1) | 83 / 83.3 | yes | **0** (next is a 2-unit lab; the u = 1 closed form would wrongly say 1) | 0 | — | CLOSE — proves simulation is required with mixed units |
| G9 | 2 | 3 | 7500 | 10 | 66 / 66.6 | no | 0 | 1 | 2 · 8 | BELOW → "Attend the next 1 to reach 75%." |
| G10 | 0 | 0 | 7500 | 40 | — | n/a | n/a | n/a | 10 of 40 | "No classes yet." |
| G11 | subjects 18/20 and 1/5 | | 7500 | 20 each | overall 76 | overall yes; subject 2 no | — | subject 2: 11 | — | per-subject header → "You're at 76% overall. {subject 2} needs the next 11 to reach 75%." Mean of % (55) is forbidden. |
| G12 | 34 | 40 | 8500 | 20 | 85 / 85.0 | yes | 0 | 0 | 3 · 17 | CLOSE at 85% |
| G13 | 2 | 3 | 6667 | 10 | 66 / 66.6 | **no** (20,000 < 20,001) | 0 | 1 | 3 · 7 | BELOW |
| G14 | marks: 8 attended, 2 bunked, 1 excused on-duty (`present`) | → A 9, H 11 | 7500 | — | 81 / 81.8 | yes | — | — | — | — |
| G15 | any tally + any number of Cancelled marks or unmarked occurrences | unchanged | | | unchanged | unchanged | | | | invariance |
| G16 | unmarked contact hour → (0, 0); marked attended contact hour → (1, 1) | | | | | | | | | contact-hour rule |
| G17a | baseline 30/40 with asOf 2026-11-19, plus a Bunked mark dated 2026-11-19 | → A 30, H 40 | 7500 | — | 75 / 75.0 | yes | — | — | — | covered mark ignored (no double count) |
| G17b | same baseline, plus a Bunked mark dated 2026-11-20 | → A 30, H 41 | 7500 | — | 73 / 73.1 | no | 0 | 3 | — | BELOW |
| G18 | basis `both`; term T 7500; subject A 50/100 with override T 5000; subject B 100/100 at T 7500 | aggregate 150/200 | 7500 | ≥ 40 each | overall 75 | every subject and the aggregate eligible | per subject: A 0, B 33; under `both`: B 0 (one B bunk → aggregate 150/201) | — | — | header total min(33, U_o = 0) = 0 → CLOSE "You're at 75%. One bunk puts you under 75%." (`per_subject` alone would wrongly offer 33) |

## 9. v1.0 defects not to carry over

| # | v1.0 behavior (`reference/v1/domain`) | Why it is wrong | Fix |
|---|---|---|---|
| D1 | `canMiss` used the **term-end** horizon. A=30, H=40, R=40 → "You can bunk 10 more and stay above 75%". | After one bunk the student is at 30/41 = 73.1% and the copy flips to "Attend the next 3…". "Stay above" was false. | Primary budget = safe-now (§6.1); term-end lives in the forecast (§6.3). |
| D2 | `mustAttend` = classes needed **by term end** under "Attend the next {n} to reach 75%". A=6, H=10, R=30 → "next 24". | Attending the next 6 already reaches 75% (12/16). | Recovery = consecutive classes from now (§6.2). |
| D3 | `pct()` rounded half up: 149/200 = 74.5% shown as "75" next to "Attend the next 4 to reach 75%". | Displays the threshold while below it. | Floor display (§5). |
| D4 | Zero held → 100%. | Fabricated number. | "No classes yet" (§6.5). |
| D5 | Thresholds as `Double`. | Floating-point edge errors at boundaries. | Integer basis points (§2). |
| D6 | Remaining horizon strictly after **today** (day-granular). | Excluded today's upcoming classes from the budget at the moment of the bunk decision. | Instant-based upcoming set (§3). |

Port v1's test *cases* (`reference/v1/tests/`) where they encode correct behavior; rewrite those
that encode D1–D6.

## 10. Module interface (`packages/core/attendance`, TypeScript)

```ts
export type BasisPoints = number;            // integer 0..10_000
export type Units = number;                  // positive safe integer
export type MarkStatus = 'attended' | 'bunked' | 'cancelled' | 'excused';
export type ExcusedKind = 'on_duty' | 'medical' | 'other';
export type ExcusedMapping = 'present' | 'excluded' | 'absent';

export interface AttendancePolicy {
  thresholdBp: BasisPoints;
  rounding: 'exact' | 'half_up_integer';
  basis: 'per_subject' | 'overall' | 'both';
  excused: Record<ExcusedKind, ExcusedMapping> | null;   // null = Excused disabled; stray excused marks count as excluded
}
export interface Tally { attended: Units; held: Units }  // invariant 0 ≤ attended ≤ held
export interface Baseline { attended: Units; held: Units; asOf: string | null } // asOf: YYYY-MM-DD, inclusive coverage (§2)
export interface Mark { occurrenceKey: string; localDate: string /* YYYY-MM-DD */; status: MarkStatus; excusedKind?: ExcusedKind; units: Units }
export interface UpcomingOccurrence { occurrenceKey: string; startsAt: string /* ISO instant */; units: Units; subjectId: string }

/** Chronological upcoming occurrences; the caller has already removed contact hours and Cancelled ones. */
export interface Horizon {
  upcoming: readonly UpcomingOccurrence[];
  /** true: `upcoming` is the complete remaining set through the term end (R = upcoming.length).
   *  false: term end unknown — no caps, and once `upcoming` runs out the budgets continue with
   *  virtual 1-unit classes. */
  termEndKnown: boolean;
}

export function tally(baseline: Baseline, marks: readonly Mark[], policy: AttendancePolicy): Tally; // ignores marks dated ≤ asOf
export function overallTally(subjects: readonly Tally[]): Tally;                                   // Σ/Σ, never a mean of %
export function isEligible(t: Tally, policy: AttendancePolicy): boolean | null;                  // null when held = 0
export function displayPercent(t: Tally, policy: AttendancePolicy, decimals: 0 | 1): string | null; // floored, integer math; null when held = 0
export function safeNowBudget(t: Tally, h: Horizon, policy: AttendancePolicy): number | null;    // null when held = 0; Infinity only when T = 0 and term end unknown
export type Recovery =
  | { kind: 'not_started' }
  | { kind: 'eligible' }
  | { kind: 'recoverable'; n: number }
  | { kind: 'unreachable'; maxReachableDisplay: string | null };                                  // null when term end unknown
export function recovery(t: Tally, h: Horizon, policy: AttendancePolicy): Recovery;
export interface TermEndForecast {
  remaining: number; remainingUnits: number;
  maxSkippable: number; minToAttend: number;     // counts of occurrences; with mixed units, skip smallest units first
  reachable: boolean; maxReachableDisplay: string; // floor(100·(A+R_u)/(H+R_u))
}
export function termEndForecast(t: Tally, h: Horizon, policy: AttendancePolicy): TermEndForecast | null; // null when term end unknown
export function copyBand(t: Tally, k: number | null, policy: AttendancePolicy): 'above' | 'close' | 'below' | 'not_started';
export function colorBand(t: Tally, k: number | null, policy: AttendancePolicy): 'good' | 'close' | 'below' | 'not_started';
export function simulate(t: Tally, sequence: readonly { units: Units; status: MarkStatus; excusedKind?: ExcusedKind }[], policy: AttendancePolicy): Tally[];
export const CLOSE_MARGIN_BP = 600;
```

Invalid input (negative or non-integer numbers, unsafe integers, attended > held, threshold outside
0–10,000) throws `RangeError` with a message starting `attendance:`. Under `half_up_integer`,
`displayPercent` returns the college-rounded integer `P` regardless of `decimals`. The color band's
"6 points above" test is the integer comparison `10,000·A ≥ (T + 600)·H`.

Standing composition (`subjectStanding`, `overallStanding`, `todayHeader`) lives in the same
package and returns structured data (band, numbers, copy key + params). Views render copy keys
via `packages/copy`; they never assemble attendance sentences themselves.

## 11. Required tests (in `packages/core`, run in CI on every PR)

1. Every row of §8 as a named test (G1–G17 in P0-06; G18 with the standing composition in P1-03).
2. Property tests (fast-check, ≥ 10,000 runs each): closed forms equal the simulation when u = 1
   and policy is exact; bunking never increases %, attending never decreases it; after k
   safe-now bunks the student is still eligible and after k + 1 is not (unless capped by R);
   recovery n is minimal; overall = Σ/Σ; the display guarantee in §5; Cancelled/unmarked
   invariance; marks dated on or before `asOf` never change the tally; tally never yields A > H.
3. Exhaustive boundary sweep: H ∈ [1, 300], A ∈ [0, H], T ∈ {5000, 6000, 6500, 6667, 7000,
   7500, 7550, 8000, 8500, 9000, 9500, 10000} → closed form == brute force (≈ 1M cases, < 10 s).
4. Occurrence math (`10` §3.2): holidays, Saturday classes, day-order shifting with holidays and
   overrides, parity, slot versions, exceptions, extra classes, time-zone traps.
