-- Every auth user gets exactly one profiles row (deleted by the existing
-- auth.users -> profiles cascade on account deletion).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, timezone, locale)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    coalesce(new.raw_user_meta_data ->> 'timezone', 'Asia/Kolkata'),
    new.raw_user_meta_data ->> 'locale'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
