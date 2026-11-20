-- baseline_history is append-only per 06 §6.3.
begin;
create extension if not exists pgtap;

select plan(3);

insert into public.baseline_history (user_id, subject_id, attended, held, as_of, source)
values ('00000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-000000000001', 6, 8, date '2026-11-19', 'seed-test');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select isnt_empty(
  $$select 1 from public.baseline_history where subject_id = '30000000-0000-4000-8000-000000000001'$$,
  'baseline_history: owner can read');
update public.baseline_history set attended = 99;
select results_eq(
  $$select attended from public.baseline_history where subject_id = '30000000-0000-4000-8000-000000000001'$$,
  $$values (6)$$,
  'baseline_history: owner update is a no-op');
delete from public.baseline_history where subject_id = '30000000-0000-4000-8000-000000000001';
select results_eq(
  $$select count(*)::int from public.baseline_history where subject_id = '30000000-0000-4000-8000-000000000001'$$,
  $$values (1)$$,
  'baseline_history: owner delete is a no-op');

select * from finish();
rollback;
