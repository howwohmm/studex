-- Constraint checks: unique occurrence key, baseline invariant,
-- minutes range, unit cap, start < end (05 §2, 06 §4.1).
begin;
create extension if not exists pgtap;

select plan(8);

insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status)
values (
  '619b0000-0000-7000-8000-000000000001', '019b0000-0000-7000-8000-0000000000a1',
  '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001',
  'occ-1', date '2026-11-21', 'attended');

select throws_ok(
  $$insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001',
            'occ-1', date '2026-11-21', 'bunked')$$,
  '23505', null, 'attendance_marks: (user_id, occurrence_key) is unique');

select throws_ok(
  $$insert into public.subjects (id, user_id, term_id, name, baseline_attended, baseline_held)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', 'bad', 9, 4)$$,
  '23514', null, 'subjects: baseline_attended must be <= baseline_held');

select throws_ok(
  $$insert into public.class_slots (id, user_id, term_id, weekday, start_minute, end_minute)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', 1, 1440, 1500)$$,
  '23514', null, 'class_slots: minutes capped at 1439');

select throws_ok(
  $$insert into public.class_slots (id, user_id, term_id, weekday, start_minute, end_minute)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', 1, 600, 540)$$,
  '23514', null, 'class_slots: start_minute must be < end_minute');

select throws_ok(
  $$insert into public.class_slots (id, user_id, term_id, weekday, start_minute, end_minute, units)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', 1, 540, 600, 1000001)$$,
  '23514', null, 'class_slots: units capped at 1,000,000');

select throws_ok(
  $$insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status, units)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001',
            'occ-2', date '2026-11-21', 'attended', 0)$$,
  '23514', null, 'attendance_marks: units must be >= 1');

select throws_ok(
  $$insert into public.attendance_marks (id, user_id, term_id, subject_id, occurrence_key, local_date, status)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', '319b0000-0000-7000-8000-000000000001',
            'occ-3', date '2026-11-21', 'excused')$$,
  '23514', null, 'attendance_marks: excused requires excused_kind');

select throws_ok(
  $$insert into public.term_breaks (id, user_id, term_id, starts_on, ends_on)
    values (gen_random_uuid(), '019b0000-0000-7000-8000-0000000000a1',
            '219b0000-0000-7000-8000-000000000001', date '2026-10-10', date '2026-10-01')$$,
  '23514', null, 'term_breaks: ends_on must be >= starts_on');

select * from finish();
rollback;
