-- Server-only tables: authenticated and anon get nothing, even when rows
-- exist (seeded below so the read-denial is not vacuous).
begin;
create extension if not exists pgtap;

create or replace function pg_temp.server_tables()
returns text[] language sql as $$
  select array['user_roles', 'entitlements', 'usage_counters', 'audit_log', 'data_jobs']
$$;

select plan(5 + 5 + 5);

-- representative rows (as postgres / server path)
insert into public.user_roles (user_id, role)
values ('019b0000-0000-7000-8000-0000000000a1', 'support');
insert into public.entitlements (user_id, plan)
values ('019b0000-0000-7000-8000-0000000000a1', 'free');
insert into public.usage_counters (user_id, counter, period_start, value)
values ('019b0000-0000-7000-8000-0000000000a1', 'ai_calls', date '2026-11-01', 3);
insert into public.audit_log (actor_id, action)
values ('019b0000-0000-7000-8000-0000000000a1', 'test.event');
insert into public.data_jobs (user_id, kind)
values ('019b0000-0000-7000-8000-0000000000a1', 'export');

set local role authenticated;
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000a1", "role": "authenticated"}';
select is_empty(format('select 1 from public.%I', t), t || ': authenticated sees 0 rows (seeded)')
from unnest(pg_temp.server_tables()) t;

set local role anon;
set local request.jwt.claims to '';
select is_empty(format('select 1 from public.%I', t), t || ': anon sees 0 rows (seeded)')
from unnest(pg_temp.server_tables()) t;

set local role authenticated;
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000a1", "role": "authenticated"}';
select throws_ok(
  $$insert into public.user_roles (user_id, role) values ('019b0000-0000-7000-8000-0000000000a1', 'studex_admin')$$,
  '42501', null, 'user_roles: authenticated cannot self-grant a role');
select throws_ok(
  $$insert into public.audit_log (actor_id, action) values ('019b0000-0000-7000-8000-0000000000a1', 'x')$$,
  '42501', null, 'audit_log: authenticated cannot write');
select throws_ok(
  $$insert into public.entitlements (user_id, plan) values ('019b0000-0000-7000-8000-0000000000a1', 'pro')$$,
  '42501', null, 'entitlements: authenticated cannot write');
select throws_ok(
  $$insert into public.usage_counters (user_id, counter, period_start, value) values ('019b0000-0000-7000-8000-0000000000a1', 'ai_calls', date '2026-11-01', 9)$$,
  '42501', null, 'usage_counters: authenticated cannot write');
select throws_ok(
  $$insert into public.data_jobs (user_id, kind) values ('019b0000-0000-7000-8000-0000000000a1', 'delete')$$,
  '42501', null, 'data_jobs: authenticated cannot write');

select * from finish();
rollback;
