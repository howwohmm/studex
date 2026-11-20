-- Catalog: readable by anon + authenticated; writes need studex_admin + aal2.
begin;
create extension if not exists pgtap;

select plan(8);

set local role anon;
set local request.jwt.claims to '';
select isnt_empty('select 1 from public.institutions', 'institutions: anon can read');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select isnt_empty('select 1 from public.institutions', 'institutions: authenticated can read');

-- ordinary authenticated user cannot write
select throws_ok(
  $$insert into public.institutions (name) values ('x')$$,
  '42501', null, 'institutions: authenticated cannot write');
select throws_ok(
  $$insert into public.grade_scales (name) values ('x')$$,
  '42501', null, 'grade_scales: authenticated cannot write');

-- studex_admin claim without aal2 cannot write
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {"role": "studex_admin"}, "aal": "aal1"}';
select throws_ok(
  $$insert into public.institutions (name) values ('x')$$,
  '42501', null, 'institutions: studex_admin without aal2 cannot write');

-- studex_admin + aal2 can write
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {"role": "studex_admin"}, "aal": "aal2"}';
select lives_ok(
  $$insert into public.institutions (name) values ('Admin U')$$,
  'institutions: studex_admin + aal2 can write');
select lives_ok(
  $$insert into public.feature_flags (key, rules) values ('beta_tutor', '{}')$$,
  'feature_flags: studex_admin + aal2 can write');

-- feature_flags readable by any authenticated user without admin
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select lives_ok('select 1 from public.feature_flags', 'feature_flags: authenticated can read');

select * from finish();
rollback;
