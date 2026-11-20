-- Owner RLS matrix (10 §4): for every user-owned table —
-- A sees own rows (non-vacuous: an A-owned fixture exists in each table),
-- B sees nothing, anon denied, owner inserts on own rows work.
begin;
create extension if not exists pgtap;

create or replace function pg_temp.user_tables()
returns text[] language sql as $$
  select array[
    'profiles', 'consents', 'devices', 'support_tickets', 'calendar_feeds',
    'terms', 'term_holidays', 'term_breaks', 'day_order_overrides', 'subjects',
    'baseline_history', 'class_slots', 'slot_exceptions', 'attendance_marks',
    'attendance_events', 'units', 'topics', 'notes', 'links', 'tasks', 'events',
    'exams', 'assessments', 'folders', 'documents', 'annotations'
  ]
$$;

-- plan: 26 B-empty + 26 anon-empty + 26 A-visible + 4 denied inserts
--     + 4 notes CRUD effects + 3 support_messages = 115
select plan(89);

-- A second user who owns nothing.
insert into auth.users (id, email, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('019b0000-0000-7000-8000-0000000000b2', 'other@studex.local', 'authenticated', 'authenticated', '', now(), now(), now(), '{}', '{}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- A-owned fixtures (inserted as postgres, before any role switch). Seed
-- already provides: profiles, terms, subjects, class_slots.
-- ---------------------------------------------------------------------------
insert into public.consents (user_id, purpose, notice_version)
values ('019b0000-0000-7000-8000-0000000000a1', 'analytics', 'v1');
insert into public.devices (user_id, platform)
values ('019b0000-0000-7000-8000-0000000000a1', 'ios');
insert into public.support_tickets (id, user_id, body)
values ('719b0000-0000-7000-8000-00000000000a', '019b0000-0000-7000-8000-0000000000a1', 'help');
insert into public.support_messages (ticket_id, author_role, body)
values ('719b0000-0000-7000-8000-00000000000a', 'user', 'my question');
insert into public.calendar_feeds (user_id, token_hash)
values ('019b0000-0000-7000-8000-0000000000a1', 'seed-hash');
insert into public.term_holidays (id, user_id, term_id, date)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', date '2026-10-02');
insert into public.term_breaks (id, user_id, term_id, starts_on, ends_on)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', date '2026-10-06', date '2026-10-10');
insert into public.day_order_overrides (id, user_id, term_id, date, day_order)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', date '2026-11-03', 3);
insert into public.baseline_history (user_id, subject_id, attended, held, as_of)
values ('019b0000-0000-7000-8000-0000000000a1', '319b0000-0000-7000-8000-000000000001', 5, 8, date '2026-11-18');
insert into public.slot_exceptions (id, user_id, term_id, slot_id, date, kind)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001',
        '419b0000-0000-7000-8000-000000000001', date '2026-11-24', 'cancel');
insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status)
values ('619b0000-0000-7000-8000-000000000001', '019b0000-0000-7000-8000-0000000000a1',
        '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001',
        'occ-fixture', date '2026-11-21', 'attended'); -- trigger writes an attendance_events row
insert into public.units (id, user_id, subject_id, number)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '319b0000-0000-7000-8000-000000000001', 1);
insert into public.topics (id, user_id, subject_id)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '319b0000-0000-7000-8000-000000000001');
insert into public.notes (id, user_id, title)
values ('519b0000-0000-7000-8000-000000000001', '019b0000-0000-7000-8000-0000000000a1', 'fixture note');
insert into public.links (id, user_id, source_type, source_id, target_type, target_id)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
        'notes', '519b0000-0000-7000-8000-000000000001',
        'subjects', '319b0000-0000-7000-8000-000000000001');
insert into public.tasks (id, user_id, title)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', 'fixture task');
insert into public.events (id, user_id, title)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', 'fixture event');
insert into public.exams (id, user_id, term_id, title)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', 'fixture exam');
insert into public.assessments (id, user_id, subject_id, component)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '319b0000-0000-7000-8000-000000000001', 'quiz');
insert into public.folders (id, user_id, name)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', 'fixture folder');
insert into public.documents (id, user_id, title)
values ('519b0000-0000-7000-8000-0000000000d1', '019b0000-0000-7000-8000-0000000000a1', 'fixture doc');
insert into public.annotations (id, user_id, document_id, page_no, kind)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '519b0000-0000-7000-8000-0000000000d1', 1, 'highlight');

-- ---------------------------------------------------------------------------
-- user B: every owner table is empty to them
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000b2", "role": "authenticated"}';
select is_empty(format('select 1 from public.%I', t), t || ': B sees 0 rows')
from unnest(pg_temp.user_tables()) t;

-- ---------------------------------------------------------------------------
-- anon: denied on every owner table
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims to '';
select is_empty(format('select 1 from public.%I', t), t || ': anon sees 0 rows')
from unnest(pg_temp.user_tables()) t;

-- ---------------------------------------------------------------------------
-- user A: sees at least one row in every table (non-vacuous)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000a1", "role": "authenticated"}';
select isnt_empty(format('select 1 from public.%I', t), t || ': A sees own rows')
from unnest(pg_temp.user_tables()) t;

-- ---------------------------------------------------------------------------
-- B cannot write rows owned by A (WITH CHECK under B's session)
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000b2", "role": "authenticated"}';
select throws_ok(
  $$insert into public.profiles (user_id) values ('019b0000-0000-7000-8000-0000000000a1')$$,
  '42501', null, 'profiles: insert as another user denied');
select throws_ok(
  $$insert into public.notes (id, user_id) values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1')$$,
  '42501', null, 'notes: insert as another user denied');
select throws_ok(
  $$insert into public.consents (user_id, purpose, notice_version) values ('019b0000-0000-7000-8000-0000000000a1', 'analytics', 'v1')$$,
  '42501', null, 'consents: insert as another user denied');
select throws_ok(
  $$insert into public.calendar_feeds (user_id, token_hash) values ('019b0000-0000-7000-8000-0000000000a1', 'x')$$,
  '42501', null, 'calendar_feeds: insert as another user denied');

-- ---------------------------------------------------------------------------
-- A's own CRUD: prove effects, not just success
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000a1", "role": "authenticated"}';
insert into public.notes (id, user_id, title)
values ('519b0000-0000-7000-8000-0000000000e1', '019b0000-0000-7000-8000-0000000000a1', 'own note');
select results_eq(
  $$select title from public.notes where id = '519b0000-0000-7000-8000-0000000000e1'$$,
  $$values ('own note'::text)$$,
  'notes: A insert stored the row');
update public.notes set title = 'edited' where id = '519b0000-0000-7000-8000-0000000000e1';
select results_eq(
  $$select title from public.notes where id = '519b0000-0000-7000-8000-0000000000e1'$$,
  $$values ('edited'::text)$$,
  'notes: A update actually changed the value');
-- hard delete on a synced table is denied (tombstones only): no-op delete
delete from public.notes where id = '519b0000-0000-7000-8000-0000000000e1';
select isnt_empty(
  $$select 1 from public.notes where id = '519b0000-0000-7000-8000-0000000000e1'$$,
  'notes: synced row survives DELETE (no client delete policy)');
-- soft delete via deleted_at works
update public.notes set deleted_at = now() where id = '519b0000-0000-7000-8000-0000000000e1';
select isnt_empty(
  $$select 1 from public.notes where id = '519b0000-0000-7000-8000-0000000000e1' and deleted_at is not null$$,
  'notes: A can tombstone own row');

-- ---------------------------------------------------------------------------
-- support_messages (ticket-scoped): owner reads, B/anon denied
-- ---------------------------------------------------------------------------
select isnt_empty(
  $$select 1 from public.support_messages where ticket_id = '719b0000-0000-7000-8000-00000000000a'$$,
  'support_messages: owner reads own ticket messages');
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000b2", "role": "authenticated"}';
select is_empty(
  $$select 1 from public.support_messages where ticket_id = '719b0000-0000-7000-8000-00000000000a'$$,
  'support_messages: other user sees 0 rows');
set local role anon;
set local request.jwt.claims to '';
select is_empty(
  $$select 1 from public.support_messages$$,
  'support_messages: anon sees 0 rows');

select * from finish();
rollback;
