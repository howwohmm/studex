-- attendance_marks writes an attendance_events row on insert/update/tombstone.
begin;
create extension if not exists pgtap;

select plan(6);

insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status, source)
values (
  '60000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1',
  '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
  'occ-audit', date '2026-11-21', 'attended', 'seed-test');

select results_eq(
  $$select old_status, new_status from public.attendance_events
    where mark_id = '60000000-0000-4000-8000-0000000000a1' order by created_at$$,
  $$values (null::text, 'attended'::text)$$,
  'insert writes an event with null old_status');

update public.attendance_marks set status = 'bunked', hlc = '1.1.dev'
where id = '60000000-0000-4000-8000-0000000000a1';

select results_eq(
  $$select new_status from public.attendance_events
    where mark_id = '60000000-0000-4000-8000-0000000000a1' order by created_at$$,
  $$values ('attended'::text), ('bunked'::text)$$,
  'update writes an event with the new status');

-- tombstone (soft delete) writes a 'deleted' event
update public.attendance_marks set deleted_at = now(), hlc = '1.2.dev'
where id = '60000000-0000-4000-8000-0000000000a1';
select results_eq(
  $$select new_status from public.attendance_events
    where mark_id = '60000000-0000-4000-8000-0000000000a1' order by created_at$$,
  $$values ('attended'::text), ('bunked'::text), ('deleted'::text)$$,
  'tombstone writes a deleted event');

-- restore writes a 'restored' event
update public.attendance_marks set deleted_at = null, hlc = '1.3.dev'
where id = '60000000-0000-4000-8000-0000000000a1';
select results_eq(
  $$select new_status from public.attendance_events
    where mark_id = '60000000-0000-4000-8000-0000000000a1' order by created_at$$,
  $$values ('attended'::text), ('bunked'::text), ('deleted'::text), ('restored'::text)$$,
  'restore writes a restored event');

-- append-only: owner cannot update or delete event rows (RLS has no policies
-- for those commands, so 0 rows change).
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
update public.attendance_events set new_status = 'tampered';
select isnt_empty(
  $$select 1 from public.attendance_events where mark_id = '60000000-0000-4000-8000-0000000000a1' and new_status = 'restored'$$,
  'attendance_events: owner update is a no-op (append-only)');
delete from public.attendance_events where mark_id = '60000000-0000-4000-8000-0000000000a1';
select isnt_empty(
  $$select 1 from public.attendance_events where mark_id = '60000000-0000-4000-8000-0000000000a1'$$,
  'attendance_events: owner delete is a no-op (append-only)');

select * from finish();
rollback;
