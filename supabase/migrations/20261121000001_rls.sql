-- P0-10: row-level security on every table (06 §4.3).
-- - Owner tables: USING/WITH CHECK user_id = auth.uid().
-- - Server-only (user_roles, entitlements, usage_counters, audit_log,
--   data_jobs): RLS enabled, no client policies.
-- - Catalog: readable by anon + authenticated; writes need the studex_admin
--   role claim AND aal2.
-- - Append-only (baseline_history, attendance_events): select/insert only.
-- Rollback note: drop the policies and helpers created here.

-- studex_admin claim + MFA check. SECURITY DEFINER with a fixed search_path.
create or replace function public.is_studex_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() ->> 'role'
    ) = 'studex_admin'
    and (auth.jwt() ->> 'aal') = 'aal2'
  );
$$;

revoke all on function public.is_studex_admin() from public;
grant execute on function public.is_studex_admin() to anon, authenticated;

-- Enable RLS on every public table created by the schema migration.
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Owner policies (every user-owned table): full CRUD on own rows.
-- support_messages has no user_id: ownership goes through its ticket.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  owner_tables text[] := array[
    'profiles', 'consents', 'devices', 'support_tickets', 'calendar_feeds',
    'terms', 'term_holidays', 'term_breaks', 'day_order_overrides', 'subjects',
    'class_slots', 'slot_exceptions', 'attendance_marks', 'units', 'topics',
    'notes', 'links', 'tasks', 'events', 'exams', 'assessments',
    'folders', 'documents', 'annotations'
  ];
begin
  foreach t in array owner_tables loop
    execute format(
      'create policy %I_owner on public.%I for all
       using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t, t);
  end loop;
end $$;

create policy support_messages_owner on public.support_messages for all
  using (
    exists (
      select 1 from public.support_tickets st
      where st.id = ticket_id and st.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.support_tickets st
      where st.id = ticket_id and st.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Append-only tables: owner select + insert, never update/delete.
-- ---------------------------------------------------------------------------
create policy baseline_history_select on public.baseline_history for select
  using (user_id = auth.uid());
create policy baseline_history_insert on public.baseline_history for insert
  with check (user_id = auth.uid());

create policy attendance_events_select on public.attendance_events for select
  using (user_id = auth.uid());
create policy attendance_events_insert on public.attendance_events for insert
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Catalog: readable by everyone, writable only by studex_admin + aal2.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  catalog_tables text[] := array[
    'institutions', 'campuses', 'programs', 'departments',
    'holiday_lists', 'grade_scales', 'assessment_templates'
  ];
begin
  foreach t in array catalog_tables loop
    execute format(
      'create policy %I_read on public.%I for select using (true)', t, t);
    execute format(
      'create policy %I_admin_write on public.%I for all
       using (public.is_studex_admin()) with check (public.is_studex_admin())',
      t, t);
  end loop;
end $$;

-- feature_flags: admin-managed, readable by clients (GET /v1/flags).
create policy feature_flags_read on public.feature_flags for select
  using (true);
create policy feature_flags_admin_write on public.feature_flags for all
  using (public.is_studex_admin())
  with check (public.is_studex_admin());

-- Server-only tables (user_roles, entitlements, usage_counters, audit_log,
-- data_jobs): RLS is enabled above; no policies => no client access.
