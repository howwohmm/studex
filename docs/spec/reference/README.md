# reference/ — prior work, copied for agents that cannot see Ohm's machine

Provenance: copied on 2026-11-20 from `~/projects/studex/studex-hub/studex-ios` (the shipped native
SwiftUI v1.0, tagged 2026-07-08, 56 tests green, RUAS extraction keyF1 0.960).

**Status: reference, not law.** The master spec (`docs/spec/`) adopts specific parts explicitly:

| Adopted part | Where it is adopted | Notes |
|---|---|---|
| `briefs/psych.md` (behavioral rules) | 01-product §5, §9; M03, M06, M15 | Adopted wholesale unless a requirement says otherwise. |
| `briefs/copy.md` (locked strings) | 01-product §9 | Locked strings are ported verbatim into `packages/copy`. iOS-only strings (Siri, TipKit) are adapted; Claude-key strings are retired. |
| Attendance semantics (four marking states, unmarked/cancelled excluded) | 05-attendance-math | **Horizon, rounding and zero-held behavior changed** (see 05 §9 "v1.0 defects not to carry over"). |
| `briefs/extract.md` §7 (keyF1 acceptance definition) | M17, 10-test-strategy | The RUAS gate (keyF1 ≥ 0.90, zero wrong batches) is inherited unchanged. |
| `domain/*.swift`, `tests/*.swift` | 05-attendance-math, 10-test-strategy | Port the test cases; do not port the defects listed in 05 §9. |

Not adopted (no longer governs): no-backend purity, Apple-native-only, system-components-only,
systemBlue-only tint, 3-tab layout, the optional Claude refiner.
