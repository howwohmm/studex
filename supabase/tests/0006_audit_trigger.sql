-- attendance_marks writes an attendance_events row on insert/update/tombstone.
-- Compared as unordered sets (same-timestamp ties are possible) and every
-- transition asserts BOTH old_status and new_status.
begin;
create extension if not exists pgtap;

select plan(7);

insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status, source)
values (
  '619b0000-0000-7000-8000-0000000000a1', '019b0000-0000-7000-8000-0000000000a1',
  '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001',
  'occ-audit', date '2026-11-21', 'attended', 'seed-test');

select set_eq(
  $$select old_status, new_status from public.attendance_events
    where mark_id = '619b0000-0000-7000-8000-0000000000a1'$$,
  $$values (null::text, 'attended'::text)$$,
  'insert writes an event with null old_status');

update public.attendance_marks set status = 'bunked', hlc = '1.1.dev'
where id = '619b0000-0000-7000-8000-0000000000a1';

select set_eq(
  $$select old_status, new_status from public.attendance_events
    where mark_id = '619b0000-0000-7000-8000-0000000000a1'$$,
  $$values (null::text, 'attended'::text), ('attended'::text, 'bunked'::text)$$,
  'update writes old and new status');

-- tombstone (soft delete) writes a 'deleted' event
update public.attendance_marks set deleted_at = now(), hlc = '1.2.dev'
where id = '619b0000-0000-7000-8000-0000000000a1';
select set_eq(
  $$select old_status, new_status from public.attendance_events
    where mark_id = '619b0000-0000-7000-8000-0000000000a1'$$,
  $$values (null::text, 'attended'::text), ('attended'::text, 'bunked'::text), ('bunked'::text, 'deleted'::text)$$,
  'tombstone writes old status -> deleted');

-- restore writes a 'restored' event
update public.attendance_marks set deleted_at = null, hlc = '1.3.dev'
where id = '619b0000-0000-7000-8000-0000000000a1';
select set_eq(
  $$select old_status, new_status from public.attendance_events
    where mark_id = '619b0000-0000-7000-8000-0000000000a1'$$,
  $$values (null::text, 'attended'::text), ('attended'::text, 'bunked'::text),
           ('bunked'::text, 'deleted'::text), ('bunked'::text, 'restored'::text)$$,
  'restore writes deleted -> restored');

-- append-only: owner UPDATE/DELETE/INSERT are all denied (no policies for
-- them); the full four-row set must survive every attempt.
set local role authenticated;
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000a1", "role": "authenticated"}';
update public.attendance_events set new_status = 'tampered';
delete from public.attendance_events where mark_id = '619b0000-0000-7000-8000-0000000000a1';
select set_eq(
  $$select old_status, new_status from public.attendance_events
    where mark_id = '619b0000-0000-7000-8000-0000000000a1'$$,
  $$values (null::text, 'attended'::text), ('attended'::text, 'bunked'::text),
           ('bunked'::text, 'deleted'::text), ('bunked'::text, 'restored'::text)$$,
  'all four events survive owner update + delete attempts');
select results_eq(
  $$select count(*)::int from public.attendance_events
    where mark_id = '619b0000-0000-7000-8000-0000000000a1'$$,
  $$values (4)$$,
  'event count is still 4');
select throws_ok(
  $$insert into public.attendance_events (user_id, mark_id, occurrence_key, new_status)
    values ('019b0000-0000-7000-8000-0000000000a1', '619b0000-0000-7000-8000-0000000000a1', 'occ-audit', 'forged')$$,
  '42501', null, 'attendance_events: client cannot forge an event row');

select * from finish();
rollback;
