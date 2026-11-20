# 07 — Non-Functional Requirements, Privacy & Compliance

Legal statements here are engineering requirements derived from public sources, not legal
advice. Final legal positions (privacy policy, terms, minors' consent method, grievance
officer) are **human-only** and need counsel (`09` §8).

---

## 1. Performance (`NFR-PERF`)

**Reference devices** (keep one physical device per class for release QA; emulate in CI):
- **Low-end Android:** Android 12+, 3–4 GB RAM, entry octa-core (Helio G8x / Snapdragon 4xx
  class), 720p screen. This is the primary target.
- **Mid-tier Android:** 6–8 GB RAM, Snapdragon 6/7-series class, 1080p.
- **iPhone:** the oldest model supported by Expo SDK 57 (record it in ADR-002), plus a current Pro.

| ID | Budget | Target |
|---|---|---|
| NFR-PERF-001 | Cold start → Today interactive | ≤ 2.5 s p75 low-end · ≤ 1.5 s mid-tier · ≤ 1.2 s iPhone |
| NFR-PERF-002 | Mark tap → visual change · numeric animation done | ≤ 100 ms · ≤ 300 ms |
| NFR-PERF-003 | Scrolling Today/Subjects/Library | 60 fps target; ≤ 5% janky frames on low-end |
| NFR-PERF-004 | Memory during daily loop · 300-page PDF | ≤ 250 MB typical · no OOM on low-end |
| NFR-PERF-005 | App size (download) | Android ≤ 35 MB per ABI · iOS ≤ 60 MB (change only by ADR) |
| NFR-PERF-006 | Web | LCP ≤ 2.5 s (Lighthouse mobile, 4G); Today route JS ≤ 450 KB gzip |
| NFR-PERF-007 | API (server time) | CRUD/sync upload p95 ≤ 300 ms · search p75 ≤ 800 ms |
| NFR-PERF-008 | Tutor | First token ≤ 2.5 s p75 · full answer ≤ 12 s p75 |
| NFR-PERF-009 | Extraction | ≤ 10 s p75 per timetable page |
| NFR-PERF-010 | Document processing | 20-page text PDF ≤ 60 s p75 · 100-page scanned ≤ 5 min p75 |
| NFR-PERF-011 | Cross-device propagation | ≤ 5 s p75 when both devices online |
| NFR-PERF-012 | Data usage | Daily loop ≤ 1 MB/day; no document downloads on mobile data unless pinned or allowed in settings |
| NFR-PERF-013 | Battery | No background wake-ups beyond OS-scheduled notifications and opportunistic sync |

## 2. Reliability (`NFR-REL`)

| ID | Requirement |
|---|---|
| NFR-REL-001 | API availability 99.5% monthly in beta, 99.9% at general availability. |
| NFR-REL-002 | Zero loss of acknowledged writes (local commit before UI acknowledgment; server transactional). |
| NFR-REL-003 | Backups: daily (beta, RPO ≤ 24 h); point-in-time recovery at GA (RPO ≤ 1 h); RTO ≤ 4 h; restore drill once per phase. |
| NFR-REL-004 | AI, extraction or document-pipeline outages never degrade the daily loop; every server feature has a kill switch. |
| NFR-REL-005 | Crash-free sessions ≥ 99.5% beta, ≥ 99.8% GA; Android vitals below Play's bad-behavior thresholds (user-perceived crash rate < 1.09%, ANR rate < 0.47%). |
| NFR-REL-006 | Incident runbook (`docs/status/runbooks/`), in-app maintenance banner, forced-update flag. |

## 3. Security, privacy and AI

### 3.1 Security baseline (`NFR-SEC`)
| ID | Requirement |
|---|---|
| NFR-SEC-001 | API meets OWASP ASVS Level 2; mobile apps meet OWASP MASVS L1 (storage, crypto, auth, network, platform, code). |
| NFR-SEC-002 | TLS 1.2+ everywhere; HSTS on web; encryption at rest (provider default); private buckets only. |
| NFR-SEC-003 | Tokens only in Keychain/Keystore (native); no secrets in client bundles; secret scanning in CI. |
| NFR-SEC-004 | Dependency scanning (osv-scanner), SAST (CodeQL), DAST (OWASP ZAP baseline on staging) before every public release. |
| NFR-SEC-005 | External penetration test before public launch (arranged by Ohm). `security.txt` with a disclosure contact. |
| NFR-SEC-006 | PRs touching auth, RLS, storage policies, AI prompts or the deletion pipeline require the security checklist in the PR template and lead review. |
| NFR-SEC-007 | Logs and analytics never contain document text, notes, tutor content, names, emails or tokens. |

### 3.2 Privacy — DPDP Act 2023 and DPDP Rules 2025 (`NFR-PRIV`)
The Rules were notified on 13–14 November 2025 with an 18-month phase-in; most Data Fiduciary
obligations (notices, consent, rights, safeguards, breach reporting) apply from about **May
2027**. Studex MUST comply before its public launch regardless of date.

| ID | Requirement |
|---|---|
| NFR-PRIV-001 | **Notice:** standalone, plain-language, itemized (data → purpose), how to withdraw consent, exercise rights and complain to the Data Protection Board; English at launch, other scheduled languages planned (Hindi first). |
| NFR-PRIV-002 | **Consent:** specific, informed, affirmative, unbundled; withdrawal as easy as granting; consent records kept (M19 FR-SET-011). |
| NFR-PRIV-003 | **Minimization:** no date of birth, contacts, precise location, advertising IDs, or device identifiers beyond push token and install ID. |
| NFR-PRIV-004 | **Rights:** access, correction, erasure, grievance redressal, nomination (M19). Internal SLA: acknowledge grievances within 24 h, resolve within 7 days, always within the Rules' limit. |
| NFR-PRIV-005 | **Breach:** inform affected users without delay; report to the Data Protection Board, with the detailed report within 72 hours; runbook in `docs/status/runbooks/breach.md`. |
| NFR-PRIV-006 | **Processors:** Supabase, Google (AI), Sentry, PostHog, Expo, the container host — agreements handled by Ohm; listed in the privacy center. Primary data stored in Mumbai (ap-south-1). |
| NFR-PRIV-007 | **Logs:** security-relevant logs retained ≥ 1 year (Rules' safeguards); no personal content in them. |
| NFR-PRIV-008 | **Retention:** per §8. |

### 3.3 AI rules (`NFR-AI`)
| ID | Requirement |
|---|---|
| NFR-AI-001 | No Anthropic/Claude API in the product (CLAUDE.md). |
| NFR-AI-002 | Real user content goes only to paid, no-training provider tiers. Free tiers may be used only with synthetic or licensed fixtures in dev/CI. |
| NFR-AI-003 | AI output that changes user data is confirmed by the user first ("confirm is the product"). |
| NFR-AI-004 | AI-generated summaries, quizzes and flashcards carry an "AI-generated" label and citations. |
| NFR-AI-005 | Every prompt/model/retrieval change passes the feature's eval gate (`10` §7). |
| NFR-AI-006 | Per-feature kill switch, per-user daily cap and global daily budget (set by Ohm) with alerts at 80%. |
| NFR-AI-007 | Consent before first AI use (what is sent, to whom, not used for training); AI content reportable in-app. |
| NFR-AI-008 | User content is never written to observability tools; it lives only in the user's own records. |

### 3.4 Minors
Under-18 users: guest mode only until verifiable parental consent ships (FR-SET-009); after
that, no product analytics, no behavioral monitoring, no communities, nothing targeted. The
verification method (e.g. a verified guardian identity) is chosen by Ohm with counsel.

## 4. Accessibility (`NFR-A11Y`) — WCAG 2.2 AA
| ID | Requirement |
|---|---|
| NFR-A11Y-001 | Text contrast ≥ 4.5:1 (large text and UI components ≥ 3:1), light and dark. |
| NFR-A11Y-002 | Touch targets ≥ 44×44 pt (iOS) / 48×48 dp (Android); Attended and Bunked equal-size. |
| NFR-A11Y-003 | Every control has an accessible name/role/hint; attendance rows use the locked `a11y.subject.*` strings. |
| NFR-A11Y-004 | Font scaling to 200% without losing core information (numbers wrap, never truncate). |
| NFR-A11Y-005 | Color is never the only signal (status dot + text). |
| NFR-A11Y-006 | Reduce Motion respected; haptics can be turned off. |
| NFR-A11Y-007 | Web: full keyboard operation, visible focus, logical order; axe checks in Playwright with zero serious/critical violations. |
| NFR-A11Y-008 | Manual VoiceOver and TalkBack pass of the daily loop each release (checklist in `10` §10). |

## 5. Localization (`NFR-I18N`)
`en-IN` default; all strings in `packages/copy` with ICU plurals; dates via `Intl` in `en-IN`
("Fri, 20 Nov", "9:00 am"); Indian digit grouping for money (₹1,00,000); layouts tolerate 40%
text expansion; Hindi UI in Ph6 together with translated notices; AI replies follow the user's
language (FR-TUT-010).

## 6. Compatibility and store compliance (`NFR-COMP`)
- **Platforms:** iOS and Android minimums per Expo SDK 57 (record in ADR-002) and Play's current
  target-API requirement; web: last two versions of Chrome, Edge, Safari, Firefox, and Chrome
  on Android; phones 320–430 dp wide, tablets, desktop ≥ 1024 px.

**Apple App Store checklist**
- Sign in with Apple offered whenever Google sign-in is offered (Guideline 4.8).
- In-app account deletion (5.1.1(v)).
- Accurate privacy nutrition labels and privacy manifest (required-reason APIs declared).
- Factual permission purpose strings (camera, photos).
- Push notifications not used for marketing without opt-in (4.5.4).
- UGC safeguards before Ph5 ships: filtering, reporting, blocking, published contact (1.2).
- In-app purchase for digital subscriptions (3.1.1) in Ph6.
- Age rating questionnaire answered for AI and UGC features.

**Google Play checklist**
- Accurate Data safety form; privacy policy URL.
- Account deletion in-app **and** via a web URL.
- Current target API level.
- Photo and video permissions policy: use the system photo picker; do not request broad media
  permissions.
- AI-generated content policy: in-app reporting of offensive AI output (FR-TUT-009).
- UGC policy for Ph5.
- New personal developer accounts: closed test with ≥ 12 testers for ≥ 14 days before production.
- Play Billing for digital goods in Ph6.
- Android vitals within thresholds (NFR-REL-005).

## 7. Analytics (`NFR-ANL`)

Rules: consented users only (never minors); no PII, free text, document titles, subject names,
or note content; institution IDs only for catalog institutions with ≥ 50 users, else `other`;
events defined here and in `packages/contracts/analytics.ts` (typed); 13-month retention; an event
not in the dictionary fails CI lint.

**Global properties:** `app_version`, `platform`, `os_version`, `device_class` (low/mid/high),
`locale`, `is_guest`, `plan`, `term_week`, `cohort_week`.

| Event | Properties |
|---|---|
| `app_opened` | source (icon / widget / notification / deeplink) |
| `onboarding_step_viewed` · `onboarding_step_completed` · `onboarding_completed` | step · step, duration_ms · duration_ms, path (scan / photo / pdf / manual) |
| `extraction_started` · `extraction_finished` · `extraction_confirmed` | kind, input · kind, outcome (ok / flagged / rejected / failed), latency_ms, slots, flagged_count · edits_count, duration_ms |
| `number_revealed` | subjects_count |
| `class_marked` · `mark_undone` · `sweep_used` | status, source, minutes_after_end_bucket · source · count |
| `budget_viewed` · `forecast_opened` · `bunk_planner_used` | surface · — · days, safe |
| `notification_permission` · `notification_opened` | result · category |
| `account_created` · `claim_completed` | provider · records_bucket, choice |
| `task_created` · `task_completed` | type, has_due, via · on_time |
| `exam_created` | type |
| `document_upload_started` · `document_processed` | source, mime, size_bucket · outcome, duration_bucket, pages_bucket |
| `search_performed` | scope, results_bucket |
| `tutor_question_asked` · `tutor_answer_rated` · `tutor_answer_reported` | scope_type, mode · rating · reason |
| `quiz_generated` · `quiz_completed` · `cards_reviewed` | questions · score_bucket · count |
| `plan_generated` · `block_completed` · `block_skipped` | blocks_bucket, shortfall · — · — |
| `paywall_viewed` · `purchase_completed` | trigger · plan (Ph6) |
| `error_shown` | code, surface |

## 8. Data retention schedule

| Data | Retention |
|---|---|
| Account, academic data, documents, notes, threads | While the account is active; deleted on user request (≤ 30 days) |
| Inactive accounts (no sign-in for 3 years) | Notify 48 h before erasure, then erase |
| Extraction inputs | ≤ 24 h after the job (≤ 180 days with "Help improve scanning" consent) |
| Data exports | Download link 24 h; file deleted after 7 days |
| `ai_usage` ledger (no content) | 2 years |
| Security/audit logs (no content) | ≥ 1 year (max 2 years) |
| Analytics events | 13 months |
| Crash reports | 90 days |
| Deleted-account tombstone (hashed ID + time) | 3 years |
| "Recently deleted" items | 30 days |

## 9. Cost guardrails
Ohm sets the monthly AI budget and the per-user daily caps (`11` §2). The system enforces:
per-feature and global daily caps with automatic kill switches, alerts at 80%, a monthly cost
report in the admin console, and storage quotas per plan. Extraction cost is expected to be
negligible (VLM-VERDICT estimates ≈ ₹0.17 per student per semester); tutor usage is the main
variable cost and is quota-bound.
