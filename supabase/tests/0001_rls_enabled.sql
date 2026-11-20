-- Every public table must have RLS enabled (10 §4).
begin;
create extension if not exists pgtap;

select plan(1);

select is_empty(
  $$ select schemaname || '.' || tablename
     from pg_tables t join pg_class c on c.relname = t.tablename
     join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
     where t.schemaname = 'public' and not c.relrowsecurity $$,
  'every public table has row level security enabled'
);

select * from finish();
rollback;
