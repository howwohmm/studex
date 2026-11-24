-- SYNTHETIC seed for local development only.
-- One demo user, one institution, one term, five subjects.
-- All names/values are fictional; do not use outside `supabase db reset`.

insert into auth.users (id, email, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('019b0000-0000-7000-8000-0000000000a1', 'demo@studex.local', 'authenticated', 'authenticated', '', now(), now(), now(), '{}', '{}')
on conflict (id) do nothing;

insert into public.institutions (id, name, short_name, city, state, kind, verified)
values
  ('119b0000-0000-7000-8000-000000000001', 'Ramaiah University of Applied Sciences', 'RUAS', 'Bengaluru', 'Karnataka', 'university', true);

-- on_auth_user_created already inserted the profile; enrich the demo row.
update public.profiles
set display_name = 'Demo Student',
    institution_id = '119b0000-0000-7000-8000-000000000001',
    timezone = 'Asia/Kolkata',
    adult_confirmed = true
where user_id = '019b0000-0000-7000-8000-0000000000a1';

insert into public.terms (id, user_id, label, academic_year, start_date, end_date, schedule_mode, attendance_policy, institution_id)
values
  ('219b0000-0000-7000-8000-000000000001', '019b0000-0000-7000-8000-0000000000a1', 'Sem 4', '2026-27', date '2026-08-03', date '2026-12-20', 'weekly',
   '{"thresholdBp": 7500, "rounding": "half_up_integer", "basis": "overall", "excused": null}', '119b0000-0000-7000-8000-000000000001');

insert into public.subjects (id, user_id, term_id, name, short_name, code, kind, credits, baseline_attended, baseline_held, baseline_as_of)
values
  ('319b0000-0000-7000-8000-000000000001', '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', 'Database Management Systems', 'DBMS', 'CS401', 'lecture', 4, 6, 8, date '2026-11-20'),
  ('319b0000-0000-7000-8000-000000000002', '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', 'Operating Systems', 'OS', 'CS402', 'lecture', 4, 5, 7, date '2026-11-20'),
  ('319b0000-0000-7000-8000-000000000003', '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', 'Computer Networks Lab', 'CN Lab', 'CS403', 'lab', 2, 7, 9, date '2026-11-20'),
  ('319b0000-0000-7000-8000-000000000004', '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', 'Design and Analysis of Algorithms', 'DAA', 'CS404', 'lecture', 4, 6, 8, date '2026-11-20'),
  ('319b0000-0000-7000-8000-000000000005', '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', 'Physical Education II', 'PE-II', 'PE201', 'elective', 1, 6, 8, date '2026-11-20');

insert into public.class_slots (id, user_id, term_id, subject_id, kind, weekday, start_minute, end_minute, room, units, valid_from, source)
values
  ('419b0000-0000-7000-8000-000000000001', '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001', 'lecture', 1, 540, 600, 'LH-204', 1, date '2026-08-03', 'seed'),
  ('419b0000-0000-7000-8000-000000000002', '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000002', 'lecture', 1, 600, 660, 'LH-105', 1, date '2026-08-03', 'seed'),
  ('419b0000-0000-7000-8000-000000000003', '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000003', 'lab', 1, 660, 780, 'C-302', 2, date '2026-08-03', 'seed'),
  ('419b0000-0000-7000-8000-000000000004', '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000004', 'lecture', 1, 840, 900, 'LH-204', 1, date '2026-08-03', 'seed'),
  ('419b0000-0000-7000-8000-000000000005', '019b0000-0000-7000-8000-0000000000a1', '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000005', 'elective', 1, 960, 1020, 'Sports Complex', 1, date '2026-08-03', 'seed');
