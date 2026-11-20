# Open questions and assumptions

Questions for Ohm come from `docs/spec/11-appendix.md` §2; the default applies until he answers.
Agents append rung-5 assumptions (`09` §4) to the second table.

## Answered
| # | Question | Answer | Decision |
|---|---|---|---|
| — | Which codebase is canonical? | Expo universal app; PR #1 stays a reference prototype | D-011 |
| — | Where does the code live? | Public repository `howwohmm/studex` | D-012 |

## Open (defaults apply)
| # | Question | Default | Needed by |
|---|---|---|---|
| Q1 | Name spelling: "Studex" or "StudEx" | Studex | P0-07 |
| Q2 | Google + Apple sign-in only at launch | Yes; email OTP after Ohm configures a sender | Ph2 |
| Q3 | Gemini paid tier; monthly AI budget and per-user cap | Gemini; AI flag-off outside staging until set | S-4 / Ph4 |
| Q4 | Pro pricing; billing pulled forward to Ph4? | Decide before Ph4 | Ph4 |
| Q5 | Tutor academic-integrity stance | Learning mode | Ph4 |
| Q6 | Attendance horizon fix (`05` §9) | Adopted | done in P0-06 |
| Q7 | Real RUAS rule (threshold, basis, rounding) | 75%, per subject, exact | P1-03 |
| Q8 | New copy approvals (`docs/status/new-copy.md`) | Drafts ship to beta only | G1 |
| Q9 | Minors' parental-consent method | Under-18 = guest mode only | G2 |
| Q10 | Apple Developer Program timing | iPhone testers use the PWA | G1 |
| Q11 | Play account type | Personal (12-tester closed test) | G1 |
| Q12 | API/worker host with a Mumbai region | Any container host with Mumbai | P0-11 |
| Q13 | Communities timing and escalation moderator | Ph5; Ohm escalates | Ph5 |
| Q14 | State holiday lists beyond Karnataka | Karnataka only | P1-19 |
| Q15 | More real fixtures with permission | Needed before Ph3/Ph4 gates | Ph1–Ph4 |
| Q16 | Analytics region | PostHog EU cloud | P1-27 |
| Q17 | Visual direction | Two directions presented at P0-08 | P0-08 |
| Q18 | License for this public repository's code | None (all rights reserved) until Ohm picks one | before outside contributions |

## Assumptions made by agents
| Date | Ticket | Assumption | Status |
|---|---|---|---|
| 2026-11-20 | P0-06 | `termEndForecast` returns null when nothing is held and nothing remains (no "0%" for 0/0) | adopted; spec §10 updated in the P0-06 PR |
