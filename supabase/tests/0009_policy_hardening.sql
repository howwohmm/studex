-- PR #65 round 2: synced tables have no client DELETE, attendance_events is
-- trigger-only, consents is withdraw-only, support role + aal2, feature_flags
-- updated_at trigger, UUIDv7 server defaults.
begin;
create extension if not exists pgtap;

-- plan: 20 synced delete-denied + 1 events-insert denied + 4 consents
--     + 4 support role + 1 updated_at + 3 uuidv7 = 33
select plan(33);

insert into auth.users (id, email, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('019b0000-0000-7000-8000-0000000000b2', 'other@studex.local', 'authenticated', 'authenticated', '', now(), now(), now(), '{}', '{}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 1. Synced tables: DELETE as the owner is a no-op (row survives). One
--    fixture row per synced table, inserted as postgres before the role
--    switch (subjects and class_slots come from the seed).
-- ---------------------------------------------------------------------------
insert into public.profiles (user_id) values ('019b0000-0000-7000-8000-0000000000b2')
on conflict (user_id) do nothing;
insert into public.terms (id, user_id, label)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', 'T2');
insert into public.term_holidays (id, user_id, term_id, date)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', date '2026-10-15');
insert into public.term_breaks (id, user_id, term_id, starts_on, ends_on)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', date '2026-10-12', date '2026-10-13');
insert into public.day_order_overrides (id, user_id, term_id, date, day_order)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', date '2026-11-05', 2);
insert into public.slot_exceptions (id, user_id, term_id, date, kind)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', date '2026-11-26', 'cancel');
insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001',
        '319b0000-0000-7000-8000-000000000001', 'occ-del', date '2026-11-22', 'attended');
insert into public.units (id, user_id, subject_id)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '319b0000-0000-7000-8000-000000000001');
insert into public.topics (id, user_id, subject_id)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '319b0000-0000-7000-8000-000000000001');
insert into public.notes (id, user_id, title)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', 'del me');
insert into public.links (id, user_id, source_type, source_id, target_type, target_id)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
        'subjects', '319b0000-0000-7000-8000-000000000001', 'terms', '219b0000-0000-7000-8000-000000000001');
insert into public.tasks (id, user_id, title)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', 'del me');
insert into public.events (id, user_id, title)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', 'del me');
insert into public.exams (id, user_id, term_id, title)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', 'fixture exam');
insert into public.assessments (id, user_id, subject_id, component)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', '319b0000-0000-7000-8000-000000000001', 'lab');
insert into public.folders (id, user_id, name)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', 'del me');
insert into public.documents (id, user_id, title)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1', 'del me');
insert into public.annotations (id, user_id, document_id, page_no, kind)
values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
        (select id from public.documents where user_id = '019b0000-0000-7000-8000-0000000000a1' limit 1), 1, 'note');

set local role authenticated;
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000a1", "role": "authenticated"}';

-- DELETE on every synced table must be a no-op (rows survive). The DO block
-- attempts the delete per table; the generated is_empty proves each table
-- still has rows. The list is inline so no synced table can be missed.
do $$
declare
  f text;
  synced text[] := array[
    'profiles', 'terms', 'term_holidays', 'term_breaks', 'day_order_overrides',
    'subjects', 'class_slots', 'slot_exceptions', 'attendance_marks', 'units',
    'topics', 'notes', 'links', 'tasks', 'events', 'exams', 'assessments',
    'folders', 'documents', 'annotations'
  ];
begin
  foreach f in array synced loop
    execute format('delete from public.%I', f);
  end loop;
end $$;

select isnt_empty(
  format('select 1 from public.%I', t),
  t || ': client DELETE is a no-op (row survives)')
from unnest(array[
  'profiles', 'terms', 'term_holidays', 'term_breaks', 'day_order_overrides',
  'subjects', 'class_slots', 'slot_exceptions', 'attendance_marks', 'units',
  'topics', 'notes', 'links', 'tasks', 'events', 'exams', 'assessments',
  'folders', 'documents', 'annotations'
]) t;

-- ---------------------------------------------------------------------------
-- 2. attendance_events: direct client insert denied
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into public.attendance_events (user_id, occurrence_key, new_status)
    values ('019b0000-0000-7000-8000-0000000000a1', 'occ-x', 'attended')$$,
  '42501', null, 'attendance_events: client insert denied');

-- ---------------------------------------------------------------------------
-- 3. consents: withdraw-only
-- ---------------------------------------------------------------------------
insert into public.consents (user_id, purpose, notice_version)
values ('019b0000-0000-7000-8000-0000000000a1', 'ai_processing', 'v1')
returning id \gset consent_
select throws_ok(
  format($$update public.consents set purpose = 'analytics' where id = '%s'$$, :'consent_id'),
  'P0001', null, 'consents: cannot change purpose');
select lives_ok(
  format($$update public.consents set withdrawn_at = now() where id = '%s'$$, :'consent_id'),
  'consents: owner can withdraw');
select throws_ok(
  format($$update public.consents set withdrawn_at = null where id = '%s'$$, :'consent_id'),
  'P0001', null, 'consents: withdrawal cannot be undone');
delete from public.consents where id = :'consent_id';
select isnt_empty(
  format($$select 1 from public.consents where id = '%s'$$, :'consent_id'),
  'consents: client delete denied');

-- ---------------------------------------------------------------------------
-- 4. support role + aal2
-- ---------------------------------------------------------------------------
insert into public.support_tickets (id, user_id, body)
values ('719b0000-0000-7000-8000-00000000000a', '019b0000-0000-7000-8000-0000000000a1', 'help me');

set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000b2", "role": "authenticated", "app_metadata": {"role": "support"}, "aal": "aal1"}';
select is_empty(
  $$select 1 from public.support_tickets$$,
  'support_tickets: support claim without aal2 sees nothing');
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000b2", "role": "authenticated", "app_metadata": {"role": "support"}, "aal": "aal2"}';
select isnt_empty(
  $$select 1 from public.support_tickets$$,
  'support_tickets: support + aal2 can read');
select lives_ok(
  $$insert into public.support_messages (ticket_id, author_role, body)
    values ('719b0000-0000-7000-8000-00000000000a', 'support', 'agent reply')$$,
  'support_messages: support + aal2 can post a support reply');
select throws_ok(
  $$insert into public.support_messages (ticket_id, author_role, body)
    values ('719b0000-0000-7000-8000-00000000000a', 'user', 'fake user msg')$$,
  '42501', null, 'support_messages: support cannot post as the user');

-- ---------------------------------------------------------------------------
-- 5. feature_flags updated_at trigger
-- ---------------------------------------------------------------------------
reset role;
insert into public.feature_flags (key, rules, updated_at) values ('upd_flag', '{}', timestamptz '2026-01-01');
update public.feature_flags set rules = '{"all": true}' where key = 'upd_flag';
select isnt_empty(
  $$select 1 from public.feature_flags where key = 'upd_flag' and updated_at > timestamptz '2026-01-01'$$,
  'feature_flags: updated_at advances on update');

-- ---------------------------------------------------------------------------
-- 6. uuid_generate_v7 defaults produce version-7 ids
-- ---------------------------------------------------------------------------
select is(public.uuid_generate_v7()::text ~ '^........-....-7...-[89ab]', true,
  'uuid_generate_v7() emits a v7 uuid');
insert into public.data_jobs (user_id, kind)
values ('019b0000-0000-7000-8000-0000000000a1', 'export')
returning id \gset job_
select is(
  :'job_id'::text ~ '^........-....-7...-[89ab]',
  true, 'server-default PKs are UUIDv7');

select is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and column_name = 'id'
      and column_default ilike '%gen_random_uuid%'),
  0,
  'no public table still defaults its id to UUIDv4');

select * from finish();
rollback;
