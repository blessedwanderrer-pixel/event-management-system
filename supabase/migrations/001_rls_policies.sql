-- Apply in Supabase SQL Editor with the postgres/service role.
-- This migration assumes profiles, events, and registrations already exist.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_profile_role()
returns text
language sql
security definer
set search_path = public, pg_catalog
stable
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_catalog
stable
as $$
  select coalesce((select private.current_profile_role()) = 'admin', false);
$$;

create or replace function private.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'profile role can only be changed by an administrative database process';
  end if;
  return new;
end;
$$;

revoke all on function private.current_profile_role() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.prevent_profile_role_change() from public;
grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;

-- Re-running the migration is safe.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists events_select_published_or_admin on public.events;
drop policy if exists events_admin_insert on public.events;
drop policy if exists events_admin_update on public.events;
drop policy if exists events_admin_delete on public.events;
drop policy if exists registrations_select_own on public.registrations;
drop policy if exists registrations_insert_own on public.registrations;
drop policy if exists registrations_update_own on public.registrations;
drop policy if exists profiles_role_immutable on public.profiles;
drop policy if exists events_insert_admin_only on public.events;
drop policy if exists events_update_admin_only on public.events;
drop policy if exists events_delete_admin_only on public.events;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = (select private.current_profile_role())
  );

-- Restrictive policies are combined with any existing permissive policies using
-- AND, preventing legacy/broad policies from allowing role escalation.
create policy profiles_role_immutable on public.profiles
  as restrictive
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = (select private.current_profile_role())
  );

create policy events_select_published_or_admin on public.events
  for select to authenticated
  using (status = 'published' or (select private.is_admin()));

create policy events_admin_insert on public.events
  for insert to authenticated
  with check ((select private.is_admin()));

create policy events_insert_admin_only on public.events
  as restrictive
  for insert to authenticated
  with check ((select private.is_admin()));

create policy events_admin_update on public.events
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy events_update_admin_only on public.events
  as restrictive
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy events_admin_delete on public.events
  for delete to authenticated
  using ((select private.is_admin()));

create policy events_delete_admin_only on public.events
  as restrictive
  for delete to authenticated
  using ((select private.is_admin()));

create policy registrations_select_own on public.registrations
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy registrations_insert_own on public.registrations
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy registrations_update_own on public.registrations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Keep table privileges narrow for browser clients. Backend connections using
-- the database owner/service role are unaffected by these grants.
revoke all on table public.profiles, public.events, public.registrations from anon;
grant select on table public.events to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.registrations to authenticated;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row
  execute function private.prevent_profile_role_change();
