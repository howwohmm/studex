# 11 — Appendix: Glossary, Open Questions, Risks, Decisions, Templates

## 1. Glossary

### 1.1 Indian academic terms
| Term | Meaning in Studex |
|---|---|
| **Bunk / Bunked** | Deliberately skipping a class. The LOCKED UI word for a missed class. |
| **75% rule** | Minimum attendance for exam eligibility (75% common; 80% or 85% at some institutions; per subject or overall). |
| **Detained / debarred / shortage list** | Barred from an exam for attendance shortage. |
| **Condonation** | Institutional relief for a shortfall within a band (often medical, sometimes with a fee). Why a higher "max possible %" still matters. |
| **OD (on duty)** | Official leave for college activities; usually counts as present → Excused `present`. |
| **ML (medical leave)** | Often excluded or condoned → Excused `excluded` by default. |
| **CIA / IA (internal assessment)** | Continuous internal evaluation (IA-1, IA-2, assignments, quizzes). |
| **Mid-sem / End-sem / SEE** | Mid-semester exam / semester-end examination. |
| **CBCS** | Choice Based Credit System (credit-weighted grading, 10-point scales). |
| **SGPA / CGPA** | Semester / cumulative grade point average. |
| **Backlog / arrear / supplementary** | A failed subject and its re-examination. |
| **Contact hour** | A timetable hour (e.g. mentoring) that usually does not count for attendance; excluded until marked. |
| **Batch** | Lab/tutorial subgroup of a section (B1/B2, A1/A2); only your batch counts. |
| **Section** | A class cohort within a program/year (e.g. CSE-A). |
| **Elective** | A chosen subject; timetable cells may list options. |
| **Slot (FFCS)** | Slot code in slot-based timetables (e.g. VIT's A1, TA1, L31). |
| **Day order** | A rotating N-day schedule (Day 1…Day 6) that advances on working days. |
| **CR** | Class representative; natural moderator for a class space. |
| **PYQ** | Previous-year question papers. |
| **aSc** | aSc Timetables, a common generator of dense printed timetables. |
| **Lab record** | Lab journal submitted for evaluation (a task type). |
| **Viva** | Oral examination. |
| **Fest / mass bunk** | College festival / the whole class skipping together — common bunk-planner use cases. |

### 1.2 Studex terms
| Term | Meaning |
|---|---|
| Occurrence / occurrence key | One scheduled class on one date · `{slotId}:{YYYY-MM-DD}` or `x:{exceptionId}` |
| Unresolved | A past occurrence with no mark (counts nowhere; prompts the student) |
| Baseline | Prior attended/held entered at catch-up (or via CSV / reconciliation) |
| Safe-now budget (k) | Bunks possible right now while staying eligible after each |
| Recovery (n) | Consecutive classes to attend to become eligible |
| Term-end forecast | What finishing the semester at the threshold requires |
| Copy band / color band | Sentence choice (ABOVE / CLOSE / BELOW) vs tint (good / close / below) |
| Confirm UI | The editable review surface for any machine-made output |
| Guest mode / claim | Account-free local use / uploading guest data at sign-in |
| Break Mode | Vacation state that freezes streaks and notifications |
| Semester receipt | Shareable end-of-term summary card |
| Gate | Phase exit criteria (`08` §1) or quality threshold (`10`) |

## 2. Open questions for Ohm (defaults apply until answered)

| # | Question | Default if unanswered | Needed by |
|---|---|---|---|
| Q1 | Canonical name spelling: "Studex" (this spec) or "StudEx" (v1 copy)? | Studex | P0-07 |
| Q2 | Launch with Google + Apple sign-in only (no email)? | Yes; email OTP later, after you configure a sender | Ph2 |
| Q3 | Gemini paid tier as the default AI provider; monthly AI budget and per-user daily cap? | Gemini; AI features stay flag-off outside staging until budget is set | S-4 / Ph4 |
| Q4 | Pro pricing and contents; pull billing forward to Ph4? | Decide before Ph4; small free quotas meanwhile | Ph4 |
| Q5 | Tutor academic-integrity stance (FR-TUT-012) | "Learning mode" as written | Ph4 |
| Q6 | Adopt the attendance horizon fix (`05` §9 D1/D2: safe-now primary, term-end in forecast)? | Adopt | P0-06 |
| Q7 | Real RUAS attendance rule (threshold, per subject vs overall, rounding)? | 75%, per subject, exact | P1-03 |
| Q8 | Approve new copy (per-subject header, notification pre-prompt, not-started line, signed-in privacy lines) | Drafts ship to beta only | G1 |
| Q9 | Minors: parental-consent verification method | Under-18 = guest mode only | G2 |
| Q10 | Apple Developer Program enrollment timing | iPhone testers use the PWA until enrolled | G1 |
| Q11 | Google Play account: personal (12-tester closed test) or organization | Personal | G1 |
| Q12 | API/worker host with a Mumbai region | Any container host with a Mumbai region | P0-11 |
| Q13 | Communities timing and escalation moderator | Ph5; Ohm escalates | Ph5 |
| Q14 | State holiday lists beyond Karnataka for the beta | Karnataka only | P1-19 |
| Q15 | More real fixtures with permission (other RUAS branches/years, phone photos, syllabi, PYQs) | Needed before the Ph3/Ph4 gates | Ph1–Ph4 |
| Q16 | Analytics: PostHog EU cloud or self-hosted | PostHog EU cloud | P1-27 |
| Q17 | Visual direction for the cross-platform design | Lead presents two directions (screenshots) at P0-08 for your pick | P0-08 |

## 3. Risk register

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | Extraction fails on real phone photos | High / High | Gate, validation layer, confirm UI, second opinion, manual path, more fixtures |
| R2 | Sync bugs lose or corrupt data | Med / High | S-1, sync matrix, append-only audit, Recently deleted, durability rules |
| R3 | Full-product scope dilutes daily-loop quality | High / High | Phase gates, founder dogfood gate, lead guards the vision |
| R4 | AI cost overrun | Med / Med | Quotas, kill switches, budgets, cheap model classes |
| R5 | DPDP obligations (~May 2027) not met | Med / High | Ph2 privacy epics, counsel review, retention schedule |
| R6 | Distribution friction (iOS paid account, Play 12-tester rule) | High / Med | PWA, early closed testing, EAS internal builds |
| R7 | Slow on low-end Android | Med / High | Budgets, reference devices, perf job, local-first |
| R8 | Agent drift and inconsistent implementations | High / High | Contract, ownership map, ADRs, lead review, FR coverage report |
| R9 | Sessions die mid-work | High / Med | Checkpoint commits, progress logs, small PRs |
| R10 | Copyright/UGC liability in spaces | Med / Med | Rules, takedown flow, IT Rules compliance, Ph5 timing |
| R11 | WhatsApp export format changes | Med / Low | Tolerant parser, sample exports in tests, manual import |
| R12 | Wrong holiday data | Med / Med | Official sources, Ohm verification, user edits win |
| R13 | Academic-integrity controversy | Low / Med | Learning mode, no moralizing, public policy |
| R14 | Vendor lock-in | Low / Med | Portable Postgres, fallback sync protocol, provider registry |

## 4. Decision log (decisions taken in this spec, 2026-11-20)

| ID | Decision | Owner | Status |
|---|---|---|---|
| D-001 | One Expo Router universal app for iOS, Android, Web (ADR-002) | Spec | Accepted |
| D-002 | Supabase in ap-south-1 + Hono API + Python worker (ADR-003/004/007) | Spec | Accepted |
| D-003 | Gemini paid tier as default AI provider; no Anthropic (ADR-008) | Spec | Accepted (Q3 confirms budget) |
| D-004 | Attendance: safe-now budget and consecutive recovery as primary; term-end in forecast; floor display; no % at zero held (`05` §9) | Spec | Accepted (Q6) |
| D-005 | Guest-first: no login wall before the first number (FR-AUTH-001) | Spec | Accepted |
| D-006 | Google + Apple sign-in at launch; email human-gated (FR-AUTH-002/003) | Spec | Accepted (Q2) |
| D-007 | No push alerts about thresholds; replaced by pull surfaces (FR-ATT-011) | Spec | Accepted |
| D-008 | Onboarding order: value first, profile after the number (M02) | Spec | Accepted |
| D-009 | Confirm UI for every machine-made data change (principle 2) | Spec | Accepted |
| D-010 | Per-subject eligibility by default with honest mixed-state header (`05` §6.7) | Spec | Accepted (Q7, Q8) |
| D-011 | Expo universal app is canonical; PR #1 (React/Vite web workspace) is a reference prototype, not merged (2026-11-20) | Ohm | Accepted |
| D-012 | Code lives in the public repository `howwohmm/studex` (2026-11-20) | Ohm | Accepted |
| D-013 | Personal agent rules stay local (`CLAUDE.local.md`, `.claude/settings.local.json`); public rule files are scrubbed (2026-11-20) | Ohm | Accepted |
| D-014 | Real timetable fixtures and raw provider outputs stay private; CI reads them from a private source (2026-11-20) | Lead | Accepted |

Append new rows with date, decision, owner and status; link the ADR when one exists.

## 5. ADR template (`docs/adr/ADR-NNN-<slug>.md`)

```markdown
# ADR-NNN: <title>
- Status: Proposed | Accepted | Superseded by ADR-XXX
- Date: YYYY-MM-DD · Deciders: <lead, Ohm>
- Spec links: <FR/NFR IDs, sections>

## Context
## Decision
## Evidence (spikes, benchmarks, numbers, links to artifacts)
## Consequences (positive, negative, follow-ups)
## Fallback / exit plan
```

## 6. Prior work index

| Material | Location | Available to cloud agents |
|---|---|---|
| Shipped iOS v1.0 spec chain, locked copy, psychology, engine + tests | `docs/spec/reference/v1/` | Yes |
| Extraction benchmarks, fixtures, ground truth, scorers, findings | `extraction-lab/` | Yes (after Ohm commits it) |
| Full v1.0 Xcode project, QA screenshots, deploy kit | `~/projects/studex/studex-hub/studex-ios/` | No — ask Ohm |
| Every earlier attempt, decks, waitlist (studex.ohm.quest), security audits | `~/projects/studex/studex-hub/studex-vault/` | No — ask Ohm |
| WhatsApp group file ingestion prototype (Beeper Desktop API) | `~/projects/studex/studex-hub/beeper-group-ingest/` | No — design notes summarized in FR-KNO-001 |
