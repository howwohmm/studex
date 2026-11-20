# 06 — Technical Architecture & Engineering Scope

Decisions here are **settled** unless marked *pending spike*. A pending decision has a named
spike (§17) with acceptance criteria and a named fallback; agents run the spike, record evidence
in the ADR, and proceed with the default or the fallback — they do not invent a third option.
Any other deviation needs a new ADR approved by the lead and Ohm.

**Expo has changed:** read the versioned docs for **SDK 57** (https://docs.expo.dev/versions/v57.0.0/)
before writing app code (`AGENTS.md`).

---

## 1. System overview

```
 ┌───────────── Clients (one Expo Router codebase: apps/app) ─────────────┐
 │ iOS · Android (React Native 0.86, New Arch, Hermes, React Compiler)     │
 │ Web/PWA (react-native-web)                                              │
 │  ├─ Local SQLite (device) ← sync engine →─────────────┐                 │
 │  ├─ packages/core (attendance, occurrences, planner) │                 │
 │  └─ Widgets / share extension / notifications        │                 │
 └──────────────────────────────┬───────────────────────┼─────────────────┘
                                │ HTTPS (JWT)           │ sync stream
                     ┌──────────▼──────────┐   ┌────────▼────────┐
                     │ apps/api (Hono, TS) │   │ Sync service    │
                     │ REST /v1 + SSE      │   │ (PowerSync)     │
                     └──┬──────┬──────┬────┘   └────────┬────────┘
                        │      │      │                 │
        ┌───────────────▼┐  ┌──▼──────▼───────┐  ┌──────▼─────────────────────┐
        │ AI gateway     │  │ Supabase        │  │ apps/worker-docs (Python)  │
        │ packages/ai →  │  │ Postgres+pgvector│◄─┤ Docling, LibreOffice, OCR  │
        │ Gemini (paid)  │  │ Auth · Storage  │  │ consumes pgmq jobs         │
        └────────────────┘  │ pgmq · pg_cron  │  └────────────────────────────┘
                            └─────────────────┘   Region: ap-south-1 (Mumbai)
```

## 2. Decision register (ADRs)

Each ADR gets a file `docs/adr/ADR-NNN-<slug>.md` (template in `11` §5) in Phase 0. Summary:

| ADR | Decision | Status | Rationale / fallback |
|---|---|---|---|
| 001 | **Monorepo** in the existing `studex` repo: pnpm workspaces + Turborepo; Expo app moves to `apps/app`. | Accepted | One repo for agents; shared types. pnpm `minimumReleaseAge` = 7 days (supply-chain policy). |
| 002 | **One universal client**: Expo SDK 57 + Expo Router for iOS, Android and Web; TypeScript strict; New Architecture; React Compiler on. | Accepted | Existing scaffold; one UI codebase; web via react-native-web. Platform files (`*.web.tsx`, `*.native.tsx`) where needed. |
| 003 | **Backend platform: Supabase** (Postgres + pgvector, Auth, Storage, Queues/pgmq, pg_cron), region **ap-south-1**. Separate projects per environment. | Accepted | Few moving parts, RLS, Mumbai region, Postgres does DB + vectors + queue + cron. Domain logic stays portable (no proprietary features beyond Auth/Storage/RLS). |
| 004 | **API: TypeScript Hono service** (`apps/api`) on Node LTS in a container (Mumbai region). zod contracts in `packages/contracts`, OpenAPI generated. All writes with business rules go through it. | Accepted | Typed, testable single write path; runs anywhere. |
| 005 | **Local-first sync: PowerSync** (SQLite on device; per-user sync buckets; uploads → `POST /v1/sync/upload`). | *Pending S-1* | Proven Postgres↔SQLite sync with RN + web SDKs. Fallback: the custom protocol in §6.4. |
| 006 | **Styling: React Native StyleSheet + typed tokens** (`packages/ui`); Reanimated 4, Gesture Handler, expo-haptics, FlashList; native sheets via Expo Router presentation. No UI-kit or CSS-in-JS dependency. | Accepted | Fewest compatibility risks on SDK 57; full control of a distinctive design. |
| 007 | **Document worker: Python 3.12** (`apps/worker-docs`): Docling (MIT) for layout/tables/OCR, LibreOffice headless for Office → PDF renditions, pypdfium2 for rendering. **No AGPL** (no PyMuPDF). | Accepted | Best open document stack; license-clean. |
| 008 | **AI gateway** (`packages/ai`, server-only) with a provider registry; default provider **Google Gemini on a paid, no-training tier** (Flash-Lite class for extraction/cheap tasks, Flash class for tutoring, Gemini embeddings). Model IDs in config. **No Anthropic.** | Accepted | Cheap, multimodal, strong; CLAUDE.md forbids Anthropic. Optional fallback provider configured by Ohm. |
| 009 | **Timetable extraction: VLM on pixels**, single-shot, strict JSON schema + deterministic validation/rejection + confirm UI; second-opinion engine for flagged results. | *Pending S-4* (model choice only) | VLM-VERDICT: pixels beat OCR text; FINDINGS: silent failures must be caught by validation. |
| 010 | **Search: Postgres FTS + pg_trgm + pgvector (HNSW)**, hybrid via reciprocal rank fusion. | Accepted | No extra search infrastructure until scale demands it. |
| 011 | **Notifications:** local notifications for schedule-derived reminders (expo-notifications); Expo push service for server events. | Accepted | Works offline; free push. |
| 012 | **Auth:** Supabase Auth; Google + Apple native ID-token sign-in; email OTP only after Ohm configures a sender; guest mode is local-only; TOTP MFA for staff roles. | Accepted (S-5 verifies flows) | Avoids password flows and agent-touched email senders. |
| 013 | **Observability:** Sentry (app, API, worker); PostHog (product analytics, consented, PII-free); structured JSON logs. | Accepted | Standard, Expo-compatible. |
| 014 | **Testing:** Vitest (TS packages, API), jest-expo + React Native Testing Library (components), fast-check (properties), Maestro (mobile E2E + screenshots), Playwright (web E2E + axe), pgTAP via `supabase test db` (RLS), pytest (worker). | Accepted | See `10`. |
| 015 | **CI/CD:** GitHub Actions; EAS Build / Submit / Update with channels per environment; containers for API and worker. | Accepted | See §14. |
| 016 | **Rich text:** TenTap (native) + Tiptap (web), stored as ProseMirror JSON + plain-text projection; KaTeX for math. | *Pending S-6* | Same document model on all platforms. Fallback: Markdown editor with live preview. |
| 017 | **PDF viewing:** pdf.js everywhere (direct on web; in a WebView on native) with scripting disabled; Office files viewed as server-made PDF renditions. | *Pending S-2* | Annotation parity across platforms. Fallback: native PDF view for reading + web-only annotations in Ph3. |
| 018 | **Widgets:** native WidgetKit (iOS) and app widget (Android) targets managed by config plugins; data bridged through App Group / shared preferences. | *Pending S-3* | Highest-leverage retention surface (psych §2). Fallback: ship Ph1 without widgets; revisit Ph2. |
| 019 | **Payments (Ph6):** store billing on iOS/Android + entitlement sync service (e.g. RevenueCat) + an Indian UPI provider on web. | Deferred to Ph6 | Decided with Ohm (pricing, entity, tax). |
| 020 | **Dependency policy:** versions published ≥ 7 days ago; license allowlist MIT / Apache-2.0 / BSD / ISC / MPL-2.0 (LibreOffice as a separate process); no AGPL/GPL linked code; Renovate with stability days; lockfile committed. | Accepted | Supply-chain safety. |

## 3. Repository layout (target, end of Phase 0)

```
studex/
├─ apps/
│  ├─ app/               Expo Router universal app (iOS, Android, Web) — moved from repo root
│  ├─ api/               Hono API (Node LTS) — src/modules/<module>/, src/platform/
│  ├─ worker-docs/       Python document worker (Docling, LibreOffice, OCR)
│  └─ admin/             Admin console (Expo Router, web-only) — Phase 2
├─ packages/
│  ├─ core/              Pure TS domain: attendance, occurrences, planner, gpa, readiness (zero runtime deps)
│  ├─ contracts/         zod schemas: API, sync payloads, extraction outputs, events
│  ├─ db/                Drizzle schema mirror + generated types (migrations live in supabase/)
│  ├─ ai/                Provider registry, prompts/, retrieval, validators, evals/
│  ├─ ui/                Design tokens + primitives (Text, Button, Card, ListRow, Chip, Gauge, Sheet, Toast…)
│  ├─ copy/              Keyed strings (en-IN), ICU plurals; locked strings from reference/v1
│  └─ config/            Shared tsconfig, eslint, prettier
├─ supabase/             migrations/, seed/ (synthetic only), tests/ (pgTAP), config.toml
├─ extraction-lab/       Existing benchmarks, fixtures, scorers (kept; scorer promoted into CI)
├─ e2e/                  maestro/ (flows + screenshot lists), playwright/
├─ docs/
│  ├─ spec/              This specification
│  ├─ adr/               Architecture decision records
│  └─ status/            REPO_AUDIT.md, WS-*.md progress logs, release notes
└─ .github/workflows/    ci.yml, e2e.yml, nightly-live.yml, deploy-*.yml
```

Path aliases: `@studex/core`, `@studex/contracts`, `@studex/ui`, `@studex/copy`, `@studex/ai`
(server-only; importing it from `apps/app` fails lint).

## 4. Data model (logical; Postgres)

### 4.1 Conventions
- PKs: UUIDv7. Synced tables use **client-generated** IDs so offline creation works.
- Every user-owned row has `user_id` (owner, also the sync bucket key), `created_at`,
  `updated_at` (trigger), and for synced tables `deleted_at` (tombstone) and `hlc` (hybrid
  logical clock of the last write) plus `field_hlc jsonb` where column-level merge applies.
- Enumerations: `text` + `CHECK` constraints (easy migrations). Percent/threshold: integer basis
  points. Money: integer paise. AI cost: integer micro-USD (`cost_micros`).
- Instants: `timestamptz` (UTC). Academic dates: `date` interpreted in the term timezone.
  Class times: `smallint` minutes from local midnight.
- Migrations: forward-only SQL in `supabase/migrations`, each with a written rollback note in
  the PR. Every new user-owned table ships with RLS policies **and** pgTAP tests in the same PR.

### 4.2 Tables by domain (key columns; full DDL is written by WS-DATA from this model)

**Identity & platform**
| Table | Key columns | Notes |
|---|---|---|
| `profiles` | user_id PK, display_name, avatar_path, institution_id, campus_id, program_id, department_id, year_of_study, current_term_id, timezone, locale, adult_confirmed, onboarding jsonb, dashboard_layout jsonb | Synced |
| `user_roles` | (user_id, role) PK, granted_by, granted_at | Server-only; feeds JWT claims |
| `consents` | id, user_id, purpose (analytics / ai_processing / scan_improvement / parental), notice_version, granted_at, withdrawn_at, channel | Append-mostly |
| `devices` | id, user_id, platform, push_token, app_version, os_version, notifications_enabled, last_seen_at | |
| `entitlements` · `usage_counters` | plan, source, trial_ends_at, expires_at · (user_id, counter, period_start) → value | Server-authoritative |
| `feature_flags` | key PK, rules jsonb, updated_by, updated_at | Admin-managed |
| `audit_log` | bigserial id, actor_id, actor_role, action, target_type, target_id, summary jsonb, reason, ip_hash, created_at | Append-only, server-only |
| `support_tickets` · `support_messages` | ticket, category, body, attachments, status · author_role, body | In-app support |
| `data_jobs` | id, user_id, kind (export / delete), status, scheduled_for, completed_at, result_path | M19 |
| `calendar_feeds` | user_id, token_hash, created_at, revoked_at | ICS feed |

**Catalog (shared, read-mostly)**
`institutions` (name, short_name, aliases[], city, state, kind, verified, status, merged_into) ·
`campuses` · `programs` · `departments` · `catalog_courses` (Ph5) · `holiday_lists` (scope
national/state/institution, region, year, entries jsonb, verified) · `grade_scales` ·
`assessment_templates`.

**Academic core (synced)**
| Table | Key columns |
|---|---|
| `terms` | id, user_id, label, academic_year, start_date, end_date, timezone, schedule_mode (weekly / day_order), cycle_length, working_weekdays smallint[], attendance_policy jsonb (`05` §2), gpa_policy jsonb, selected_batch, status (active / archived), institution_id, program_id |
| `term_holidays` · `term_breaks` · `day_order_overrides` | date + name + source · starts_on, ends_on, label · date, order |
| `subjects` | id, user_id, term_id, name, short_name, code, color, kind, credits, faculty text[], description, policy_override jsonb, baseline_attended, baseline_held, counts_in_overall, catalog_course_id, archived_at |
| `baseline_history` | subject_id, attended, held, source, created_at (append-only) |
| `class_slots` | id, user_id, term_id, subject_id, kind, weekday, day_order, week_parity, start_minute, end_minute, room, faculty, batch, units, valid_from, valid_until, source |
| `slot_exceptions` | id, user_id, term_id, slot_id, date, kind (cancel / move / room / extra), subject_id (extra), start_minute, end_minute, room, units |
| `attendance_marks` | id, user_id, term_id, subject_id, **occurrence_key**, local_date, slot_id, status, excused_kind, units, source, marked_at, hlc, deleted_at · **UNIQUE (user_id, occurrence_key)** |
| `attendance_events` | id, user_id, mark_id, occurrence_key, old_status, new_status, source, device_id, hlc, created_at (append-only audit) |
| `units` · `topics` | subject_id, number, title, position, hours, weight_bp · subject_id, unit_id, title, description, position, status, difficulty, priority, est_minutes |
| `notes` | id, user_id, title, doc jsonb (ProseMirror), plain_text |
| `links` | id, user_id, source_type, source_id, target_type, target_id, meta jsonb (e.g. page range) — generic typed links; cleanup job on deletes |
| `tasks` | id, user_id, term_id, subject_id, parent_id, title, notes_doc, type, status, priority, due_date, due_at, estimate_min, rrule, completed_at, position, reminders jsonb |
| `events` | id, user_id, term_id, type, title, starts_at, ends_at, all_day_start, all_day_end, timezone, location, notes, rrule, exdates date[], series_parent_id, subject_id, exam_id, task_id, source |
| `exams` | id, user_id, term_id, subject_id, type, title, starts_at, duration_min, venue, seat, max_marks, weight_bp, scope jsonb |
| `assessments` | id, user_id, subject_id, component, weight_bp, max_marks, obtained, exam_id |

**Library**
| Table | Key columns | Sync |
|---|---|---|
| `folders` | id, user_id, parent_id, name, term_id, subject_id | Synced |
| `documents` | id, user_id, title, original_filename, mime, size_bytes, page_count, sha256, storage_path, rendition_path, thumbnail_path, source, status, status_detail jsonb, pipeline_version, language, term_id, subject_id, unit_id, topic_id, folder_id, filing_state (user / suggested / confirmed), deleted_at | Metadata synced |
| `document_pages` | (document_id, page_no) PK, text, ocr, width, height | Server-only |
| `document_chunks` | id, document_id, user_id, page_from, page_to, heading_path text[], content, token_count, tsv tsvector, embedding vector(768), embedding_model, pipeline_version | Server-only · GIN(tsv), HNSW(embedding, cosine), btree(user_id) |
| `annotations` | id, user_id, document_id, page_no, kind (highlight / note / bookmark), anchor jsonb (text quote + rects), color, body | Synced |
| `job_runs` | id, document_id, step, status, attempt, error_code, started_at, finished_at | Server-only |

**AI & learning**
`tutor_threads` (scope jsonb) · `tutor_messages` (role, content, citations jsonb, retrieved jsonb,
model, prompt_id, tokens_in/out, cost_micros, latency_ms, feedback, flags[]) · `ai_usage`
(server-only ledger) · `quizzes` · `quiz_questions` (type, stem, options, answer, explanation,
citation, topic_id, difficulty) · `quiz_attempts` · `question_responses` (append-only) · `decks` ·
`cards` (fsrs jsonb) · `card_reviews` (append-only) · `pyq_papers` · `pyq_questions` (topic_ids,
confirmed) · `study_plans` (goal, settings, algorithm_version) · `study_blocks` (item_type,
item_id, starts_at, duration_min, status, actual_min, pinned, reasons[]) · `focus_sessions`.

**Extraction, notifications, community, billing**
`extraction_jobs` (user_id or install_id, kind, status, input_path, model, model_version,
latency_ms, cost_micros, flags, result, edits_after_confirm, consent_keep, purge_after) ·
`notification_prefs` · `notification_log` (category, dedupe_key, scheduled_for, sent_at,
opened_at, channel) · `spaces` · `space_members` · `space_timetables` (versioned slots jsonb) ·
`space_resources` · `space_posts` · `reports` · `blocks` (Ph5) · `purchases` (Ph6).

### 4.3 Row-level security patterns
- **Owner:** `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`.
- **Server-only** (`document_pages`, `document_chunks`, `ai_usage`, `extraction_jobs`,
  `audit_log`, `job_runs`, `user_roles`): no client policies; accessed by the API/worker only.
- **Catalog:** readable by everyone (including anon); writable only by `studex_admin` (and
  `institution_admin` for their institution, Ph5).
- **Spaces:** via `SECURITY DEFINER` helpers `is_space_member(space_id)` /
  `is_space_moderator(space_id)`.
- **Staff:** role claim + `aal2` (MFA) check in policies and in the API.
- **Defense in depth:** the API runs user requests inside a transaction with
  `set local role authenticated` and the caller's JWT claims, so RLS applies to API queries too.
  The service role is reserved for system jobs (worker, cron, deletion pipeline).

## 5. API design

- REST JSON under `/v1`; SSE for streaming (`text/event-stream`).
- Auth: `Authorization: Bearer <Supabase JWT>`, verified against JWKS; guests use a signed
  install token (`X-Install-Token`) on the few anonymous endpoints.
- Validation: zod schemas from `packages/contracts` on every input and output.
- Errors: RFC 9457 `application/problem+json` with stable `code`s (`attendance.invalid_tally`,
  `quota.exceeded`, `doc.too_large`, …). 404 for resources owned by others.
- Idempotency: `Idempotency-Key` header required on POSTs that create or charge; stored 24 h.
- Pagination: cursor-based (`?cursor=&limit=`, max 100).
- Rate limits: per user and per IP; Postgres-backed sliding window for expensive routes (AI,
  extraction, uploads); `RateLimit-*` headers.
- Observability: `X-Request-Id` propagated to logs, Sentry and the worker.
- OpenAPI served at `/v1/openapi.json`; the typed client is generated into `packages/contracts`.

**Endpoint catalog (initial; modules own their routes)**

| Route | Purpose | Module |
|---|---|---|
| `POST /v1/sync/upload` | Batched CRUD from the sync engine; per-op results | M23 |
| `POST /v1/extract/{kind}` · `GET /v1/extract/jobs/{id}` | Start extraction (multipart) · poll/stream result | M17 |
| `POST /v1/documents` · `POST /v1/documents/{id}/complete` · `GET /v1/documents/{id}` · `DELETE /v1/documents/{id}` | Upload intent (TUS URL) · finalize & enqueue · status · delete cascade | M08 |
| `GET /v1/documents/{id}/url?variant=original|rendition|thumbnail` | Short-lived signed URL | M08 |
| `POST /v1/search` | Hybrid document search (+ server entity search) | M16 |
| `POST /v1/tutor/threads` · `POST /v1/tutor/threads/{id}/messages` (SSE) · `POST /v1/tutor/messages/{id}/feedback` | Tutor | M09 |
| `POST /v1/practice/quizzes` · `POST /v1/practice/cards/generate` | Generation jobs | M12 |
| `POST /v1/planner/plans` · `POST /v1/planner/plans/{id}/replan` | Plans (the scheduler itself is in `packages/core`; the API persists and adds AI explanations only if enabled) | M11 |
| `GET /v1/calendar/feed/{token}.ics` · `POST /v1/calendar/feeds` · `DELETE /v1/calendar/feeds/current` | ICS feed | M05 |
| `POST /v1/me/export` · `POST /v1/me/delete` · `POST /v1/me/delete/cancel` | Data rights | M19 |
| `POST /v1/feedback` · `GET /v1/support/tickets` | Support | M20 |
| `GET /v1/flags` · `GET /v1/entitlements` | Flags and quotas | M20, M21 |
| `POST /v1/devices` | Push token registration | M15 |
| `/v1/admin/*` | Staff only, MFA, audited | M20 |

## 6. Local-first and sync

### 6.1 Device database
SQLite on device (via the sync engine's SDK). Synced tables mirror §4.2 (synced columns only).
Device-only tables: `onboarding_draft`, `outbox_meta`, `doc_cache`, `ui_state`. Live queries
drive the UI (no manual refetch); queries are indexed on `(term_id, local_date)`,
`(subject_id)`, `(user_id, occurrence_key)`.

### 6.2 PowerSync design (default, pending S-1)
- **Sync rules:** a per-user bucket containing every synced user-owned table filtered by
  `user_id`; a global catalog bucket (institutions, holiday lists); per-space buckets (Ph5).
- **Writes:** local transaction → upload queue → connector → `POST /v1/sync/upload` (batched CRUD
  with changed columns and `hlc`) → API validates, authorizes, applies business rules (audit
  events, invariants, conflict policy) in one DB transaction → per-op results. Permanent
  rejections revert locally and show a visible message; transient errors retry with backoff.
- **Guest mode:** the same local schema with no connection; on sign-in, the claim step rewrites
  `user_id` and uploads (FR-AUTH-004).
- **Web:** PowerSync web SDK if S-1 proves it viable on react-native-web; otherwise web is
  online-first through the API with optimistic updates (FR-SYNC-006).

### 6.3 Conflict policy (normative)
| Entity | Identity | Policy |
|---|---|---|
| `attendance_marks` | (user_id, occurrence_key) | Row last-writer-wins by HLC; the losing value is written to `attendance_events` |
| Subject baselines | subject | LWW + `baseline_history` |
| `tasks`, `events`, `exams`, `subjects`, `units`, `topics`, `terms`, `class_slots` | id | Column-level LWW using `field_hlc` |
| `notes` | id | Document-level LWW; concurrent offline edits create "{title} (conflict copy)" |
| `attendance_events`, `card_reviews`, `question_responses`, `focus_sessions`, `baseline_history` | id | Append-only; no conflicts |
| Any delete | — | Tombstone wins; recoverable from "Recently deleted" for 30 days |

HLC = (physical ms, counter, node id), compared lexicographically; node id = device id.

### 6.4 Fallback protocol (only if S-1 rejects PowerSync)
- `server_seq bigint` on every synced table, assigned from one sequence by trigger on insert and
  update.
- **Pull:** `GET /v1/sync/pull?cursor={seq}&limit=1000` → changed rows (including tombstones)
  across synced tables for the caller, ordered by `server_seq`, plus `next_cursor`.
- **Push:** `POST /v1/sync/push` with `[{op_id, table, op: upsert|delete, row, changed_columns,
  hlc}]`; idempotent by `op_id`; same conflict policy as §6.3; response lists accepted/rejected ops.
- Client outbox in SQLite; pull after every push and on app foreground and reconnect; tombstones
  kept 90 days server-side.

## 7. Document pipeline (`apps/worker-docs`)

1. **Upload intent** (`POST /v1/documents`): quota and limit checks → `documentId` + TUS upload
   URL to the private bucket `user-files/{user_id}/{document_id}/original`.
2. **Complete** (`POST /v1/documents/{id}/complete`): object exists, size within limits →
   enqueue `doc_process` (pgmq) with `{document_id, pipeline_version}`.
3. **Worker** (visibility timeout 10 min; ≤ 3 attempts with backoff; then dead-letter):
   magic-byte sniff + sha256 verify → convert (LibreOffice: DOC/PPT/DOCX/PPTX → PDF rendition;
   HEIC → JPEG) → Docling per-page layout, tables and text → OCR for pages with < 50 characters
   of text (Docling OCR engine; VLM OCR for handwriting is P2 and quota-limited) → section/heading
   detection → **chunking** (heading-aware, tokenizer-aligned; target 400–600 tokens, max 800,
   ~50-token overlap; each chunk keeps `heading_path`, `page_from`, `page_to`) → **embeddings**
   (batches of 64; model and dimension recorded) → `tsv` → topic-link and subject suggestions →
   thumbnails (pypdfium2) → status Ready / Partial (failed pages listed) / Failed (error code).
4. Idempotent per (document_id, pipeline_version); bumping `pipeline_version` triggers
   background reprocessing; changing the embedding model triggers re-embedding into a new
   model-tagged column/index before cut-over (blue/green).
5. **Isolation:** the worker has egress only to DB, Storage and the embedding API; LibreOffice
   runs as a separate process with a 60 s timeout and memory cap; temp files are wiped; PDF
   JavaScript is never executed (pdf.js runs with scripting disabled; renditions are re-rendered).
6. **Deletion:** a `doc_delete` job removes storage objects, pages, chunks, annotations' links,
   caches; verified by a post-delete query (FR-KNO-011).

## 8. AI architecture (`packages/ai`)

### 8.1 Gateway
- Server-only. One `generate()` / `stream()` / `embed()` wrapper that enforces: model lookup from
  the feature registry (`feature → provider, model, params, fallback`), timeouts, retries with
  jitter, pre-flight quota check (M21), per-request token caps, usage logging to `ai_usage`
  (tokens, cost_micros, latency, feature, prompt id), PII-free logs, kill-switch flag per feature.
- Structured outputs validated with zod; invalid → one repair attempt → error.

### 8.2 Prompt registry
`packages/ai/prompts/<feature>/<name>.v<N>.md` with front matter (`id`, `inputs`, `output_schema`,
`model_class`). Prompts are code: reviewed in PRs, versioned, and every change runs the feature's
eval suite (`10` §7). Retrieved content is wrapped in delimited source blocks
(`<source id="S3" doc="…" page="12">…</source>`) and the system prompt states that source text
is data, never instructions.

### 8.3 Retrieval (tutor, practice, exam prep)
1. Scope → SQL filters (`user_id = caller` always; subject/document/topic filters from scope).
2. Optional query rewrite using thread context (P1).
3. Candidates: FTS top 30 + vector top 30 → reciprocal rank fusion (k = 60).
4. Rerank top 20 (behind a flag; on by default only if the eval shows a gain).
5. Select top 8 within a ~6k-token budget; number them S1…S8.
6. Generate with citation markers `[S#]`; the **citation validator** maps markers to chunks,
   drops invalid markers, verifies quotes (FR-TUT-005); the UI renders `[Title · p.N]`.
7. Not-found rule: if top fused score < threshold (tuned on the eval set) or the model reports
   insufficient support → the "I couldn't find this in your materials." path.

### 8.4 Safety and abuse
Provider safety settings on; self-harm detection (keyword list + model classification) routes to
the safety response (FR-TUT-011); output reports go to moderation (M20); per-user and global
spend caps; jailbreak/injection test set in evals; no tools with side effects in tutoring.

### 8.5 Caching
Embeddings keyed by sha256(content + model); summaries keyed by (document_id, pipeline_version,
prompt_id, params); all caches purged on document deletion.

### 8.6 Model defaults (config, not code)
| Feature | Default class | Notes |
|---|---|---|
| Timetable / document extraction | Gemini Flash-Lite class (vision) | Final choice by S-4 against the gate |
| Tutor answers | Gemini Flash class | Streaming |
| Titles, classification, validation checks, rerank | Gemini Flash-Lite class | |
| Embeddings | Gemini embedding model, 768 dimensions | Multilingual |
| Fallback | OpenAI-compatible endpoint configured by Ohm (optional) | Never Anthropic |

## 9. Extraction service
Implemented in `apps/api/src/modules/extraction` (orchestration, validation, persistence) with
model calls through `packages/ai`. Validation rules are pure functions in
`packages/core/extraction-validate` so they run in CI without network. The evaluation harness
reuses `extraction-lab/` fixtures and ground truth; `score_slots_strict.py` stays the reference
scorer and the RUAS keyF1 scorer is ported from `reference/v1/tests/ExtractionAcceptanceTests.swift`
(matching rules in `reference/v1/briefs/extract.md` §7). CI runs against **recorded** model
outputs; the nightly job runs live (budget-capped). Results print MATCH / MISS / SPURIOUS tables.

## 10. Notifications
Local scheduling service in the app (`apps/app/src/services/notifications`) recomputes a rolling
7-day window from `packages/core` occurrences; dedupe keys prevent duplicates; categories map to
Android channels. Server push via the Expo push service from the API (`notification_log` for
dedupe and auditing). Templates live in `packages/copy`; a unit test scans them for forbidden
wording (`attendance status`, thresholds, streaks).

## 11. Search
Server: SQL function `search_documents(query, scope, limit)` doing FTS (`ts_rank_cd`) + trigram
on titles + pgvector cosine, fused by RRF. Client: SQLite FTS5 tables for synced entities, with
triggers keeping them in sync. Global search merges both result sets by type.

## 12. Security architecture
- **AuthN:** Supabase JWT (1 h access tokens, rotating refresh tokens); JWKS verification in the
  API; staff roles require `aal2`.
- **AuthZ:** explicit ownership checks in every API handler **and** RLS (§4.3).
- **Storage:** private buckets only; paths prefixed by `user_id`; storage policies; downloads via
  signed URLs (≤ 15 min) issued after authorization.
- **Secrets:** environment variables from secret managers only. Client bundles contain only
  publishable values (Supabase anon/publishable key, Sentry DSN, PostHog public key).
  `.env.example` lists keys without values. gitleaks in CI. Agents never read `.env.local`.
- **Web:** strict CSP, no `dangerouslySetInnerHTML` (rich text rendered through sanitized
  schema-based renderers), SameSite cookies where used.
- **Threat model (top items):**

| Threat | Control |
|---|---|
| IDOR / cross-user reads | API ownership checks + RLS + 404s + pgTAP tests per table |
| Malicious uploads (PDF JS, zip bombs, polyglots) | Magic-byte sniffing, limits, sandboxed worker, scripting disabled, ZIP limits |
| Prompt injection via documents | Delimited sources, instruction hierarchy, no side-effect tools, SQL-scoped retrieval, injection eval set |
| Cost abuse (anonymous extraction, AI) | Install tokens, rate limits, quotas, global kill switches, bot challenge on web |
| Account takeover | OAuth only, refresh rotation, revoke-all, anomaly alerts (P2) |
| Staff abuse | MFA, least privilege, content-blind support views, audit log |
| Supply chain | 7-day minimum release age, lockfile, Renovate, osv-scanner, license check |
| Data leakage in logs | PII-free logging policy, scrubbing in Sentry, no request bodies logged |

## 13. Environments, configuration, secrets
| Env | Purpose | Data | Deploys |
|---|---|---|---|
| local | Development (`supabase start`, API dev server, worker container, Expo dev client) | Synthetic seed | Developer |
| dev | Shared integration | Synthetic | Auto on merge to `main` |
| staging | Release candidates, beta backend | Synthetic + test accounts | Manual promotion |
| prod | Users | Real | **Human-approved only** |

Each app validates its environment at startup with zod and fails fast with a clear message.
Production data is never copied to lower environments.

## 14. CI/CD and release engineering
- **`ci.yml` (every PR):** pnpm install (frozen lockfile) → lint → typecheck → unit tests (core,
  contracts, api, app components) → DB tests (`supabase start`, migrations, pgTAP RLS suite) →
  worker tests (pytest) → extraction gate (recorded) → AI evals (recorded; only when AI paths
  change) → web build + bundle-size check → gitleaks → osv-scanner → license check.
- **`e2e.yml` (main + nightly):** Playwright (web, axe); Maestro on an Android emulator
  (+ iOS simulator nightly on macOS runners); screenshot artifacts for light/dark.
- **`nightly-live.yml`:** live extraction gate and live AI evals with budget caps.
- **Deploy:** API and worker containers → dev on merge; staging and prod by manual promotion
  (prod requires Ohm). DB migrations via the Supabase CLI in the pipeline (staging/prod gated).
- **Mobile:** EAS profiles `development` / `preview` / `production` (existing `eas.json`),
  `appVersionSource: remote` with auto-increment; EAS Update channels per environment; runtime
  version from fingerprint; store submission and production updates are human-only.

## 15. Observability
Sentry everywhere (source maps uploaded by EAS and CI); structured JSON logs with `request_id`,
`trace_id`, hashed user id; metrics and alerts: API p95 > 1 s, error-rate spikes, queue backlog
> 15 min, extraction failure rate > 10%/h, AI spend > 80% of the daily budget, crash-free
sessions < 99.5%, sync error rate > 1%.

## 16. Performance engineering (low-end Android first)
Hermes; React Compiler; FlashList for every long list; live queries scoped to the visible term;
defer analytics/flags/Sentry breadcrumbs until after first frame; expo-image with sized sources;
route-level code splitting on web; no large JSON parsing at startup; SQLite indices per §6.1;
measure cold start, TTI of Today and marking latency in CI on the reference device profile (`07` §1).

## 17. Spikes (Phase 0) — evidence decides, the fallback is fixed

| Spike | Question | Pass criteria | If it fails |
|---|---|---|---|
| **S-1 Sync** | Does PowerSync work on SDK 57 (iOS, Android dev builds; web)? | Guest local-only mode + claim; offline mark → kill → reconnect → server row + audit event; two-device conflict converges per §6.3; 5,000-row initial sync ≤ 15 s on mid-tier Android; app size impact ≤ 3 MB; license acceptable | Custom protocol §6.4 |
| **S-2 PDF viewer** | pdf.js in WebView (native) + web for 300-page PDFs? | Page nav, search, highlight create/persist (text-quote anchors), open-at-page with highlight, no crash on a 300-page scanned PDF on a 3 GB RAM Android, scripting disabled | Native viewer for reading; annotations web-only in Ph3 |
| **S-3 Widgets** | Can the Expo project ship iOS (interactive) and Android widgets? | Builds via config plugins; widget shows next class + budget; tap-to-mark updates the app DB; refresh within 5 s of a mark in-app | Ship Ph1 without widgets; revisit in Ph2 |
| **S-4 Extraction model** | Does a single-shot Flash-Lite-class (then Flash-class) model on pixels pass the gate? | `10` §5 gate on all four fixtures, 3 runs each, with the validation layer; p75 ≤ 10 s; cost per page recorded | Iterate prompt/schema/validation/second opinion; **never lower the gate**; manual entry remains |
| **S-5 Auth** | Native Google + Apple ID-token sign-in with Supabase on dev builds + web | Sign-in, persistence, refresh offline, logout, revoke-all | Web OAuth flow on native as interim; Apple blocked until the paid account exists |
| **S-6 Rich text** | TenTap + Tiptap sharing ProseMirror JSON with KaTeX | Same doc renders/edits on iOS/Android/web; offline; typing latency < 50 ms on mid-tier Android | Markdown editor with preview |
