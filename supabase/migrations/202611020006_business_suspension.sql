-- A suspended business retains its membership rows but loses access to tenant
-- records. Super Admin business metadata access remains available.
create or replace function public.has_business_role(
  target_business uuid,
  allowed_roles public.business_role[]
)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members bm
    join public.businesses b on b.id = bm.business_id
    where bm.business_id = target_business
      and bm.user_id = (select auth.uid())
      and bm.status = 'active'
      and b.status = 'active'
      and bm.role = any(allowed_roles)
  );
$$;

create or replace function public.is_assigned_staff(target_business uuid, target_order uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    join public.businesses b on b.id = o.business_id
    join public.business_members bm
      on bm.business_id = o.business_id and bm.user_id = o.assigned_to_user_id
    where o.business_id = target_business
      and o.id = target_order
      and o.assigned_to_user_id = (select auth.uid())
      and b.status = 'active'
      and bm.status = 'active'
      and bm.role = 'tailor_staff'
  );
$$;

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
    join public.businesses b on b.id = own_member.business_id
    where own_member.user_id = (select auth.uid())
      and own_member.status = 'active'
      and target_member.user_id = target_user
      and target_member.status = 'active'
      and b.status = 'active'
  );
$$;

alter table public.business_access_audit
  drop constraint business_access_audit_action_check;
alter table public.business_access_audit
  add constraint business_access_audit_action_check
  check (action in ('owner_invited', 'staff_invited', 'staff_suspended', 'business_suspended', 'business_reactivated'));

drop policy if exists businesses_update_admin on public.businesses;
drop policy if exists businesses_update_superadmin on public.businesses;
drop policy if exists businesses_insert_superadmin on public.businesses;
-- Business create/status changes go through audited server/database functions.

create or replace function public.update_business_metadata(target_business uuid, new_name text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(trim(new_name)) < 2 or length(trim(new_name)) > 120 then
    raise exception 'Business name must be between 2 and 120 characters' using errcode = '22023';
  end if;
  if not public.has_business_role(target_business, array['business_admin']::public.business_role[]) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  update public.businesses set name = trim(new_name), updated_at = now()
  where id = target_business;
end;
$$;
revoke all on function public.update_business_metadata(uuid, text) from public;
grant execute on function public.update_business_metadata(uuid, text) to authenticated;

create or replace function public.set_business_status_as_super_admin(
  target_business uuid,
  next_status public.business_status
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  previous_status public.business_status;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.platform_role = 'super_admin'
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if next_status not in ('active', 'suspended') then
    raise exception 'Invalid business status' using errcode = '22023';
  end if;
  select b.status into previous_status
  from public.businesses b where b.id = target_business for update;
  if not found then raise exception 'Business not found' using errcode = 'P0002'; end if;
  if previous_status = next_status then return; end if;

  update public.businesses set status = next_status, updated_at = now()
  where id = target_business;
  insert into public.business_access_audit (business_id, actor_user_id, action, details)
  values (target_business, (select auth.uid()),
    case next_status when 'suspended' then 'business_suspended' else 'business_reactivated' end,
    jsonb_build_object('previous_status', previous_status, 'next_status', next_status));
end;
$$;
revoke all on function public.set_business_status_as_super_admin(uuid, public.business_status) from public;
grant execute on function public.set_business_status_as_super_admin(uuid, public.business_status) to authenticated;

create or replace function public.suspend_business_staff(target_business uuid, target_staff uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  previous_status public.membership_status;
begin
  if (select auth.uid()) is null
    or not public.has_business_role(target_business, array['business_admin']::public.business_role[]) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  select bm.status into previous_status
  from public.business_members bm
  where bm.business_id = target_business and bm.user_id = target_staff and bm.role = 'tailor_staff'
  for update;
  if not found or previous_status = 'suspended' then
    raise exception 'Active or invited Tailor Staff membership required' using errcode = 'P0002';
  end if;
  update public.business_members set status = 'suspended', updated_at = now()
  where business_id = target_business and user_id = target_staff;
  insert into public.business_access_audit (business_id, actor_user_id, target_user_id, action)
  values (target_business, (select auth.uid()), target_staff, 'staff_suspended');
end;
$$;
revoke all on function public.suspend_business_staff(uuid, uuid) from public;
grant execute on function public.suspend_business_staff(uuid, uuid) to authenticated;
