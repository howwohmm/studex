-- Catalog: readable by anon + authenticated; writes need studex_admin + aal2.
-- Every catalog table is exercised: seeded fixture + anon/auth read +
-- user write denied + admin-without-aal2 denied + admin+aal2 write ok.
begin;
create extension if not exists pgtap;

create or replace function pg_temp.catalog_tables()
returns text[] language sql as $$
  select array[
    'institutions', 'campuses', 'programs', 'departments',
    'holiday_lists', 'grade_scales', 'assessment_templates'
  ]
$$;

-- plan: 7 anon reads + 7 auth reads + 7 denied writes + 7 aal1 denied
--     + 7 admin writes + 1 feature_flags read = 36
select plan(37);

-- fixtures so reads are non-vacuous (institutions is already seeded)
insert into public.campuses (id, institution_id, name)
values ('119b0000-0000-7000-8000-0000000000c1', '119b0000-0000-7000-8000-000000000001', 'Main');
insert into public.programs (id, institution_id, name)
values ('119b0000-0000-7000-8000-0000000000c2', '119b0000-0000-7000-8000-000000000001', 'B.Tech CSE');
insert into public.departments (id, institution_id, name)
values ('119b0000-0000-7000-8000-0000000000c3', '119b0000-0000-7000-8000-000000000001', 'CSE');
insert into public.holiday_lists (scope, year) values ('state', 2026);
insert into public.grade_scales (name) values ('10-point');
insert into public.assessment_templates (name) values ('CIE');

set local role anon;
set local request.jwt.claims to '';
select isnt_empty(format('select 1 from public.%I', t), t || ': anon can read')
from unnest(pg_temp.catalog_tables()) t;

set local role authenticated;
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000a1", "role": "authenticated"}';
select isnt_empty(format('select 1 from public.%I', t), t || ': authenticated can read')
from unnest(pg_temp.catalog_tables()) t;

-- ordinary authenticated user cannot write any catalog table
select throws_ok(
  format('insert into public.%I (%s) values (%s)', t,
         case t when 'campuses' then 'institution_id, name'
                when 'programs' then 'institution_id, name'
                when 'departments' then 'institution_id, name'
                when 'holiday_lists' then 'scope, year'
                else 'name' end,
         case t when 'campuses' then '''119b0000-0000-7000-8000-000000000001'', ''x'''
                when 'programs' then '''119b0000-0000-7000-8000-000000000001'', ''x'''
                when 'departments' then '''119b0000-0000-7000-8000-000000000001'', ''x'''
                when 'holiday_lists' then '''national'', 2027'
                else '''x''' end),
  '42501', null, t || ': authenticated cannot write')
from unnest(pg_temp.catalog_tables()) t;

-- studex_admin claim without aal2 cannot write
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000a1", "role": "authenticated", "app_metadata": {"role": "studex_admin"}, "aal": "aal1"}';
select throws_ok(
  format('insert into public.%I (%s) values (%s)', t,
         case t when 'campuses' then 'institution_id, name'
                when 'programs' then 'institution_id, name'
                when 'departments' then 'institution_id, name'
                when 'holiday_lists' then 'scope, year'
                else 'name' end,
         case t when 'campuses' then '''119b0000-0000-7000-8000-000000000001'', ''x'''
                when 'programs' then '''119b0000-0000-7000-8000-000000000001'', ''x'''
                when 'departments' then '''119b0000-0000-7000-8000-000000000001'', ''x'''
                when 'holiday_lists' then '''national'', 2027'
                else '''x''' end),
  '42501', null, t || ': studex_admin without aal2 cannot write')
from unnest(pg_temp.catalog_tables()) t;

-- studex_admin + aal2 can write every catalog table
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000a1", "role": "authenticated", "app_metadata": {"role": "studex_admin"}, "aal": "aal2"}';
select lives_ok(
  format('insert into public.%I (%s) values (%s)', t,
         case t when 'campuses' then 'institution_id, name'
                when 'programs' then 'institution_id, name'
                when 'departments' then 'institution_id, name'
                when 'holiday_lists' then 'scope, year'
                else 'name' end,
         case t when 'campuses' then '''119b0000-0000-7000-8000-000000000001'', ''x'''
                when 'programs' then '''119b0000-0000-7000-8000-000000000001'', ''x'''
                when 'departments' then '''119b0000-0000-7000-8000-000000000001'', ''x'''
                when 'holiday_lists' then '''national'', 2027'
                else '''x''' end),
  t || ': studex_admin + aal2 can write')
from unnest(pg_temp.catalog_tables()) t;

select lives_ok(
  $$insert into public.feature_flags (key, rules) values ('beta_tutor', '{}')$$,
  'feature_flags: studex_admin + aal2 can write');

-- feature_flags readable by any authenticated user (non-vacuous)
set local request.jwt.claims to '{"sub": "019b0000-0000-7000-8000-0000000000a1", "role": "authenticated"}';
select isnt_empty('select 1 from public.feature_flags', 'feature_flags: authenticated can read');

select * from finish();
rollback;
