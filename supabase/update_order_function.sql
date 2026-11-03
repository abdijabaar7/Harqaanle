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

    for measurement_entry in select key, value from jsonb_each(item_snapshot) loop
      if jsonb_typeof(measurement_entry.value) <> 'number'
        or (measurement_entry.value::text)::numeric <= 0
        or (measurement_entry.value::text)::numeric > 500
        or length(measurement_entry.key) < 1
        or length(measurement_entry.key) > 40 then
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
