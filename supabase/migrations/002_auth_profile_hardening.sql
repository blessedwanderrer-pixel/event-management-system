-- Harden signup profile creation and keep profiles.email in sync with Auth.
-- Trigger functions live in private so they are not callable through the Data API.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, supabase_auth_admin, service_role, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''), ''),
    new.email,
    'attendee'
  )
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = case
        when excluded.full_name <> '' then excluded.full_name
        else public.profiles.full_name
      end,
      updated_at = now();
  return new;
end;
$$;

create or replace function private.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email, updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
revoke all on function private.sync_profile_email_from_auth() from public;
grant execute on function private.handle_new_user() to postgres, supabase_auth_admin, service_role;
grant execute on function private.sync_profile_email_from_auth() to postgres, supabase_auth_admin, service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.sync_profile_email_from_auth();

drop function if exists public.handle_new_user();

-- Keep existing profile rows aligned with the linked Auth user.
update public.profiles as profile
set email = auth_user.email, updated_at = now()
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.email is distinct from auth_user.email;
