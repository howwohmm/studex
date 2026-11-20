-- Owner RLS matrix (10 §4): for every user-owned table —
-- A sees own rows; B sees nothing; B cannot insert; anon denied.
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

select plan(26 + 26 + 8);

-- A second user who owns nothing.
insert into auth.users (id, email, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('00000000-0000-4000-8000-0000000000b2', 'other@studex.local', 'authenticated', 'authenticated', '', now(), now(), now(), '{}', '{}')
on conflict (id) do nothing;

-- user B: every owner table is empty to them.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}';
select is_empty(format('select 1 from public.%I', t), t || ': B sees 0 rows')
from unnest(pg_temp.user_tables()) t;

-- anon: denied on every owner table.
set local role anon;
set local request.jwt.claims to '';
select is_empty(format('select 1 from public.%I', t), t || ': anon sees 0 rows')
from unnest(pg_temp.user_tables()) t;

-- B cannot write rows owned by B's victim (insert as A under B's session fails
-- at the WITH CHECK; tested on representative tables covering each FK depth).
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}';
select throws_ok(
  $$insert into public.profiles (user_id) values ('00000000-0000-4000-8000-0000000000a1')$$,
  '42501', null, 'profiles: insert as another user denied');
select throws_ok(
  $$insert into public.notes (id, user_id) values (gen_random_uuid(), '00000000-0000-4000-8000-0000000000a1')$$,
  '42501', null, 'notes: insert as another user denied');
select throws_ok(
  $$insert into public.consents (user_id, purpose, notice_version) values ('00000000-0000-4000-8000-0000000000a1', 'analytics', 'v1')$$,
  '42501', null, 'consents: insert as another user denied');
select throws_ok(
  $$insert into public.calendar_feeds (user_id, token_hash) values ('00000000-0000-4000-8000-0000000000a1', 'x')$$,
  '42501', null, 'calendar_feeds: insert as another user denied');

-- A's own CRUD works end to end.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select lives_ok(
  $$insert into public.notes (id, user_id, title) values ('50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'own note')$$,
  'notes: A inserts own row');
select isnt_empty(
  $$select 1 from public.notes where id = '50000000-0000-4000-8000-000000000001'$$,
  'notes: A selects own row');
select lives_ok(
  $$update public.notes set title = 'edited' where id = '50000000-0000-4000-8000-000000000001'$$,
  'notes: A updates own row');
select lives_ok(
  $$delete from public.notes where id = '50000000-0000-4000-8000-000000000001'$$,
  'notes: A deletes own row');

select * from finish();
rollback;
