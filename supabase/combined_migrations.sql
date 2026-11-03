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
-- Private Storage access for order images.
-- Create the private bucket "order-files" from the Supabase dashboard/API
-- before applying this migration. MIME types below are provisional; set the
-- matching bucket allow-list. Maximum file size remains an open decision.

create policy "order_files_insert_authorized"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'order-files'
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.order_files f
    where f.object_path = name
      and f.upload_state in ('pending', 'uploaded')
      and f.business_id::text = (storage.foldername(name))[1]
      and f.order_id::text = (storage.foldername(name))[2]
      and f.mime_type = storage.objects.metadata->>'mimetype'
      and storage.objects.metadata->>'mimetype' = any(array['image/jpeg','image/png','image/webp','image/heic'])
      and public.has_business_role(f.business_id, array['business_admin']::public.business_role[])
  )
);

create policy "order_files_read_authorized"
on storage.objects for select to authenticated
using (
  bucket_id = 'order-files'
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.order_files f
    where f.object_path = name
      and f.upload_state = 'uploaded'
      and f.business_id::text = (storage.foldername(name))[1]
      and f.order_id::text = (storage.foldername(name))[2]
      and (
        public.has_business_role(f.business_id, array['business_admin']::public.business_role[])
        or public.is_assigned_staff(f.business_id, f.order_id)
      )
  )
);

-- No UPDATE/DELETE policy: clients must upload a new opaque object and use
-- controlled metadata changes. Super Admin gets no tenant file access.
-- Atomic order creation and payment recording. Client table writes are removed
-- for these sensitive workflows so totals and balances are authoritative here.

drop policy if exists orders_admin_insert on public.orders;
drop policy if exists payments_admin_insert on public.payments;

create or replace function public.create_order_with_items(
  target_business uuid,
  target_customer uuid,
  target_pickup date,
  items jsonb,
  initial_payment numeric default 0
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  new_order_id uuid;
  item jsonb;
  item_garment public.garment_type;
  item_quantity integer;
  item_price numeric(12,2);
  item_snapshot jsonb;
  item_label text;
  previous_measurement uuid;
  measurement_entry record;
  computed_total numeric(12,2) := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.has_business_role(target_business, array['business_admin']::public.business_role[]) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if target_pickup < current_date then
    raise exception 'Pickup date cannot be in the past' using errcode = '22023';
  end if;
  if not exists (select 1 from public.customers c
      where c.business_id = target_business and c.id = target_customer and c.archived_at is null) then
    raise exception 'Customer not found' using errcode = '23503';
  end if;
  if items is null or jsonb_typeof(items) <> 'array' then
    raise exception 'Order items must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(items) < 1 then
    raise exception 'At least one order item is required' using errcode = '22023';
  end if;
  if initial_payment is null then initial_payment := 0; end if;

  for item in select value from jsonb_array_elements(items) loop
    item_garment := (item->>'garment')::public.garment_type;
    item_quantity := (item->>'quantity')::integer;
    item_price := (item->>'unit_price')::numeric(12,2);
    item_snapshot := coalesce(item->'measurement_snapshot', '{}'::jsonb);
    item_label := nullif(trim(item->>'category_label_snapshot'), '');
    if item_quantity <= 0 or item_price < 0 or jsonb_typeof(item_snapshot) <> 'object' then
      raise exception 'Invalid order item' using errcode = '22023';
    end if;
    if item_label is not null and not (
      (item_garment = 'shirt' and item_label = any(array['S','M','L','B','K']))
      or (item_garment = 'trousers' and item_label = any(array['B','L','C','T','K']))
    ) then
      raise exception 'Invalid garment category label' using errcode = '22023';
    end if;
    for measurement_entry in select key, value from jsonb_each(item_snapshot) loop
      if jsonb_typeof(measurement_entry.value) <> 'number'
        or (measurement_entry.value::text)::numeric <= 0
        or (measurement_entry.value::text)::numeric > 500
        or not (
          (item_garment = 'shirt' and measurement_entry.key = any(array['chest','body_length','shoulder','sleeve_length','neck']))
          or (item_garment = 'trousers' and measurement_entry.key = any(array['waist','hip','trouser_length','inseam','thigh']))
        ) then
        raise exception 'Invalid measurement snapshot' using errcode = '22023';
      end if;
    end loop;
    computed_total := computed_total + item_quantity * item_price;
  end loop;
  computed_total := round(computed_total, 2);

  if initial_payment < 0 or initial_payment > computed_total then
    raise exception 'Initial payment must be between zero and the order total' using errcode = '22023';
  end if;

  insert into public.orders (business_id, customer_id, status, ordered_at, pickup_at, created_by)
  values (target_business, target_customer, 'new', current_date, target_pickup, (select auth.uid()))
  returning id into new_order_id;

  for item in select value from jsonb_array_elements(items) loop
    item_garment := (item->>'garment')::public.garment_type;
    item_snapshot := coalesce(item->'measurement_snapshot', '{}'::jsonb);
    item_label := nullif(trim(item->>'category_label_snapshot'), '');
    insert into public.order_items (
      business_id, order_id, garment, quantity, unit_price,
      measurement_snapshot, category_label_snapshot
    ) values (
      target_business, new_order_id,
      item_garment,
      (item->>'quantity')::integer,
      (item->>'unit_price')::numeric(12,2),
      item_snapshot,
      item_label
    );

    if item_snapshot <> '{}'::jsonb then
      select m.id into previous_measurement
      from public.measurements m
      where m.business_id = target_business and m.customer_id = target_customer and m.garment = item_garment
      order by m.created_at desc limit 1;
      insert into public.measurements (
        business_id, customer_id, garment, category_label, values_cm, created_by, supersedes_id
      ) values (
        target_business, target_customer, item_garment,
        item_label, item_snapshot, (select auth.uid()), previous_measurement
      );
    end if;
  end loop;

  if initial_payment > 0 then
    insert into public.payments (business_id, order_id, amount, recorded_by)
    values (target_business, new_order_id, initial_payment, (select auth.uid()));
  end if;
  return new_order_id;
end;
$$;

create or replace function public.record_order_payment(
  target_business uuid,
  target_order uuid,
  payment_amount numeric,
  payment_method text default null,
  payment_reference text default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  order_total numeric(12,2);
  already_paid numeric(12,2);
  new_payment_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.has_business_role(target_business, array['business_admin']::public.business_role[]) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if payment_amount <= 0 then
    raise exception 'Payment must be greater than zero' using errcode = '22023';
  end if;

  perform 1 from public.orders o
  where o.business_id = target_business and o.id = target_order
  for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  select coalesce(sum(i.quantity * i.unit_price), 0)::numeric(12,2)
    into order_total
  from public.order_items i
  where i.business_id = target_business and i.order_id = target_order;
  select coalesce(sum(p.amount), 0)::numeric(12,2)
    into already_paid
  from public.payments p
  where p.business_id = target_business and p.order_id = target_order;

  if payment_amount > order_total - already_paid then
    raise exception 'Payment exceeds the remaining balance' using errcode = '22023';
  end if;

  insert into public.payments (business_id, order_id, amount, recorded_by, method, reference)
  values (target_business, target_order, payment_amount, (select auth.uid()),
          nullif(trim(payment_method), ''), nullif(trim(payment_reference), ''))
  returning id into new_payment_id;
  return new_payment_id;
end;
$$;

revoke all on function public.create_order_with_items(uuid, uuid, date, jsonb, numeric) from public;
revoke all on function public.record_order_payment(uuid, uuid, numeric, text, text) from public;
grant execute on function public.create_order_with_items(uuid, uuid, date, jsonb, numeric) to authenticated;
grant execute on function public.record_order_payment(uuid, uuid, numeric, text, text) to authenticated;

-- Keep a minimal app profile for every Auth user; roles always start unprivileged.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data->>'display_name'), ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

revoke all on function public.handle_new_auth_user() from public;

create or replace function public.assign_order_staff(
  target_business uuid,
  target_order uuid,
  target_staff uuid
)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.has_business_role(target_business, array['business_admin']::public.business_role[]) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if not exists (select 1 from public.orders o where o.business_id = target_business and o.id = target_order) then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if target_staff is not null and not exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business and bm.user_id = target_staff
      and bm.role = 'tailor_staff' and bm.status = 'active'
  ) then
    raise exception 'Active Tailor Staff membership required' using errcode = '23503';
  end if;
  update public.orders set assigned_to_user_id = target_staff
  where business_id = target_business and id = target_order;
end;
$$;
revoke all on function public.assign_order_staff(uuid, uuid, uuid) from public;
grant execute on function public.assign_order_staff(uuid, uuid, uuid) to authenticated;

create or replace function public.get_business_financial_summary(target_business uuid)
returns table (total_value numeric, paid_amount numeric, outstanding_balance numeric)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.has_business_role(target_business, array['business_admin']::public.business_role[]) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  return query
  with order_totals as (
    select o.id,
      coalesce(sum(i.quantity * i.unit_price), 0)::numeric(12,2) as order_total
    from public.orders o
    left join public.order_items i on i.business_id = o.business_id and i.order_id = o.id
    where o.business_id = target_business and o.archived_at is null
    group by o.id
  ), order_paid as (
    select ot.id, ot.order_total,
      coalesce(sum(p.amount), 0)::numeric(12,2) as paid
    from order_totals ot
    left join public.payments p on p.business_id = target_business and p.order_id = ot.id
    group by ot.id, ot.order_total
  )
  select coalesce(sum(op.order_total),0)::numeric,
    coalesce(sum(op.paid),0)::numeric,
    coalesce(sum(greatest(op.order_total - op.paid, 0)),0)::numeric
  from order_paid op;
end;
$$;
revoke all on function public.get_business_financial_summary(uuid) from public;
grant execute on function public.get_business_financial_summary(uuid) to authenticated;
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
