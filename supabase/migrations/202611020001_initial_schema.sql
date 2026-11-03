-- Digital Tailoring System MVP: initial schema and tenant isolation policies.
-- Apply only after creating a Supabase project and reviewing the open decisions
-- in digital-tailoring-mvp-design-spec.md. This migration is not yet applied.

create extension if not exists pgcrypto;

create type public.platform_role as enum ('user', 'super_admin');
create type public.business_role as enum ('business_admin', 'tailor_staff');
create type public.membership_status as enum ('invited', 'active', 'suspended');
create type public.business_status as enum ('active', 'suspended', 'closed');
create type public.garment_type as enum ('shirt', 'trousers');
create type public.order_status as enum (
  'new',
  'fabric_ready',
  'cutting',
  'sewing',
  'finished',
  'delivered'
);
create type public.order_file_kind as enum ('fabric', 'design');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  platform_role public.platform_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status public.business_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role public.business_role not null,
  status public.membership_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (business_id, id)
);

-- measurements.values_cm maps stable measurement keys to numeric centimetres.
-- category_label stores the shirt/trouser letter label separately from values.
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  customer_id uuid not null,
  garment public.garment_type not null,
  category_label text,
  values_cm jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  supersedes_id uuid,
  unique (business_id, id),
  foreign key (business_id, customer_id)
    references public.customers(business_id, id) on delete restrict,
  foreign key (business_id, supersedes_id)
    references public.measurements(business_id, id) on delete restrict,
  check (jsonb_typeof(values_cm) = 'object')
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  customer_id uuid not null,
  status public.order_status not null default 'new',
  ordered_at date not null default current_date,
  pickup_at date not null,
  currency char(3) not null default 'USD' check (currency = 'USD'),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  assigned_to_user_id uuid,
  archived_at timestamptz,
  unique (business_id, id),
  foreign key (business_id, customer_id)
    references public.customers(business_id, id) on delete restrict,
  foreign key (business_id, assigned_to_user_id)
    references public.business_members(business_id, user_id) on delete restrict,
  check (pickup_at >= ordered_at)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  garment public.garment_type not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  measurement_snapshot jsonb not null default '{}'::jsonb,
  category_label_snapshot text,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, order_id)
    references public.orders(business_id, id) on delete restrict,
  check (jsonb_typeof(measurement_snapshot) = 'object')
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  currency char(3) not null default 'USD' check (currency = 'USD'),
  paid_at timestamptz not null default now(),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  method text,
  reference text,
  reversal_of uuid,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, order_id)
    references public.orders(business_id, id) on delete restrict,
  foreign key (business_id, reversal_of)
    references public.payments(business_id, id) on delete restrict
);

create table public.order_files (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  object_path text not null unique,
  kind public.order_file_kind not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes > 0),
  upload_state text not null default 'pending'
    check (upload_state in ('pending', 'uploaded', 'failed')),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, order_id)
    references public.orders(business_id, id) on delete restrict
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  reason text,
  unique (business_id, id),
  foreign key (business_id, order_id)
    references public.orders(business_id, id) on delete restrict
);

create index business_members_user_status_idx
  on public.business_members(user_id, status);
create index customers_business_name_idx on public.customers(business_id, name);
create index customers_business_phone_idx on public.customers(business_id, phone);
create index measurements_customer_created_idx
  on public.measurements(business_id, customer_id, created_at desc);
create index orders_business_status_pickup_idx
  on public.orders(business_id, status, pickup_at);
create index orders_business_assignee_idx
  on public.orders(business_id, assigned_to_user_id, pickup_at);
create index order_items_order_idx on public.order_items(business_id, order_id);
create index payments_order_paid_idx on public.payments(business_id, order_id, paid_at desc);
create index order_files_order_idx on public.order_files(business_id, order_id, created_at desc);
create index order_history_order_idx
  on public.order_status_history(business_id, order_id, occurred_at desc);

-- Security-definer helpers avoid recursive RLS on business_members. They expose
-- only membership predicates, not tenant records, and pin search_path.
create or replace function public.is_active_member(target_business uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business
      and bm.user_id = (select auth.uid())
      and bm.status = 'active'
  );
$$;

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
    where bm.business_id = target_business
      and bm.user_id = (select auth.uid())
      and bm.status = 'active'
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
    join public.business_members bm
      on bm.business_id = o.business_id and bm.user_id = o.assigned_to_user_id
    where o.business_id = target_business
      and o.id = target_order
      and o.assigned_to_user_id = (select auth.uid())
      and bm.status = 'active'
      and bm.role = 'tailor_staff'
  );
$$;

revoke all on function public.is_active_member(uuid) from public;
revoke all on function public.has_business_role(uuid, public.business_role[]) from public;
revoke all on function public.is_assigned_staff(uuid, uuid) from public;
grant execute on function public.is_active_member(uuid) to authenticated;
grant execute on function public.has_business_role(uuid, public.business_role[]) to authenticated;
grant execute on function public.is_assigned_staff(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.customers enable row level security;
alter table public.measurements enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_files enable row level security;
alter table public.order_status_history enable row level security;

-- Profile: a user reads and edits only their own profile.
create policy profiles_read_self on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_update_self on public.profiles
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and platform_role = 'user');

-- Super Admin can manage business metadata and membership administration only.
-- No policy grants Super Admin access to tenant business records below.
create policy businesses_read_member_or_superadmin on public.businesses
  for select to authenticated using (
    public.is_active_member(id)
    or exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.platform_role = 'super_admin'
    )
  );
create policy businesses_insert_superadmin on public.businesses
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.platform_role = 'super_admin')
  );
create policy businesses_update_admin on public.businesses
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.platform_role = 'super_admin')
    or public.has_business_role(id, array['business_admin']::public.business_role[])
  ) with check (
    exists (select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.platform_role = 'super_admin')
    or public.has_business_role(id, array['business_admin']::public.business_role[])
  );

create policy members_read_self_or_admin on public.business_members
  for select to authenticated using (
    user_id = (select auth.uid())
    or public.has_business_role(business_id, array['business_admin']::public.business_role[])
    or exists (select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.platform_role = 'super_admin')
  );
-- Membership creation/activation is intentionally unavailable through direct
-- client writes in this foundation. The Auth/onboarding step must add a
-- reviewed invite/accept flow so a client cannot grant itself membership.

-- Tenant data: Admin CRUD and staff read only for assigned work/necessary data.
create policy customers_admin_all on public.customers
  for all to authenticated using (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  ) with check (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  );
create policy customers_staff_assigned_read on public.customers
  for select to authenticated using (
    exists (select 1 from public.orders o
      where o.business_id = customers.business_id and o.customer_id = customers.id
        and public.is_assigned_staff(o.business_id, o.id))
  );

create policy measurements_admin_all on public.measurements
  for all to authenticated using (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  ) with check (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  );
create policy measurements_staff_assigned_read on public.measurements
  for select to authenticated using (
    exists (select 1 from public.orders o
      where o.business_id = measurements.business_id and o.customer_id = measurements.customer_id
        and public.is_assigned_staff(o.business_id, o.id))
  );

create policy orders_admin_read on public.orders
  for select to authenticated using (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  );
create policy orders_admin_insert on public.orders
  for insert to authenticated with check (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
    and created_by = (select auth.uid())
    and status = 'new'
  );
create policy orders_staff_assigned_read on public.orders
  for select to authenticated using (public.is_assigned_staff(business_id, id));
-- There is deliberately no direct UPDATE policy for orders. Status changes
-- go through transition_order_status(), which changes only status and appends
-- its history row atomically.

create policy items_admin_all on public.order_items
  for all to authenticated using (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  ) with check (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  );
create policy items_staff_assigned_read on public.order_items
  for select to authenticated using (public.is_assigned_staff(business_id, order_id));

create policy payments_admin_read on public.payments
  for select to authenticated using (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  );
create policy payments_admin_insert on public.payments
  for insert to authenticated with check (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
    and recorded_by = (select auth.uid())
  );
-- Intentionally no UPDATE/DELETE policy: financial entries are append-only.

create policy files_admin_all on public.order_files
  for all to authenticated using (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  ) with check (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  );
create policy files_staff_assigned_read on public.order_files
  for select to authenticated using (public.is_assigned_staff(business_id, order_id));

create policy history_admin_read on public.order_status_history
  for select to authenticated using (
    public.has_business_role(business_id, array['business_admin']::public.business_role[])
  );
create policy history_staff_assigned_read on public.order_status_history
  for select to authenticated using (public.is_assigned_staff(business_id, order_id));
-- Intentionally no UPDATE/DELETE policy on status history.

create or replace function public.record_initial_order_status()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.order_status_history
    (business_id, order_id, from_status, to_status, actor_user_id)
  values
    (new.business_id, new.id, null, new.status, new.created_by);
  return new;
end;
$$;

create trigger orders_record_initial_status
after insert on public.orders
for each row execute function public.record_initial_order_status();

create or replace function public.transition_order_status(
  target_business uuid,
  target_order uuid,
  next_status public.order_status,
  transition_reason text default null
)
returns public.orders
language plpgsql security definer
set search_path = ''
as $$
declare
  current_order public.orders;
  expected_next public.order_status;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select o.* into current_order
  from public.orders o
  where o.business_id = target_business and o.id = target_order
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if not (
    public.has_business_role(target_business, array['business_admin']::public.business_role[])
    or public.is_assigned_staff(target_business, target_order)
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  expected_next := case current_order.status
    when 'new' then 'fabric_ready'::public.order_status
    when 'fabric_ready' then 'cutting'::public.order_status
    when 'cutting' then 'sewing'::public.order_status
    when 'sewing' then 'finished'::public.order_status
    when 'finished' then 'delivered'::public.order_status
    else null
  end;

  if expected_next is null or next_status <> expected_next then
    raise exception 'Invalid status transition' using errcode = '22023';
  end if;

  update public.orders
  set status = next_status
  where business_id = target_business and id = target_order
  returning * into current_order;

  insert into public.order_status_history
    (business_id, order_id, from_status, to_status, actor_user_id, reason)
  values
    (target_business, target_order,
     case next_status
       when 'fabric_ready' then 'new'::public.order_status
       when 'cutting' then 'fabric_ready'::public.order_status
       when 'sewing' then 'cutting'::public.order_status
       when 'finished' then 'sewing'::public.order_status
       when 'delivered' then 'finished'::public.order_status
     end,
     next_status, (select auth.uid()), transition_reason);

  return current_order;
end;
$$;

revoke all on function public.record_initial_order_status() from public;
revoke all on function public.transition_order_status(uuid, uuid, public.order_status, text) from public;
grant execute on function public.transition_order_status(uuid, uuid, public.order_status, text) to authenticated;

-- Restrict direct object access until private Storage bucket and matching
-- storage.objects policies are prepared in a later, separately reviewable step.
