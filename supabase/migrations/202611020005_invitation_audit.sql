create table public.business_access_audit (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  target_email text,
  action text not null check (action in ('owner_invited', 'staff_invited')),
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);
create index business_access_audit_business_time_idx
  on public.business_access_audit(business_id, occurred_at desc);
alter table public.business_access_audit enable row level security;
create policy business_access_audit_admin_read on public.business_access_audit
  for select to authenticated using (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  );
-- Writes are server-only via the private service key; no client write policies.

create or replace function public.accept_pending_business_memberships()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  ) then
    raise exception 'Verified email required' using errcode = '42501';
  end if;

  update public.business_members
  set status = 'active', updated_at = now()
  where user_id = (select auth.uid()) and status = 'invited';
  get diagnostics changed_count = row_count;
  if changed_count = 0 then
    raise exception 'No pending invitations found' using errcode = 'P0002';
  end if;
  return changed_count;
end;
$$;
revoke all on function public.accept_pending_business_memberships() from public;
grant execute on function public.accept_pending_business_memberships() to authenticated;
