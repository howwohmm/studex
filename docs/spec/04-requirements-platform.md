# 04 — Functional Requirements: Platform (M15, M16, M18–M23)

---

## M15 — Notifications & Reminders (`NTF`)

**Objective.** Timely information at the right moment, never judgment, never noise.
**Phase.** Ph1 (daily pair, permissions, scheduling) · Ph2+ (categories). **Owners.** WS-APP,
WS-DATA (push).

### Requirements

- **FR-NTF-001 (P0, Ph1) Policy.** Notifications carry information, never judgment. They never
  mention attendance status or thresholds, streaks, or being behind on a plan. No marketing
  unless the user opts in.
- **FR-NTF-002 (P0, Ph1) First class.** 20 min before the first class of each class day: "First
  up: {subject} at {time}, {room}." (room omitted when unknown). Default on.
- **FR-NTF-003 (P0, Ph1) End-of-day summary.** 30 min after the last class, only if today has
  unmarked occurrences: "{n} classes from today left to mark." Tapping opens Today with the
  end-of-day sweep focused (no blind bulk action from the lock screen). Automatically cancelled
  once today is fully marked. Default on.
- **FR-NTF-004 (P1, Ph1) Per-class reminders (opt-in, off by default).** "{subject} in {minutes}
  min" / "{time} · Room {room}" with actions Attended / Bunked (marks directly; undo in app).
- **FR-NTF-005 (P0, Ph2) Tasks** per FR-TASK-006. **FR-NTF-006 (P0, Ph2) Exams** per
  FR-EXM-003. **FR-NTF-007 (P1, Ph4) Study block start** (opt-in). **FR-NTF-008 (P0, Ph3)
  Document ready** (only if processing took > 30 s and the app is backgrounded). 
  **FR-NTF-009 (P1, Ph5) Class spaces** (opt-in per space).
- **FR-NTF-010 (P0, Ph1) Silence rules.** Nothing during a class occurrence; quiet hours default
  23:00–07:00; holidays, breaks and exam-day windows silence class notifications; at most 4
  system-initiated notifications per day (reminders the user scheduled do not count); multiple
  notifications of one category collapse into one.
- **FR-NTF-011 (P0, Ph1) Permission.** In-context pre-permission sheet before the OS prompt
  (after the onboarding commit or the first toggle). Proposed copy (**new copy — needs Ohm's
  approval**; copy.md's per-class pre-prompt no longer matches the policy): "Before your first
  class, and once after your last if anything's unmarked. No streak nags, no marketing. Ever."
- **FR-NTF-012 (P0, Ph1) Local scheduling.** Schedule-derived notifications are local and cover a
  rolling 7-day window (iOS caps pending local notifications at 64). Reschedule on: app open,
  timetable/holiday/break change, marking (cancel today's summary), timezone change, settings
  change.
- **FR-NTF-013 (P0, Ph1) Channels and deep links.** Android channels per category (Classes,
  Reminders, Exams, Study, Library, Spaces, Account); iOS categories with actions; every
  notification deep-links to the exact screen.
- **FR-NTF-014 (P0, Ph2) Remote push.** Device registration (token, platform, app version),
  refresh, invalid-token cleanup. Lock-screen content is minimal by default (no document names or
  personal details unless the user turns on detailed previews).
- **FR-NTF-015 (P1, Ph2) Inbox.** In-app list of the last 30 days of notifications.

### Acceptance criteria
Unit tests for the rolling window, cancellation, quiet hours, class silence and the daily cap · a
template test asserts no notification text mentions attendance status, thresholds or streaks ·
manual QA on iOS and Android (lock screen, actions, deep links) recorded with screenshots.

---

## M16 — Search (`SRCH`)

**Objective.** Find anything in the student's academic life in seconds.
**Phase.** Ph2 (entities) · Ph3 (documents). **Owners.** WS-DOCS (server), WS-APP (client).

### Requirements

- **FR-SRCH-001 (P0) Entry.** Search field on Subjects, Plan and Library; a global search
  screen; Cmd/Ctrl+K palette on web.
- **FR-SRCH-002 (P0) Scope.** Subjects, topics, tasks, exams, notes, events, documents
  (filename, content, semantic), tutor threads, flashcards.
- **FR-SRCH-003 (P0) Local + server.** Synced entities searched locally (SQLite FTS5), also
  offline. Document content and semantic search on the server. Results merged and grouped by
  type with counts.
- **FR-SRCH-004 (P0) Ranking.** Per-type relevance plus recency. Documents: full-text rank and
  vector similarity fused by reciprocal rank fusion (k = 60).
- **FR-SRCH-005 (P0) Speed.** Local results ≤ 100 ms after a 150 ms debounce; server results
  p75 ≤ 800 ms.
- **FR-SRCH-006 (P1) History.** Recent searches (local only, clearable) and suggestions.
- **FR-SRCH-007 (P1) Query understanding.** "eigenvalue notes from unit 2" → filters extracted by
  rules first (LLM optional, P2).

### Acceptance criteria
Search eval set of ≥ 40 queries over fixture data: top-5 hit rate ≥ 0.90 for documents and
≥ 0.95 for entities (`10` §6).

---

## M18 — Class Spaces & Communities (`COM`)

**Objective.** Share what classmates already share in WhatsApp — timetables, files, announcements —
with structure, without exposing anyone's private data.
**Phase.** Ph5. **Owners.** WS-APP, WS-DATA, WS-DOCS.

### Requirements

- **FR-COM-001 (P0) Class space.** Private group for a section (institution, program,
  department, year, section, term label). Creator becomes `space_moderator`. Join by invite link,
  QR or code; optional approval; default cap 200 members; leave any time.
- **FR-COM-002 (P0) Shared timetable template.** A moderator publishes slots (never attendance).
  Members can onboard from it (FR-ONB-012) and receive updates as "Timetable updated by {name}: 2
  changes — review" → diff → apply from a date (versioned). Never auto-applied.
- **FR-COM-003 (P0) Shared resources.** Members share library files into the space (a copy, not
  a link to the private document; the uploader can unshare). Organized per catalog-linked
  subject with tags and upvotes; "Save to my library". Reuses the processing pipeline; duplicates
  collapse to one canonical copy by hash.
- **FR-COM-004 (P0) Announcements.** Moderators post short announcements (text + attachment);
  members notified per their space setting.
- **FR-COM-005 (P1) Q&A.** Questions and answers per subject, accepted answer. P2: tutor answers
  from space resources with citations (scope = space).
- **FR-COM-006 (P0) Moderation.** Report content or users with reasons; block users (hides their
  content for the blocker); moderators remove or hide; automatic filters (profanity lists for
  English/Hindi/Hinglish, NSFW image classification on upload, spam rate limits); escalation to
  the Studex moderation queue (M20); repeat-offender bans.
- **FR-COM-007 (P0) Legal.** Intermediary due diligence under the IT Rules, 2021: published
  community rules and privacy policy, grievance officer contact in app, acknowledgment and
  resolution within the prescribed timelines, handling of lawful takedown orders, a copyright
  complaint process. Uploaders attest they have the right to share. No paid or copyrighted
  textbooks (rules plus takedown). Final legal text is human-only (`09` §8).
- **FR-COM-008 (P0) Privacy.** Attendance, grades, notes and private files are never visible to
  a space. Member profile = display name, avatar, optional role (e.g. CR). No public profiles.
  Leaving removes membership; shared files stay unless the uploader removes them (stated at
  leave time).
- **FR-COM-009 (P0) Eligibility.** Account required; 18+ or verified parental consent
  (FR-SET-009); not available to guests.
- **FR-COM-010 (P0) Anti-patterns.** No leaderboards, no attendance comparisons, no public feeds,
  no direct messages in v1.
- **FR-COM-011 (P2, HUMAN-GATED) Institution-verified spaces.** Verification by institutional
  email requires an email sender → human-gated (`09` §8).

### Acceptance criteria
Membership RLS tests · moderation E2E (report → queue → action → reporter informed in app) ·
copyright takedown runbook exists · rate-limit and spam tests.

---

## M19 — Settings, Privacy & Data Rights (`SET`)

**Objective.** Full control over data and behavior; DPDP-aligned rights that actually work.
**Phase.** Ph1 (local settings) · Ph2 (account, privacy center, rights). **Owners.** WS-APP, WS-DATA.

### Requirements

- **FR-SET-001 (P0, Ph1) Settings.** Semester (dates, holidays, breaks, schedule mode, batch) ·
  Attendance (threshold, rounding, eligibility basis, Excused policy, units, contact hours) ·
  Timetable (edit, re-scan) · Notifications (per category, lead times, quiet hours) · Appearance
  (system/light/dark, haptics on/off; OS Reduce Motion respected) · Data (export, erase) · About
  (version, open-source licenses).
- **FR-SET-002 (P0, Ph2) Account.** Profile, sign-in methods, sessions, sign out, delete account.
- **FR-SET-003 (P0, Ph2) Privacy center.** Plain-language summary of what is stored on the device
  vs in the cloud; list of processors; consent toggles, each asked with equal-weight Allow / Don't
  allow and off until chosen: product analytics; AI processing (before first AI use: what is sent
  to AI providers and that it is not used for training); "Help improve scanning" (FR-EXT-007).
  Crash reporting is part of the service, PII-scrubbed and disclosed.
- **FR-SET-004 (P0) Export.** Guests (Ph1): local JSON export via the share sheet. Signed-in
  (Ph2): async job → in-app download of a ZIP (JSON of all records + original files) via a signed
  URL valid 24 h; push when ready.
- **FR-SET-005 (P0, Ph1) Erase everything (this device).** Guests: wipes device data.
  Signed-in: wipes the device copy only, explains cloud data remains, and links to Delete account.
- **FR-SET-006 (P0, Ph2) Delete account.** In the app and on a web page (Google Play requires a
  web deletion path). Confirmation lists what is deleted. Immediate sign-out everywhere;
  permanent deletion within 30 days; cancellable by signing in within 7 days (stated clearly).
  Covers database rows, storage objects, embeddings, analytics person data, crash-report user
  data and push tokens; a minimal tombstone (hashed user ID, deletion time) is retained for
  audit. Class-space contributions: delete (default) or anonymize, user's choice.
- **FR-SET-007 (P0, Ph2) Rights.** Access (export), correction (edit in app), erasure (delete),
  grievance (in-app form → support queue with the SLA in `07` §3), nomination (P1: nominate a
  person to exercise rights on death or incapacity).
- **FR-SET-008 (P0, Ph2) Legal surfaces.** Privacy policy, terms, community rules (Ph5),
  grievance officer contact, licenses. Final text is human-only; agents ship surfaces with
  placeholder text marked "DRAFT — not legal advice".
- **FR-SET-009 (P0, before public launch) Verifiable parental consent.** For under-18 users per
  the DPDP Rules: parent/guardian identity and age verification (method chosen with counsel),
  consent record, withdrawal. Minors get no product analytics, no behavioral monitoring, no
  communities, and nothing targeted.
- **FR-SET-010 (P1, Ph2) App lock.** Optional biometric/PIN lock (local).
- **FR-SET-011 (P0, Ph2) Consent records.** Purpose, notice version, timestamp, channel;
  withdrawing is as easy as granting (same screen).

### Acceptance criteria
Export contains every user-owned table (schema-driven test) · deletion test proves removal from
every table, bucket, vector index and third-party processor API call made · consent changes take
effect immediately (analytics stops on withdrawal; test) · minors' accounts cannot emit
analytics events (test).

---

## M20 — Admin, Support & Institution Console (`ADM`)

**Objective.** Operate Studex safely: support without snooping, moderation, catalog curation,
cost control.
**Phase.** Ph2 (support basics, flags, catalog) · Ph3–Ph5 (pipeline, moderation, institutions).
**Owners.** WS-DATA, WS-PLATFORM.

### Requirements

- **FR-ADM-001 (P0, Ph2) Separate admin app.** `apps/admin`, web only, never bundled with the
  student app. Role + TOTP MFA required. Every action audit-logged (actor, action, target,
  before/after summary, reason, time). Optional IP allowlist.
- **FR-ADM-002 (P0, Ph2) Support lookup.** By user ID or exact email. Metadata only: created,
  plan, devices, app versions, sync health, recent errors, quotas, consents. No content
  (documents, notes, tutor messages, attendance details).
- **FR-ADM-003 (P1, Ph2) Diagnostic access.** User-granted, 24 h, scoped to a ticket (e.g. "sync
  state + timetable"), auto-expiring, audit-logged.
- **FR-ADM-004 (P0, Ph2) Feedback inbox.** In-app "Send feedback / Report a bug" (text, optional
  screenshot, optional diagnostics bundle) → ticket queue; replies appear in the app's support
  inbox. No email.
- **FR-ADM-005 (P0, Ph4) Moderation queue.** AI-output reports, community reports (Ph5),
  consented extraction samples; actions require a reason.
- **FR-ADM-006 (P0, Ph2) Feature flags and kill switches.** Per feature (every AI feature and
  extraction has one), plan, % rollout, platform and app version; audit-logged; clients refresh at
  start and every 30 min.
- **FR-ADM-007 (P0, Ph4) AI cost and quality.** Spend by feature/model/day, per-user
  distribution, quota hits, eval scores over time, thumbs ratio, report rate.
- **FR-ADM-008 (P0, Ph3) Pipeline monitor.** Queue depth, latency percentiles, failure reasons,
  retry and dead-letter actions per job (no content shown).
- **FR-ADM-009 (P0, Ph2) Institution catalog.** Institutions, campuses, programs, departments:
  dedupe/merge, aliases, verification, review of user-submitted entries; curation of holiday
  lists, academic calendars, grade-scale and assessment templates.
- **FR-ADM-010 (P1, Ph5) Institution admin portal.** Verified staff manage official data for
  their institution only (calendar, holidays, course catalog, official timetable templates).
  Never any student data.
- **FR-ADM-011 (P0, Ph2) Incident tooling.** Maintenance banner flag, forced-update flag
  (minimum supported app version), status data for a status page.

### Acceptance criteria
Admin endpoints reject non-admin and non-MFA sessions (tests) · every admin mutation produces an
audit row (test) · support views provably cannot fetch content tables (RLS + endpoint tests).

---

## M21 — Monetization & Entitlements (`BIL`)

**Objective.** Sustainable revenue without compromising the free daily loop or trust.
**Phase.** Ph2 (entitlements, quotas) · Ph6 (payments). **Owners.** WS-DATA, WS-APP.

### Requirements

- **FR-BIL-001 (P0, Ph2) Entitlements.** Server-authoritative plan per user (free / pro /
  trial) and quotas (AI messages/day, long AI actions/day, storage bytes, documents
  processed/month, quizzes/day, extractions/day), enforced in the API, shown in the client,
  configurable without a deploy.
- **FR-BIL-002 (P0) Never paywalled.** Attendance loop, timetable, tasks, calendar, notes, data
  export, account deletion, safety features.
- **FR-BIL-003 (P0, Ph6) Plans and pricing.** Set by Ohm (the old pitch's ₹250/month is
  unvalidated). INR including GST; monthly and per-semester plans; 7-day trial.
- **FR-BIL-004 (P0, Ph6) Purchases.** Store billing on iOS/Android for in-app digital
  subscriptions; web via an Indian payment provider with UPI (chosen by Ohm); cross-platform
  entitlement sync (ADR-019); restore purchases; server-side receipt validation; refunds per store
  policy; easy cancellation.
- **FR-BIL-005 (P0, Ph6) Paywall UX.** Only at value moments (quota reached, Pro feature tapped);
  no pre-checked upsells, fake timers or hidden renewal terms; always dismissible.
- **FR-BIL-006 (P2, Ph6) Referrals.** Pro days as rewards, with abuse controls.
- **FR-BIL-007 (P2) Institution licensing.** Out of scope until Ohm decides.

---

## M22 — Platform Integrations (`PLT`)

**Objective.** Meet students where the habit already is: lock screen, home screen, share sheet,
browser.
**Phase.** Ph1 (deep links, PWA, widgets P1) · Ph2–Ph4. **Owners.** WS-APP.

### Requirements

- **FR-PLT-001 (P1, Ph1) iOS widgets.** Home screen small/medium (number + verdict + next class);
  lock screen accessory ("Next: Maths · 9:00 · Room 204"); tap-to-mark via App Intents
  (interactive widgets); shared data through an App Group; refreshed on mark and timetable change.
  Requires the paid Apple Developer account (README §4).
- **FR-PLT-002 (P1, Ph1) Android widget.** Next class + budget + mark actions; updates on change.
- **FR-PLT-003 (P0, Ph3) Share target.** Receive PDFs, images, Office files and WhatsApp export
  ZIPs (iOS share extension; Android intent filters) → M08 import.
- **FR-PLT-004 (P1, Ph2) App shortcuts.** Long-press icon: Mark attendance, Scan, Add task, Ask tutor.
- **FR-PLT-005 (P2, Ph4) Voice shortcuts.** iOS App Shortcuts ("What's my number", "Can I bunk
  {subject}", "What's next") with the locked spoken copy; Android App Actions P2.
- **FR-PLT-006 (P0, Ph1) Deep links.** `studex://` plus universal/app links: `/today`,
  `/subjects/:id`, `/library/:docId?page=N`, `/tutor/:threadId`, `/plan/:date`. Every
  notification and citation uses them.
- **FR-PLT-007 (P0, Ph1) PWA.** Installable web app (manifest, icons, service worker for the
  static shell). iPhone users without TestFlight can use the daily loop on the web (online-first,
  M23).
- **FR-PLT-008 (P1, Ph2) Keyboard shortcuts (web).** `g t` Today, `g s` Subjects, `g p` Plan,
  `g l` Library, `g a` Tutor, `/` search, `c` create, `?` help.
- **FR-PLT-009 (P0) Sensory consistency.** Haptics map and Reduce Motion per `01` §10.

---

## M23 — Offline & Sync (`SYNC`)

**Objective.** The daily loop never waits for the network, and no change is ever lost.
**Phase.** Ph1 (local-first device DB) · Ph2 (cloud sync). **Owners.** WS-DATA, WS-APP.
Architecture in `06` §6.

### Requirements

- **FR-SYNC-001 (P0) Offline matrix.** Mobile offline: Today, marking, subjects, timetable,
  attendance calendar, settings (Ph1); tasks, notes, exams, events, flashcard reviews,
  already-generated quizzes, pinned documents (Ph2–Ph4). Online-only: tutor, generation,
  document processing, document-content search, communities, account operations.
- **FR-SYNC-002 (P0, Ph2) Status.** Subtle indicator (Profile, optional avatar dot): Synced ·
  Syncing · Offline — "Changes saved on this phone" · Error — "Couldn't sync. Retrying." (with
  details).
- **FR-SYNC-003 (P0) Durability.** A local write commits to SQLite before the UI acknowledges it;
  queued uploads survive app kill and reboot; retries back off exponentially (1 s → 5 min, with
  jitter); upload operations are idempotent.
- **FR-SYNC-004 (P0, Ph2) Conflicts.** Per `06` §6.3: attendance marks are keyed by occurrence,
  last writer wins by hybrid logical clock, and the losing value is kept in the audit log; tasks
  and events use field-level last-writer-wins; notes use document-level last-writer-wins plus a
  "(conflict copy)" when both sides edited offline in the same window; deletes win, and deleted
  items stay recoverable for 30 days in "Recently deleted".
- **FR-SYNC-005 (P0, Ph2) Convergence.** Two devices converge to identical state within one sync
  cycle after both are online.
- **FR-SYNC-006 (P0, Ph2) Web.** Same account on phone, web and tablet. Web is online-first with
  optimistic updates unless spike S-1 proves local-first web viable.
- **FR-SYNC-007 (P0, Ph1) Device migrations.** Versioned, forward-only, tested from every
  released schema version; never lose data; on failure, a recovery screen offers export.
- **FR-SYNC-008 (P0, Ph2) Recently deleted.** 30-day bin for subjects, tasks, notes, documents
  (document storage purged after 30 days).
- **FR-SYNC-009 (P1, Ph3) Device storage.** Show local database and cache size; clear cache.
- **FR-SYNC-010 (P2) Background sync.** Best-effort OS background tasks.

### Acceptance criteria
Sync test matrix in `10` §8 passes, including: offline mark → kill → reopen → reconnect → server
row + audit event; concurrent offline edits on two devices converge; deletes propagate; every
historical device schema migrates; initial sync of a heavy user (5,000 rows) completes in ≤ 15 s
on 4G on the reference mid-tier Android device.
