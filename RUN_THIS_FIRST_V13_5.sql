-- NUVEXA HUB V13.5
-- HOTFIX: payment_status enum mismatch when selecting "تم التسليم".
-- Run ONCE in Supabase -> SQL Editor -> New query.
--
-- Fixes:
--   column "status" is of type payment_status but expression is of type text
--
-- This script ONLY replaces the order-status function.
-- It does not touch Google Auth, users, products, orders, or existing invoices.

begin;

-- Safety check: the database must contain the enum used by invoices.status.
do $$
declare
  v_missing text;
begin
  if to_regtype('public.payment_status') is null then
    raise exception 'public.payment_status type was not found';
  end if;

  select string_agg(required.label, ', ')
  into v_missing
  from (
    values
      ('pending'),
      ('paid'),
      ('partially_paid'),
      ('refunded')
  ) as required(label)
  where not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid=t.typnamespace
    join pg_enum e on e.enumtypid=t.oid
    where n.nspname='public'
      and t.typname='payment_status'
      and e.enumlabel=required.label
  );

  if v_missing is not null then
    raise exception 'payment_status is missing required values: %', v_missing;
  end if;
end $$;


create or replace function public.set_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_already_posted boolean:=false;

  v_invoice_id uuid;
  v_invoice_number bigint;
  v_invoice_paid numeric(14,2):=0;

  v_cogs numeric(14,2):=0;
  v_revenue numeric(14,2):=0;
  v_method text:='cash';

  -- IMPORTANT:
  -- Keep invoice status in the SAME ENUM type as invoices.status.
  -- This avoids CASE returning text.
  v_payment_status public.payment_status;
begin
  if auth.uid() is null or not public.is_partner() then
    raise exception 'Partner access required';
  end if;

  select *
  into v_order
  from public.orders
  where id=p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  select exists(
    select 1
    from public.order_inventory_postings
    where order_id=p_order_id
  )
  into v_already_posted;

  v_method :=
    case
      when lower(coalesce(v_order.payment_method,'cash'))='bank' then 'bank'
      else 'cash'
    end;

  -- ==========================================================
  -- DELIVERED / COMPLETED
  -- ==========================================================
  if p_status='completed' then

    if v_order.status in ('cancelled','refunded') then
      raise exception 'Cancelled/refunded order cannot be completed';
    end if;

    -- Validate stock first, so the posting stays all-or-nothing.
    if not v_already_posted then
      for v_item in
        select
          oi.*,
          p.track_inventory,
          p.stock_quantity
        from public.order_items oi
        join public.products p on p.id=oi.product_id
        where oi.order_id=p_order_id
        for update of p
      loop
        if v_item.track_inventory
           and coalesce(v_item.stock_quantity,0)<v_item.quantity then
          raise exception 'Insufficient stock for %',v_item.product_name;
        end if;
      end loop;

      -- Deduct inventory only after delivery.
      for v_item in
        select
          oi.*,
          p.track_inventory
        from public.order_items oi
        join public.products p on p.id=oi.product_id
        where oi.order_id=p_order_id
        for update of p
      loop
        if v_item.track_inventory then
          update public.products
          set stock_quantity=stock_quantity-v_item.quantity
          where id=v_item.product_id;

          insert into public.inventory_movements(
            product_id,
            quantity_change,
            reason,
            reference_type,
            reference_id,
            created_by
          )
          values(
            v_item.product_id,
            -v_item.quantity,
            'Delivered order inventory posting',
            'order',
            p_order_id,
            auth.uid()
          );
        end if;
      end loop;

      insert into public.order_inventory_postings(order_id,posted_by)
      values(p_order_id,auth.uid())
      on conflict(order_id) do nothing;
    end if;

    select coalesce(sum(coalesce(cogs_total,0)),0)
    into v_cogs
    from public.order_items
    where order_id=p_order_id;

    v_revenue:=coalesce(v_order.grand_total,0);

    select
      i.id,
      i.invoice_number,
      coalesce(i.amount_paid,0)
    into
      v_invoice_id,
      v_invoice_number,
      v_invoice_paid
    from public.invoices i
    where i.order_id=p_order_id
    order by i.issued_at desc
    limit 1
    for update;

    -- Explicit enum assignment.
    if v_method='cash' then
      v_payment_status:='paid'::public.payment_status;
    elsif v_invoice_id is not null
          and greatest(coalesce(v_invoice_paid,0),0)>=v_order.grand_total then
      v_payment_status:='paid'::public.payment_status;
    elsif v_invoice_id is not null
          and greatest(coalesce(v_invoice_paid,0),0)>0 then
      v_payment_status:='partially_paid'::public.payment_status;
    else
      v_payment_status:='pending'::public.payment_status;
    end if;

    if v_invoice_id is null then
      insert into public.invoices(
        order_id,
        buyer_id,
        status,
        currency,
        subtotal,
        discount_total,
        grand_total,
        amount_paid,
        notes,
        payment_method,
        recognized_at,
        recognized_revenue,
        recognized_cogs,
        recognized_profit
      )
      values(
        p_order_id,
        v_order.buyer_id,
        v_payment_status,
        v_order.currency,
        v_order.subtotal,
        v_order.discount_total,
        v_order.grand_total,
        case when v_method='cash' then v_order.grand_total else 0 end,
        'Sales invoice recognized on delivery',
        v_method,
        now(),
        v_revenue,
        v_cogs,
        round(v_revenue-v_cogs,2)
      )
      returning id,invoices.invoice_number
      into v_invoice_id,v_invoice_number;

    else
      update public.invoices
      set
        status=v_payment_status,
        amount_paid=
          case
            when v_method='cash' then grand_total
            else greatest(coalesce(amount_paid,0),v_invoice_paid)
          end,
        currency=v_order.currency,
        subtotal=v_order.subtotal,
        discount_total=v_order.discount_total,
        grand_total=v_order.grand_total,
        payment_method=v_method,
        recognized_at=coalesce(recognized_at,now()),
        recognized_revenue=v_revenue,
        recognized_cogs=v_cogs,
        recognized_profit=round(v_revenue-v_cogs,2)
      where id=v_invoice_id;
    end if;

    insert into public.order_accounting_postings(
      order_id,
      invoice_id,
      revenue,
      cogs,
      gross_profit,
      posted_at,
      posted_by,
      reversed_at,
      reversed_by
    )
    values(
      p_order_id,
      v_invoice_id,
      v_revenue,
      v_cogs,
      round(v_revenue-v_cogs,2),
      now(),
      auth.uid(),
      null,
      null
    )
    on conflict(order_id) do update
    set
      invoice_id=excluded.invoice_id,
      revenue=excluded.revenue,
      cogs=excluded.cogs,
      gross_profit=excluded.gross_profit,
      posted_at=
        case
          when public.order_accounting_postings.reversed_at is null
            then public.order_accounting_postings.posted_at
          else now()
        end,
      posted_by=excluded.posted_by,
      reversed_at=null,
      reversed_by=null;

  -- ==========================================================
  -- CANCELLED / REFUNDED
  -- ==========================================================
  elsif p_status in ('cancelled','refunded') then

    if v_already_posted then
      for v_item in
        select
          oi.*,
          p.track_inventory
        from public.order_items oi
        join public.products p on p.id=oi.product_id
        where oi.order_id=p_order_id
        for update of p
      loop
        if v_item.track_inventory then
          update public.products
          set stock_quantity=stock_quantity+v_item.quantity
          where id=v_item.product_id;

          insert into public.inventory_movements(
            product_id,
            quantity_change,
            reason,
            reference_type,
            reference_id,
            created_by
          )
          values(
            v_item.product_id,
            v_item.quantity,
            'Delivered order reversal',
            'order',
            p_order_id,
            auth.uid()
          );
        end if;
      end loop;

      delete from public.order_inventory_postings
      where order_id=p_order_id;
    end if;

    update public.order_accounting_postings
    set
      reversed_at=coalesce(reversed_at,now()),
      reversed_by=auth.uid()
    where order_id=p_order_id;

    -- Explicit enum assignment here as well.
    update public.invoices
    set
      status='refunded'::public.payment_status,
      recognized_revenue=0,
      recognized_cogs=0,
      recognized_profit=0
    where order_id=p_order_id
      and recognized_at is not null;

    delete from public.invoices
    where order_id=p_order_id
      and recognized_at is null
      and coalesce(amount_paid,0)=0
      and status='pending'::public.payment_status;
  end if;

  update public.orders
  set status=p_status
  where id=p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute
on function public.set_order_status(uuid,public.order_status)
to authenticated;

commit;

-- Verification:
-- select pg_get_functiondef('public.set_order_status(uuid,public.order_status)'::regprocedure);
