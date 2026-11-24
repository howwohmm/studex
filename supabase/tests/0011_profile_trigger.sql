begin;
select plan(4);

-- Creating an auth user creates exactly one profiles row.
insert into auth.users (id, email, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('019c0000-0000-7000-8000-0000000000d1', 'triggered@studex.local', 'authenticated', 'authenticated', '', now(), now(), now(), '{}', '{"display_name": "Trig User", "timezone": "Europe/London"}');

select is(
  (select count(*)::int from public.profiles where user_id = '019c0000-0000-7000-8000-0000000000d1'),
  1,
  'signup creates exactly one profiles row'
);
select is(
  (select display_name from public.profiles where user_id = '019c0000-0000-7000-8000-0000000000d1'),
  'Trig User',
  'profile carries display_name from raw_user_meta_data'
);
select is(
  (select timezone from public.profiles where user_id = '019c0000-0000-7000-8000-0000000000d1'),
  'Europe/London',
  'profile carries timezone from raw_user_meta_data'
);

-- Deleting the user removes the profile via cascade.
delete from auth.users where id = '019c0000-0000-7000-8000-0000000000d1';
select is(
  (select count(*)::int from public.profiles where user_id = '019c0000-0000-7000-8000-0000000000d1'),
  0,
  'deleting the auth user cascades the profile away'
);

select * from finish();
rollback;
