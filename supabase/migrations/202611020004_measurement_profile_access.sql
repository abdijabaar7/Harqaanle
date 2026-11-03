-- Tenant-scoped author labels for measurement history. Staff should see only
-- the order snapshot for assigned work, not a customer's entire measurement history.
drop policy if exists measurements_staff_assigned_read on public.measurements;

create or replace function public.is_business_colleague(target_user uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members own_member
    join public.business_members target_member
      on target_member.business_id = own_member.business_id
    where own_member.user_id = (select auth.uid())
      and own_member.status = 'active'
      and target_member.user_id = target_user
      and target_member.status = 'active'
  );
$$;
revoke all on function public.is_business_colleague(uuid) from public;
grant execute on function public.is_business_colleague(uuid) to authenticated;

create policy profiles_read_business_colleague on public.profiles
  for select to authenticated using (public.is_business_colleague(user_id));

-- Expose only the profile columns needed for authorship and role-aware UI.
revoke select on public.profiles from authenticated;
grant select (user_id, display_name, platform_role) on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
