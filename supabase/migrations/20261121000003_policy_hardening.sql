-- P0-10 PR #65 round 2 (forward-only).
-- 1. Synced tables (the ones carrying deleted_at) lose the blanket FOR ALL
--    owner policy: clients get SELECT/INSERT/UPDATE only. Deletes are
--    tombstones; hard deletes happen only in the account-deletion cascade.
-- 2. attendance_events loses client INSERT; only the SECURITY DEFINER audit
--    trigger writes it.
-- 3. consents: insert + select + withdraw-only updates (enforced by trigger);
--    no delete.
-- 4. Least-privilege support access: a `support` app_metadata role claim with
--    aal2 can read tickets/messages and post author_role='support' replies.
-- 5. feature_flags gets the updated_at trigger it was missing.
-- 6. Server-default PKs move to a pure-SQL uuid_generate_v7() (UUIDv7).
-- Rollback note: restore the *_owner FOR ALL policies, the
-- attendance_events_insert policy, the consents/devices/support policies,
-- and the gen_random_uuid() defaults; drop the helpers created here.

-- --------------------------------------------------------------------------
-- UUIDv7 (time-ordered), pure SQL. Layout: 48-bit ms epoch | ver 7 | 12-bit
-- rand | var 10 | 62-bit rand.
-- --------------------------------------------------------------------------
create or replace function public.uuid_generate_v7()
returns uuid
language sql
volatile
set search_path = ''
as $$
  select (
    lpad(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint), 12, '0')
    || '-7' || substr(lpad(to_hex((random() * 281474976710655)::bigint), 12, '0'), 4, 3)
    || '-' || substr('89ab', (floor(random() * 4) + 1)::int, 1)
    || substr(lpad(to_hex((random() * 281474976710655)::bigint), 12, '0'), 4, 3)
    || '-' || lpad(to_hex((random() * 281474976710655)::bigint), 12, '0')
  )::uuid;
$$;

do $$
declare
  t text;
  v7_tables text[] := array[
    'consents', 'devices', 'entitlements', 'institutions', 'campuses',
    'programs', 'departments', 'holiday_lists', 'grade_scales',
    'assessment_templates', 'support_tickets', 'support_messages', 'data_jobs',
    'baseline_history', 'attendance_events'
  ];
begin
  foreach t in array v7_tables loop
    execute format(
      'alter table public.%I alter column id set default public.uuid_generate_v7()',
      t);
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- 1. Synced owner tables: FOR ALL -> SELECT/INSERT/UPDATE (no client DELETE)
-- --------------------------------------------------------------------------
do $$
declare
  t text;
  synced text[] := array[
    'profiles', 'terms', 'term_holidays', 'term_breaks', 'day_order_overrides',
    'subjects', 'class_slots', 'slot_exceptions', 'attendance_marks', 'units',
    'topics', 'notes', 'links', 'tasks', 'events', 'exams', 'assessments',
    'folders', 'documents', 'annotations'
  ];
begin
  foreach t in array synced loop
    execute format('drop policy %I_owner on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select using (user_id = auth.uid())',
      t, t);
    execute format(
      'create policy %I_insert on public.%I for insert with check (user_id = auth.uid())',
      t, t);
    execute format(
      'create policy %I_update on public.%I for update
         using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t, t);
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- 2. attendance_events: select-only for clients; the audit trigger writes it
--    (log_attendance_event is already SECURITY DEFINER with a fixed path).
-- --------------------------------------------------------------------------
drop policy attendance_events_insert on public.attendance_events;

-- --------------------------------------------------------------------------
-- 3. consents: insert/select + withdraw-only update, no delete
-- --------------------------------------------------------------------------
drop policy consents_owner on public.consents;
create policy consents_select on public.consents for select
  using (user_id = auth.uid());
create policy consents_insert on public.consents for insert
  with check (user_id = auth.uid());
create policy consents_update on public.consents for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.consents_withdraw_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- every field except withdrawn_at must be unchanged
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.purpose is distinct from old.purpose
     or new.notice_version is distinct from old.notice_version
     or new.granted_at is distinct from old.granted_at
     or new.channel is distinct from old.channel
     or new.created_at is distinct from old.created_at then
    raise exception 'consents: only withdrawn_at may be updated';
  end if;
  -- withdrawal is one-way
  if old.withdrawn_at is not null and new.withdrawn_at is distinct from old.withdrawn_at then
    raise exception 'consents: withdrawn_at cannot be changed once set';
  end if;
  return new;
end;
$$;

create trigger consents_withdraw_only
before update on public.consents
for each row execute function public.consents_withdraw_only();

-- --------------------------------------------------------------------------
-- 4. support role (app_metadata.role = 'support') + aal2
-- --------------------------------------------------------------------------
create or replace function public.is_support()
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
    ) = 'support'
    and (auth.jwt() ->> 'aal') = 'aal2'
  );
$$;

revoke all on function public.is_support() from public;
grant execute on function public.is_support() to anon, authenticated;

create policy support_tickets_support_read on public.support_tickets for select
  using (public.is_support());
create policy support_messages_support_read on public.support_messages for select
  using (public.is_support());
create policy support_messages_support_insert on public.support_messages for insert
  with check (author_role = 'support' and public.is_support());

-- --------------------------------------------------------------------------
-- 5. feature_flags.updated_at trigger
-- --------------------------------------------------------------------------
create trigger set_updated_at
before update on public.feature_flags
for each row execute function public.set_updated_at();
