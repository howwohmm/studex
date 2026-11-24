begin;
select plan(6);

-- server-only tables: RLS on, zero client policies
select ok(
  (select relrowsecurity from pg_class where oid = 'public.idempotency_keys'::regclass),
  'idempotency_keys has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.rate_limit_hits'::regclass),
  'rate_limit_hits has RLS enabled'
);
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename in ('idempotency_keys', 'rate_limit_hits')),
  0,
  'no client policies on idempotency_keys or rate_limit_hits'
);

-- unique key per user
select ok(
  (select count(*) = 1 from pg_constraint where conrelid = 'public.idempotency_keys'::regclass and contype = 'u' and conkey = (select array_agg(attnum order by attnum) from pg_attribute where attrelid = 'public.idempotency_keys'::regclass and attname in ('user_id', 'key'))),
  'idempotency_keys unique on (user_id, key)'
);
select throws_ok(
  $$insert into public.idempotency_keys (user_id, key, request_hash, response) values
    (null, 'k1', 'h1', '{}'),
    (null, 'k1', 'h2', '{}')$$,
  '23502',
  null,
  'idempotency_keys.user_id is not null'
);
select lives_ok(
  $$insert into public.rate_limit_hits (identity, route) values ('user:x', '/v1/devices'), ('ip:1.2.3.4', '/v1/devices')$$,
  'rate_limit_hits accepts rows'
);

select * from finish();
rollback;
