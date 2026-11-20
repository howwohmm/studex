-- P0-10 PR #65 review fixes (forward-only; does not edit earlier migrations).
--
-- 1. attendance_marks.excused_kind must hold the excused mapping values
--    ('on_duty' | 'medical' | 'other'), not the contribution modes; plus
--    excused <=> excused_kind not null in both directions.
-- 2. The audit trigger must not fire on DELETE: account deletion cascades
--    auth.users -> marks, and inserting an event row mid-cascade violates the
--    event -> mark FK. Tombstones are UPDATEs of deleted_at, already audited;
--    hard deletes only occur in the server account-deletion pipeline.
-- 3. Cross-user parent references are closed with composite ownership FKs:
--    every user-owned parent gets UNIQUE (id, user_id) and each child FK is
--    replaced by FOREIGN KEY (parent_col, user_id) REFERENCES parent
--    (id, user_id), preserving ON DELETE semantics (ON DELETE SET NULL keeps
--    its column list so user_id is not nulled).
-- 4. links endpoints are validated by a trigger (polymorphic, cannot use FKs).
-- 5. support_messages: clients may only INSERT author_role 'user' messages on
--    their own tickets; no client UPDATE/DELETE.
-- Rollback note: drop the composite FKs/unique constraints/triggers/policies
-- added here and restore the single-column FKs and the DELETE audit branch.

-- --------------------------------------------------------------------------
-- 1. excused_kind mapping values
-- --------------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.attendance_marks'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%excused_kind%'
  loop
    execute format('alter table public.attendance_marks drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.attendance_marks
  add constraint attendance_marks_excused_kind_values
    check (excused_kind is null or excused_kind in ('on_duty', 'medical', 'other')),
  add constraint attendance_marks_excused_kind_required
    check ((status = 'excused') = (excused_kind is not null));

-- --------------------------------------------------------------------------
-- 2. Audit only INSERT/UPDATE; cascade event rows on mark deletion
-- --------------------------------------------------------------------------
create or replace function public.log_attendance_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
  v_new text;
begin
  if tg_op = 'INSERT' then
    v_old := null;
    v_new := new.status;
  else
    v_old := old.status;
    if new.deleted_at is not null and old.deleted_at is null then
      v_new := 'deleted';       -- tombstone is an UPDATE, still audited
    elsif new.deleted_at is null and old.deleted_at is not null then
      v_new := 'restored';
    else
      v_new := new.status;
    end if;
  end if;

  insert into public.attendance_events
    (user_id, mark_id, occurrence_key, old_status, new_status, source, hlc)
  values
    (new.user_id, new.id, new.occurrence_key, v_old, v_new, new.source, new.hlc);
  return new;
end;
$$;

drop trigger attendance_marks_audit on public.attendance_marks;
create trigger attendance_marks_audit
after insert or update on public.attendance_marks
for each row execute function public.log_attendance_event();

-- --------------------------------------------------------------------------
-- 3. Composite ownership FKs
-- --------------------------------------------------------------------------
-- UNIQUE (id, user_id) on every user-owned table that can be a parent.
do $$
declare
  t text;
  parents text[] := array[
    'terms', 'subjects', 'class_slots', 'slot_exceptions', 'attendance_marks',
    'units', 'topics', 'notes', 'tasks', 'events', 'exams', 'assessments',
    'folders', 'documents', 'annotations', 'support_tickets'
  ];
begin
  foreach t in array parents loop
    execute format(
      'alter table public.%I add constraint %I unique (id, user_id)',
      t, t || '_id_user_id_key');
  end loop;
end $$;

-- Re-point each child FK at (parent.id, parent.user_id). child_col null =>
-- the composite FK is skipped, matching the old single-column semantics.
do $$
declare
  r text[];
  edges text[][] := '{{profiles,terms,current_term_id,noaction},{term_holidays,terms,term_id,cascade},{term_breaks,terms,term_id,cascade},{day_order_overrides,terms,term_id,cascade},{subjects,terms,term_id,cascade},{baseline_history,subjects,subject_id,cascade},{class_slots,terms,term_id,cascade},{class_slots,subjects,subject_id,cascade},{slot_exceptions,terms,term_id,cascade},{slot_exceptions,class_slots,slot_id,cascade},{slot_exceptions,subjects,subject_id,noaction},{attendance_marks,terms,term_id,cascade},{attendance_marks,subjects,subject_id,cascade},{attendance_marks,class_slots,slot_id,noaction},{attendance_events,attendance_marks,mark_id,cascade},{units,subjects,subject_id,cascade},{topics,subjects,subject_id,cascade},{topics,units,unit_id,set null},{tasks,terms,term_id,cascade},{tasks,subjects,subject_id,noaction},{tasks,tasks,parent_id,noaction},{events,terms,term_id,cascade},{events,events,series_parent_id,noaction},{events,subjects,subject_id,noaction},{events,exams,exam_id,noaction},{events,tasks,task_id,noaction},{exams,terms,term_id,cascade},{exams,subjects,subject_id,noaction},{assessments,subjects,subject_id,cascade},{assessments,exams,exam_id,noaction},{folders,folders,parent_id,noaction},{folders,terms,term_id,noaction},{folders,subjects,subject_id,noaction},{documents,terms,term_id,noaction},{documents,subjects,subject_id,noaction},{documents,units,unit_id,noaction},{documents,topics,topic_id,noaction},{documents,folders,folder_id,noaction},{annotations,documents,document_id,cascade}}'::text[][];
  v_child text; v_parent text; v_col text; v_rule text; v_con record;
begin
  foreach r slice 1 in array edges loop
    v_child := r[1]; v_parent := r[2]; v_col := r[3]; v_rule := r[4];
    -- drop the existing single-column FK(s) to this parent
    for v_con in
      select con.oid, con.conname
      from pg_constraint con
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
      where con.conrelid = ('public.' || v_child)::regclass
        and con.confrelid = ('public.' || v_parent)::regclass
        and con.contype = 'f'
        and array_length(con.conkey, 1) = 1
        and a.attname = v_col
    loop
      execute format('alter table public.%I drop constraint %I', v_child, v_con.conname);
    end loop;
    execute format(
      'alter table public.%I add constraint %I
         foreign key (%I, user_id) references public.%I (id, user_id)
         on delete %s',
      v_child, v_child || '_' || v_col || '_owner_fkey', v_col, v_parent,
      case v_rule
        when 'cascade' then 'cascade'
        when 'set null' then format('set null (%I)', v_col)
        else 'no action'
      end);
  end loop;
end $$;

-- support_messages has no user_id column: add one, back-fill from the ticket
-- on insert, then apply the same composite ownership FK.
alter table public.support_messages
  add column user_id uuid references auth.users (id) on delete cascade;

create or replace function public.support_messages_set_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select user_id into new.user_id
  from public.support_tickets where id = new.ticket_id;
  if new.user_id is null then
    raise exception 'support_messages: ticket % not found', new.ticket_id;
  end if;
  return new;
end;
$$;

create trigger support_messages_fill_user
before insert on public.support_messages
for each row execute function public.support_messages_set_user();

alter table public.support_messages
  drop constraint support_messages_ticket_id_fkey,
  add constraint support_messages_ticket_owner_fkey
    foreign key (ticket_id, user_id) references public.support_tickets (id, user_id)
    on delete cascade;

-- --------------------------------------------------------------------------
-- 4. links endpoint validation (polymorphic: no FKs possible)
-- --------------------------------------------------------------------------
create or replace function public.link_endpoints_valid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_types text[] := array[
    'terms', 'subjects', 'class_slots', 'slot_exceptions', 'attendance_marks',
    'units', 'topics', 'notes', 'tasks', 'events', 'exams', 'assessments',
    'folders', 'documents', 'annotations'
  ];
  v_ok boolean;
begin
  if not (new.source_type = any (v_types)) then
    raise exception 'links: unknown source_type %', new.source_type;
  end if;
  if not (new.target_type = any (v_types)) then
    raise exception 'links: unknown target_type %', new.target_type;
  end if;
  execute format(
    'select exists (select 1 from public.%I where id = $1 and user_id = $2)',
    new.source_type)
    into v_ok using new.source_id, new.user_id;
  if not v_ok then
    raise exception 'links: source %/% not found or not owned by this user',
      new.source_type, new.source_id;
  end if;
  execute format(
    'select exists (select 1 from public.%I where id = $1 and user_id = $2)',
    new.target_type)
    into v_ok using new.target_id, new.user_id;
  if not v_ok then
    raise exception 'links: target %/% not found or not owned by this user',
      new.target_type, new.target_id;
  end if;
  return new;
end;
$$;

create trigger links_check_endpoints
before insert or update on public.links
for each row execute function public.link_endpoints_valid();

-- --------------------------------------------------------------------------
-- 5. support_messages: user-authored inserts only; no client update/delete
-- --------------------------------------------------------------------------
drop policy support_messages_owner on public.support_messages;

create policy support_messages_select on public.support_messages for select
  using (
    exists (
      select 1 from public.support_tickets st
      where st.id = ticket_id and st.user_id = auth.uid()
    )
  );
create policy support_messages_insert_user on public.support_messages for insert
  with check (
    author_role = 'user'
    and exists (
      select 1 from public.support_tickets st
      where st.id = ticket_id and st.user_id = auth.uid()
    )
  );
-- no UPDATE/DELETE policies: support/system messages are service-role writes.
