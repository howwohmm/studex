-- P0-10 database foundation: helpers + Phase 1-2 tables (06 §4).
-- Conventions (§4.1): uuid PKs, client-generated on synced tables (no default);
-- created_at/updated_at trigger; deleted_at + hlc (+ field_hlc for column-level
-- LWW per §6.3) on synced tables; text+CHECK enums; bp ints; date for local
-- dates; class minutes smallint 0-1439 (start < end); units 1-1_000_000;
-- baselines 0 <= attended <= held.
-- Rollback note: drop the tables created here in dependency order, then the
-- helper functions and this migration's trigger.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Catalog (shared, read-mostly)
-- ---------------------------------------------------------------------------
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  aliases text[] not null default '{}',
  city text,
  state text,
  kind text,
  verified boolean not null default false,
  status text not null default 'active' check (status in ('active', 'merged', 'hidden')),
  merged_into uuid references public.institutions (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null,
  city text,
  state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null,
  short_name text,
  degree text,
  duration_years smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null,
  short_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.holiday_lists (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('national', 'state', 'institution')),
  region text,
  institution_id uuid references public.institutions (id),
  year smallint not null,
  entries jsonb not null default '[]',
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.grade_scales (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions (id) on delete cascade,
  name text not null,
  scale jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions (id) on delete cascade,
  program_id uuid references public.programs (id),
  name text not null,
  components jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Identity & platform
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_path text,
  institution_id uuid references public.institutions (id),
  campus_id uuid references public.campuses (id),
  program_id uuid references public.programs (id),
  department_id uuid references public.departments (id),
  year_of_study smallint,
  current_term_id uuid,
  timezone text not null default 'Asia/Kolkata',
  locale text,
  adult_confirmed boolean not null default false,
  onboarding jsonb not null default '{}',
  dashboard_layout jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('studex_admin', 'institution_admin', 'support')),
  granted_by uuid,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('analytics', 'ai_processing', 'scan_improvement', 'parental')),
  notice_version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  channel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  push_token text,
  app_version text,
  os_version text,
  notifications_enabled boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null,
  source text,
  trial_ends_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  counter text not null,
  period_start date not null,
  value bigint not null default 0 check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, counter, period_start)
);

create table public.feature_flags (
  key text primary key,
  rules jsonb not null default '{}',
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text,
  action text not null,
  target_type text,
  target_id text,
  summary jsonb not null default '{}',
  reason text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text,
  body text not null,
  attachments jsonb not null default '[]',
  status text not null default 'open' check (status in ('open', 'pending', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_role text not null check (author_role in ('user', 'support', 'system')),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.data_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('export', 'delete')),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed', 'cancelled')),
  scheduled_for timestamptz,
  completed_at timestamptz,
  result_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Academic core (synced)
-- ---------------------------------------------------------------------------
create table public.terms (
  id uuid primary key, -- client-generated (synced)
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  academic_year text,
  start_date date,
  end_date date,
  timezone text not null default 'Asia/Kolkata',
  schedule_mode text not null default 'weekly' check (schedule_mode in ('weekly', 'day_order')),
  cycle_length smallint,
  working_weekdays smallint[] not null default '{1,2,3,4,5}'
    check (working_weekdays <@ '{0,1,2,3,4,5,6}'::smallint[]),
  attendance_policy jsonb not null default '{}',
  gpa_policy jsonb not null default '{}',
  selected_batch text,
  status text not null default 'active' check (status in ('active', 'archived')),
  institution_id uuid references public.institutions (id),
  program_id uuid references public.programs (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  field_hlc jsonb not null default '{}',
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.term_holidays (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  date date not null,
  name text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  unique (term_id, date)
);

create table public.term_breaks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  check (ends_on >= starts_on)
);

create table public.day_order_overrides (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  date date not null,
  day_order smallint not null check (day_order >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  unique (term_id, date)
);

create table public.subjects (
  id uuid primary key, -- client-generated (synced)
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  name text not null,
  short_name text,
  code text,
  color text,
  kind text,
  credits numeric(4, 1),
  faculty text[] not null default '{}',
  description text,
  policy_override jsonb,
  baseline_attended integer not null default 0 check (baseline_attended >= 0),
  baseline_held integer not null default 0 check (baseline_held >= 0),
  baseline_as_of date,
  counts_in_overall boolean not null default true,
  catalog_course_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  field_hlc jsonb not null default '{}',
  check (baseline_attended <= baseline_held)
);

create table public.baseline_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  attended integer not null check (attended >= 0),
  held integer not null check (held >= 0),
  as_of date,
  source text,
  created_at timestamptz not null default now(),
  check (attended <= held)
);

create table public.class_slots (
  id uuid primary key, -- client-generated (synced)
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete cascade,
  kind text,
  weekday smallint check (weekday between 0 and 6),
  day_order smallint check (day_order >= 1),
  week_parity text check (week_parity in ('odd', 'even')),
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute smallint not null check (end_minute between 0 and 1439),
  room text,
  faculty text,
  batch text,
  units integer not null default 1 check (units between 1 and 1000000),
  valid_from date,
  valid_until date,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  field_hlc jsonb not null default '{}',
  check (start_minute < end_minute),
  check (weekday is not null or day_order is not null)
);

create table public.slot_exceptions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  slot_id uuid references public.class_slots (id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('cancel', 'move', 'room', 'extra')),
  subject_id uuid references public.subjects (id),
  start_minute smallint check (start_minute between 0 and 1439),
  end_minute smallint check (end_minute between 0 and 1439),
  room text,
  units integer check (units between 1 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  check (start_minute is null or end_minute is null or start_minute < end_minute)
);

create table public.attendance_marks (
  id uuid primary key, -- client-generated (synced)
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  occurrence_key text not null,
  local_date date not null,
  slot_id uuid references public.class_slots (id),
  status text not null check (status in ('attended', 'bunked', 'cancelled', 'excused')),
  excused_kind text check (excused_kind in ('present', 'excluded', 'absent')),
  units integer not null default 1 check (units between 1 and 1000000),
  source text,
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  unique (user_id, occurrence_key),
  check (status <> 'excused' or excused_kind is not null)
);

create table public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mark_id uuid,
  occurrence_key text not null,
  old_status text,
  new_status text not null,
  source text,
  device_id uuid,
  hlc text,
  created_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  number smallint,
  title text,
  position integer,
  hours numeric(5, 1),
  weight_bp integer check (weight_bp between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  field_hlc jsonb not null default '{}'
);

create table public.topics (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  title text,
  description text,
  position integer,
  status text,
  difficulty smallint check (difficulty between 1 and 5),
  priority smallint,
  est_minutes integer check (est_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  field_hlc jsonb not null default '{}'
);

create table public.notes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  doc jsonb,
  plain_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text
);

create table public.links (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text
);

create table public.tasks (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid references public.terms (id) on delete cascade,
  subject_id uuid references public.subjects (id),
  parent_id uuid references public.tasks (id),
  title text not null,
  notes_doc jsonb,
  type text,
  status text not null default 'open' check (status in ('open', 'done', 'dropped')),
  priority smallint,
  due_date date,
  due_at timestamptz,
  estimate_min integer check (estimate_min >= 0),
  rrule text,
  completed_at timestamptz,
  position integer,
  reminders jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  field_hlc jsonb not null default '{}'
);

create table public.events (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid references public.terms (id) on delete cascade,
  type text,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  all_day_start date,
  all_day_end date,
  timezone text,
  location text,
  notes text,
  rrule text,
  exdates date[],
  series_parent_id uuid references public.events (id),
  subject_id uuid references public.subjects (id),
  exam_id uuid,
  task_id uuid references public.tasks (id),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  field_hlc jsonb not null default '{}'
);

create table public.exams (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  subject_id uuid references public.subjects (id),
  type text,
  title text not null,
  starts_at timestamptz,
  duration_min integer check (duration_min > 0),
  venue text,
  seat text,
  max_marks numeric(6, 2),
  weight_bp integer check (weight_bp between 0 and 10000),
  scope jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text,
  field_hlc jsonb not null default '{}'
);

create table public.assessments (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  component text not null,
  weight_bp integer check (weight_bp between 0 and 10000),
  max_marks numeric(6, 2),
  obtained numeric(6, 2),
  exam_id uuid references public.exams (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text
);

-- ---------------------------------------------------------------------------
-- Library (metadata synced)
-- ---------------------------------------------------------------------------
create table public.folders (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.folders (id),
  name text not null,
  term_id uuid references public.terms (id),
  subject_id uuid references public.subjects (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text
);

create table public.documents (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  original_filename text,
  mime text,
  size_bytes bigint check (size_bytes >= 0),
  page_count integer check (page_count >= 0),
  sha256 text,
  storage_path text,
  rendition_path text,
  thumbnail_path text,
  source text,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'ready', 'partial', 'failed')),
  status_detail jsonb,
  pipeline_version text,
  language text,
  term_id uuid references public.terms (id),
  subject_id uuid references public.subjects (id),
  unit_id uuid references public.units (id),
  topic_id uuid references public.topics (id),
  folder_id uuid references public.folders (id),
  filing_state text not null default 'user' check (filing_state in ('user', 'suggested', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text
);

create table public.annotations (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  page_no integer not null check (page_no >= 1),
  kind text not null check (kind in ('highlight', 'note', 'bookmark')),
  anchor jsonb,
  color text,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hlc text
);

-- events.exam_id FK (deferred to keep exam creation order simple)
alter table public.events
  add constraint events_exam_id_fkey foreign key (exam_id) references public.exams (id);

-- profiles.current_term_id FK
alter table public.profiles
  add constraint profiles_current_term_fkey foreign key (current_term_id) references public.terms (id);

-- ---------------------------------------------------------------------------
-- attendance_marks -> attendance_events audit trigger (06 §4.2, append-only)
-- ---------------------------------------------------------------------------
create or replace function public.log_attendance_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
  v_new text;
  v_source text;
  v_hlc text;
begin
  if tg_op = 'INSERT' then
    v_old := null;
    v_new := new.status;
    v_source := new.source;
    v_hlc := new.hlc;
  elsif tg_op = 'DELETE' then
    v_old := old.status;
    v_new := 'deleted';
    v_source := null;
    v_hlc := null;
  else
    v_old := old.status;
    if new.deleted_at is not null and old.deleted_at is null then
      v_new := 'deleted';
    elsif new.deleted_at is null and old.deleted_at is not null then
      v_new := 'restored';
    else
      v_new := new.status;
    end if;
    v_source := new.source;
    v_hlc := new.hlc;
  end if;

  insert into public.attendance_events
    (user_id, mark_id, occurrence_key, old_status, new_status, source, hlc)
  values
    (coalesce(new.user_id, old.user_id), coalesce(new.id, old.id),
     coalesce(new.occurrence_key, old.occurrence_key), v_old, v_new, v_source, v_hlc);
  return coalesce(new, old);
end;
$$;

create trigger attendance_marks_audit
after insert or update or delete on public.attendance_marks
for each row execute function public.log_attendance_event();

-- updated_at triggers on every table that has the column
do $$
declare
  t text;
begin
  foreach t in array array[
    'institutions', 'campuses', 'programs', 'departments', 'holiday_lists',
    'grade_scales', 'assessment_templates', 'profiles', 'consents', 'devices',
    'entitlements', 'usage_counters', 'support_tickets', 'data_jobs',
    'terms', 'term_holidays', 'term_breaks', 'day_order_overrides', 'subjects',
    'class_slots', 'slot_exceptions', 'attendance_marks', 'units', 'topics',
    'notes', 'links', 'tasks', 'events', 'exams', 'assessments', 'folders',
    'documents', 'annotations'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Useful indexes (06 §6.1 mirrors the hot query paths)
create index on public.class_slots (term_id, weekday);
create index on public.attendance_marks (term_id, local_date);
create index on public.attendance_marks (subject_id);
create index on public.attendance_events (mark_id);
create index on public.subjects (term_id) where archived_at is null;
create index on public.documents (subject_id);
