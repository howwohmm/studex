-- Server-only tables: authenticated and anon get nothing (10 §4).
begin;
create extension if not exists pgtap;

create or replace function pg_temp.server_tables()
returns text[] language sql as $$
  select array['user_roles', 'entitlements', 'usage_counters', 'audit_log', 'data_jobs']
$$;

select plan(5 + 5 + 3);

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select is_empty(format('select 1 from public.%I', t), t || ': authenticated sees 0 rows')
from unnest(pg_temp.server_tables()) t;

set local role anon;
set local request.jwt.claims to '';
select is_empty(format('select 1 from public.%I', t), t || ': anon sees 0 rows')
from unnest(pg_temp.server_tables()) t;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select throws_ok(
  $$insert into public.user_roles (user_id, role) values ('00000000-0000-4000-8000-0000000000a1', 'studex_admin')$$,
  '42501', null, 'user_roles: authenticated cannot self-grant a role');
select throws_ok(
  $$insert into public.audit_log (actor_id, action) values ('00000000-0000-4000-8000-0000000000a1', 'x')$$,
  '42501', null, 'audit_log: authenticated cannot write');
select throws_ok(
  $$insert into public.entitlements (user_id, plan) values ('00000000-0000-4000-8000-0000000000a1', 'pro')$$,
  '42501', null, 'entitlements: authenticated cannot write');

select * from finish();
rollback;
