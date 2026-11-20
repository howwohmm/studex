-- PR #65 integrity fixes: excused_kind values, composite ownership FKs,
-- links endpoint check, cascade account deletion, support_messages policy.
begin;
create extension if not exists pgtap;

-- plan: 1 catalog sweep + 4 excused + 4 cross-user rejects + 1 links
--     + 2 cascade-delete + 4 support_messages = 16
select plan(18);

-- A second user who owns nothing.
insert into auth.users (id, email, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('019b0000-0000-7000-8000-0000000000b2', 'other@studex.local', 'authenticated', 'authenticated', '', now(), now(), now(), '{}', '{}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Every FK from a user-owned table to a user-owned parent must include
-- user_id in both its column list and referenced key (composite ownership).
-- ---------------------------------------------------------------------------
select is_empty(
  $$
  select cl.relname || '.' || a.attname || ' -> ' || pl.relname
  from pg_constraint con
  join pg_class cl on cl.oid = con.conrelid
  join pg_class pl on pl.oid = con.confrelid
  join pg_namespace n on n.oid = cl.relnamespace
  join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
  join pg_attribute ua on ua.attrelid = con.conrelid and ua.attname = 'user_id'
  join pg_attribute pa on pa.attrelid = con.confrelid and pa.attname = 'user_id'
  where con.contype = 'f' and n.nspname = 'public'
    and con.conrelid <> con.confrelid
    and (
      not exists (
        select 1 from unnest(con.conkey) k
        join pg_attribute ra on ra.attrelid = con.conrelid and ra.attnum = k
        where ra.attname = 'user_id')
      or not exists (
        select 1 from unnest(con.confkey) k
        join pg_attribute ra on ra.attrelid = con.confrelid and ra.attnum = k
        where ra.attname = 'user_id'))
  $$,
  'every user-owned -> user-owned FK references (id, user_id)');

-- ---------------------------------------------------------------------------
-- excused_kind accepts mapping values, rejects anything else and asymmetry
-- ---------------------------------------------------------------------------
select lives_ok(
  $$insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status, excused_kind)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001',
            'occ-ex-1', date '2026-11-21', 'excused', 'on_duty')$$,
  'excused + on_duty accepted');
select lives_ok(
  $$insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status, excused_kind)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001',
            'occ-ex-2', date '2026-11-21', 'excused', 'medical')$$,
  'excused + medical accepted');
select throws_ok(
  $$insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status, excused_kind)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001',
            'occ-ex-3', date '2026-11-21', 'excused', 'present')$$,
  '23514', null, 'excused_kind contribution-mode value rejected');
select throws_ok(
  $$insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status, excused_kind)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001',
            'occ-ex-4', date '2026-11-21', 'attended', 'other')$$,
  '23514', null, 'non-excused status with excused_kind rejected');

-- ---------------------------------------------------------------------------
-- Cross-user child inserts are rejected by the composite FK (RLS lets the
-- row through the WITH CHECK; the FK then fails).
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000b2", "role": "authenticated"}';

select throws_ok(
  $$insert into public.term_holidays (id, user_id, term_id, date)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000b2',
            '219b0000-0000-7000-8000-000000000001', date '2026-10-02')$$,
  '23503', null, 'term_holidays: cannot point at another user''s term');
select throws_ok(
  $$insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000b2',
            '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001',
            'occ-b', date '2026-11-21', 'attended')$$,
  '23503', null, 'attendance_marks: cannot point at another user''s term');
select throws_ok(
  $$insert into public.topics (id, user_id, subject_id)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000b2',
            '319b0000-0000-7000-8000-000000000001')$$,
  '23503', null, 'topics: cannot point at another user''s subject');
reset role;
insert into public.documents (id, user_id, title)
values ('519b0000-0000-7000-8000-0000000000d1', '019b0000-0000-7000-8000-0000000000a1', 'A doc')
on conflict (id) do nothing;
set local role authenticated;
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000b2", "role": "authenticated"}';
select throws_ok(
  $$insert into public.annotations (id, user_id, document_id, page_no, kind)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000b2',
            '519b0000-0000-7000-8000-0000000000d1', 1, 'highlight')$$,
  '23503', null, 'annotations: B cannot point at A''s document');

-- links: source owned by A must be rejected under B's user_id
reset role;
insert into public.notes (id, user_id, title)
values ('519b0000-0000-7000-8000-000000000009', '019b0000-0000-7000-8000-0000000000a1', 'link src');
insert into public.notes (id, user_id, title)
values ('519b0000-0000-7000-8000-0000000000b2', '019b0000-0000-7000-8000-0000000000b2', 'B note');
set local role authenticated;
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000b2", "role": "authenticated"}';
select throws_ok(
  $$insert into public.links (id, user_id, source_type, source_id, target_type, target_id)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000b2',
            'notes', '519b0000-0000-7000-8000-000000000009',
            'notes', '519b0000-0000-7000-8000-0000000000b2')$$,
  'P0001', null, 'links: cannot link to another user''s row');
select throws_ok(
  $$insert into public.links (id, user_id, source_type, source_id, target_type, target_id)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000b2',
            'notes', '519b0000-0000-7000-8000-0000000000b2',
            'notes', '519b0000-0000-7000-8000-000000000009')$$,
  'P0001', null, 'links: own source + foreign target also rejected');

-- ---------------------------------------------------------------------------
-- Account deletion cascades marks and their audit events (as postgres).
-- ---------------------------------------------------------------------------
reset role;
insert into auth.users (id, email, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('019b0000-0000-7000-8000-0000000000c3', 'gone@studex.local', 'authenticated', 'authenticated', '', now(), now(), now(), '{}', '{}');
insert into public.terms (id, user_id, label, start_date, end_date, schedule_mode)
values ('219b0000-0000-7000-8000-00000000000c', '019b0000-0000-7000-8000-0000000000c3', 'S', date '2026-08-01', date '2026-12-01', 'weekly');
insert into public.subjects (id, user_id, term_id, name)
values ('319b0000-0000-7000-8000-00000000000c', '019b0000-0000-7000-8000-0000000000c3', '219b0000-0000-7000-8000-00000000000c', 'X');
insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status)
values ('619b0000-0000-7000-8000-00000000000c', '019b0000-0000-7000-8000-0000000000c3',
        '219b0000-0000-7000-8000-00000000000c', '319b0000-0000-7000-8000-00000000000c',
        'occ-c', date '2026-11-21', 'attended');

delete from auth.users where id = '019b0000-0000-7000-8000-0000000000c3';
select is_empty(
  $$select 1 from public.attendance_marks where user_id = '019b0000-0000-7000-8000-0000000000c3'$$,
  'account deletion removes attendance marks');
select is_empty(
  $$select 1 from public.attendance_events where user_id = '019b0000-0000-7000-8000-0000000000c3'$$,
  'account deletion removes attendance events');

-- ---------------------------------------------------------------------------
-- support_messages: owner inserts only author_role 'user', no update/delete
-- ---------------------------------------------------------------------------
insert into public.support_tickets (id, user_id, body)
values ('719b0000-0000-7000-8000-00000000000a', '019b0000-0000-7000-8000-0000000000a1', 'help');
set local role authenticated;
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000a1", "role": "authenticated"}';

select lives_ok(
  $$insert into public.support_messages (ticket_id, author_role, body)
    values ('719b0000-0000-7000-8000-00000000000a', 'user', 'my question')$$,
  'support_messages: owner inserts a user message');
select throws_ok(
  $$insert into public.support_messages (ticket_id, author_role, body)
    values ('719b0000-0000-7000-8000-00000000000a', 'support', 'fake reply')$$,
  '42501', null, 'support_messages: owner cannot forge a support message');
update public.support_messages set body = 'tampered'
where ticket_id = '719b0000-0000-7000-8000-00000000000a';
select results_eq(
  $$select body from public.support_messages where ticket_id = '719b0000-0000-7000-8000-00000000000a'$$,
  $$values ('my question'::text)$$,
  'support_messages: owner cannot update');
delete from public.support_messages where ticket_id = '719b0000-0000-7000-8000-00000000000a';
select results_eq(
  $$select count(*)::int from public.support_messages where ticket_id = '719b0000-0000-7000-8000-00000000000a'$$,
  $$values (1)$$,
  'support_messages: owner cannot delete');

reset role;
select is_empty(
  $$select 1 from public.support_messages sm
    join public.support_tickets st on st.id = sm.ticket_id
    where sm.user_id is distinct from st.user_id$$,
  'support_messages.user_id is backfilled/derived from the ticket');

select * from finish();
rollback;
