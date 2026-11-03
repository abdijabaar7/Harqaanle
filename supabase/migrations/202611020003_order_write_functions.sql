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
