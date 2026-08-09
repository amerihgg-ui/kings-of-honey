-- NUVEXA HUB V13.3
-- FIX: order_items RLS infinite recursion + delivered-order accounting lifecycle.
-- RUN ONCE in Supabase -> SQL Editor -> New query.
-- This script is intentionally idempotent where practical.

begin;

-- ============================================================
-- 1) BREAK THE RLS CYCLE SAFELY
-- ============================================================
-- SECURITY DEFINER helpers read the base tables without recursively re-entering
-- the orders <-> order_items SELECT policies.
create or replace function public.nuvexa_order_belongs_to_user(p_order_id uuid,p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select p_user_id is not null and exists(
    select 1 from public.orders o
    where o.id=p_order_id and o.buyer_id=p_user_id
  );
$$;

create or replace function public.nuvexa_order_has_seller(p_order_id uuid,p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select p_user_id is not null and exists(
    select 1 from public.order_items oi
    where oi.order_id=p_order_id and oi.seller_id=p_user_id
  );
$$;

revoke all on function public.nuvexa_order_belongs_to_user(uuid,uuid) from public;
revoke all on function public.nuvexa_order_has_seller(uuid,uuid) from public;
grant execute on function public.nuvexa_order_belongs_to_user(uuid,uuid) to authenticated;
grant execute on function public.nuvexa_order_has_seller(uuid,uuid) to authenticated;

-- Remove SELECT/ALL policies that may reference each other and create recursion.
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='orders' and cmd in ('SELECT','ALL')
  loop
    execute format('drop policy if exists %I on public.orders',r.policyname);
  end loop;

  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='order_items' and cmd in ('SELECT','ALL')
  loop
    execute format('drop policy if exists %I on public.order_items',r.policyname);
  end loop;

  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='invoices' and cmd in ('SELECT','ALL')
  loop
    execute format('drop policy if exists %I on public.invoices',r.policyname);
  end loop;
end $$;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.invoices enable row level security;

drop policy if exists nuvexa_orders_select_v133 on public.orders;
create policy nuvexa_orders_select_v133 on public.orders
for select to authenticated
using (
  buyer_id=(select auth.uid())
  or (select public.is_partner())
  or public.nuvexa_order_has_seller(id,(select auth.uid()))
);

drop policy if exists nuvexa_order_items_select_v133 on public.order_items;
create policy nuvexa_order_items_select_v133 on public.order_items
for select to authenticated
using (
  (select public.is_partner())
  or seller_id=(select auth.uid())
  or public.nuvexa_order_belongs_to_user(order_id,(select auth.uid()))
);

drop policy if exists nuvexa_invoices_select_v133 on public.invoices;
create policy nuvexa_invoices_select_v133 on public.invoices
for select to authenticated
using (
  buyer_id=(select auth.uid())
  or (select public.is_partner())
  or public.nuvexa_order_has_seller(order_id,(select auth.uid()))
);

grant select on public.orders,public.order_items,public.invoices to authenticated;

-- ============================================================
-- 2) ACCOUNTING SNAPSHOT COLUMNS
-- ============================================================
alter table public.order_items add column if not exists unit_cost numeric(14,2) not null default 0;
alter table public.order_items add column if not exists cogs_total numeric(14,2) not null default 0;
alter table public.orders add column if not exists payment_method text not null default 'cash';
alter table public.invoices add column if not exists payment_method text not null default 'cash';
alter table public.invoices add column if not exists recognized_at timestamptz;
alter table public.invoices add column if not exists recognized_revenue numeric(14,2) not null default 0;
alter table public.invoices add column if not exists recognized_cogs numeric(14,2) not null default 0;
alter table public.invoices add column if not exists recognized_profit numeric(14,2) not null default 0;

-- Snapshot a sensible cost for existing lines that predate V13.3.
update public.order_items oi
set unit_cost=coalesce(p.cost_price,0),
    cogs_total=round(coalesce(oi.quantity,0)*coalesce(p.cost_price,0),2)
from public.products p
where p.id=oi.product_id
  and coalesce(oi.unit_cost,0)=0
  and coalesce(oi.cogs_total,0)=0;

-- ============================================================
-- 3) AUDIT TABLE FOR RECOGNIZED ORDER PROFIT
-- ============================================================
create table if not exists public.order_accounting_postings (
  order_id uuid primary key references public.orders(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  revenue numeric(14,2) not null default 0,
  cogs numeric(14,2) not null default 0,
  gross_profit numeric(14,2) not null default 0,
  posted_at timestamptz not null default now(),
  posted_by uuid references public.profiles(id) on delete set null,
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete set null
);
alter table public.order_accounting_postings enable row level security;
drop policy if exists nuvexa_order_accounting_postings_select on public.order_accounting_postings;
create policy nuvexa_order_accounting_postings_select on public.order_accounting_postings
for select to authenticated using ((select public.is_partner()));
grant select on public.order_accounting_postings to authenticated;

-- ============================================================
-- 4) MIGRATE OLD PREMATURE INVENTORY POSTINGS
-- ============================================================
-- Older code could deduct inventory at confirmed/processing. Restore those balances
-- so V13.3 deducts only when the order is actually completed/delivered.
do $$
declare v_post record; v_item record;
begin
  for v_post in
    select op.order_id,op.posted_by
    from public.order_inventory_postings op
    join public.orders o on o.id=op.order_id
    where o.status in ('new','confirmed','processing')
  loop
    for v_item in
      select oi.product_id,oi.product_name,oi.quantity,p.track_inventory
      from public.order_items oi
      join public.products p on p.id=oi.product_id
      where oi.order_id=v_post.order_id
      for update of p
    loop
      if v_item.track_inventory then
        update public.products
        set stock_quantity=coalesce(stock_quantity,0)+v_item.quantity
        where id=v_item.product_id;

        insert into public.inventory_movements(product_id,quantity_change,reason,reference_type,reference_id,created_by)
        values(v_item.product_id,v_item.quantity,'V13.3 restore inventory until delivery','order',v_post.order_id,v_post.posted_by);
      end if;
    end loop;
    delete from public.order_inventory_postings where order_id=v_post.order_id;
  end loop;
end $$;

-- Pending zero-payment invoices created by the old checkout are not sales yet.
-- Remove them for orders that have not been delivered; V13.3 creates the sales invoice at delivery.
delete from public.invoices i
using public.orders o
where i.order_id=o.id
  and o.status in ('new','confirmed','processing','cancelled')
  and coalesce(i.amount_paid,0)=0
  and i.status='pending';

-- ============================================================
-- 5) CREATE ORDER: SAVE ORDER + COST SNAPSHOT, NO SALES INVOICE YET
-- ============================================================
create or replace function public.create_store_order(
  p_items jsonb,
  p_shipping_address jsonb default '{}'::jsonb,
  p_notes text default null,
  p_payment_method text default 'cash'
)
returns table(order_id uuid, order_number bigint, invoice_id uuid, invoice_number bigint)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_order_id uuid;
  v_subtotal numeric(14,2):=0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric(14,3);
  v_price numeric(14,2);
  v_cost numeric(14,2);
  v_line numeric(14,2);
  v_cogs numeric(14,2);
  v_order_number bigint;
  v_method text:=case when lower(coalesce(p_payment_method,'cash'))='bank' then 'bank' else 'cash' end;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Order items are required';
  end if;

  insert into public.orders(
    buyer_id,status,currency,subtotal,discount_total,shipping_total,grand_total,
    notes,shipping_address,payment_method
  )
  values(
    v_uid,'new','TRY',0,0,0,0,p_notes,coalesce(p_shipping_address,'{}'::jsonb),v_method
  )
  returning id,orders.order_number into v_order_id,v_order_number;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    select * into v_product
    from public.products
    where id=(v_item->>'product_id')::uuid and status='approved'
    for share;

    if not found then raise exception 'Product is unavailable'; end if;

    v_qty:=greatest(coalesce((v_item->>'quantity')::numeric,0),0);
    if v_qty<=0 then raise exception 'Invalid quantity'; end if;

    v_price:=coalesce(v_product.price,0);
    v_cost:=coalesce(v_product.cost_price,0);
    v_line:=round(v_price*v_qty,2);
    v_cogs:=round(v_cost*v_qty,2);
    v_subtotal:=v_subtotal+v_line;

    insert into public.order_items(
      order_id,product_id,seller_id,product_name,quantity,unit_price,unit_cost,cogs_total,
      discount_amount,line_total,commission_percent,seller_net
    )
    values(
      v_order_id,v_product.id,v_product.seller_id,v_product.name,v_qty,v_price,v_cost,v_cogs,
      0,v_line,0,v_line
    );
  end loop;

  update public.orders
  set subtotal=v_subtotal,grand_total=v_subtotal
  where id=v_order_id;

  -- invoice_id/invoice_number intentionally NULL until delivery/completion.
  return query select v_order_id,v_order_number,null::uuid,null::bigint;
end;
$$;
grant execute on function public.create_store_order(jsonb,jsonb,text,text) to authenticated;

-- ============================================================
-- 6) STATUS LIFECYCLE
-- completed = inventory posting + sales invoice + revenue/COGS/profit recognition
-- cancelled/refunded after completion = reverse inventory and recognized sale
-- ============================================================
create or replace function public.set_order_status(p_order_id uuid,p_status public.order_status)
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
begin
  if auth.uid() is null or not public.is_partner() then
    raise exception 'Partner access required';
  end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  select exists(
    select 1 from public.order_inventory_postings where order_id=p_order_id
  ) into v_already_posted;

  v_method:=case when lower(coalesce(v_order.payment_method,'cash'))='bank' then 'bank' else 'cash' end;

  if p_status='completed' then
    if v_order.status in ('cancelled','refunded') then
      raise exception 'Cancelled/refunded order cannot be completed';
    end if;

    -- Lock and validate all tracked inventory first. No partial posting.
    if not v_already_posted then
      for v_item in
        select oi.*,p.track_inventory,p.stock_quantity
        from public.order_items oi
        join public.products p on p.id=oi.product_id
        where oi.order_id=p_order_id
        for update of p
      loop
        if v_item.track_inventory and coalesce(v_item.stock_quantity,0)<v_item.quantity then
          raise exception 'Insufficient stock for %',v_item.product_name;
        end if;
      end loop;

      for v_item in
        select oi.*,p.track_inventory
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
            product_id,quantity_change,reason,reference_type,reference_id,created_by
          )
          values(
            v_item.product_id,-v_item.quantity,'Delivered order inventory posting','order',p_order_id,auth.uid()
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

    select i.id,i.invoice_number,coalesce(i.amount_paid,0)
    into v_invoice_id,v_invoice_number,v_invoice_paid
    from public.invoices i
    where i.order_id=p_order_id
    order by i.issued_at desc
    limit 1
    for update;

    if v_invoice_id is null then
      insert into public.invoices(
        order_id,buyer_id,status,currency,subtotal,discount_total,grand_total,amount_paid,
        notes,payment_method,recognized_at,recognized_revenue,recognized_cogs,recognized_profit
      )
      values(
        p_order_id,v_order.buyer_id,
        case when v_method='cash' then 'paid' else 'pending' end,
        v_order.currency,v_order.subtotal,v_order.discount_total,v_order.grand_total,
        case when v_method='cash' then v_order.grand_total else 0 end,
        'Sales invoice recognized on delivery',v_method,now(),v_revenue,v_cogs,round(v_revenue-v_cogs,2)
      )
      returning id,invoices.invoice_number into v_invoice_id,v_invoice_number;
    else
      update public.invoices
      set status=case
            when v_method='cash' then 'paid'
            when greatest(coalesce(amount_paid,0),v_invoice_paid)>=grand_total then 'paid'
            when greatest(coalesce(amount_paid,0),v_invoice_paid)>0 then 'partially_paid'
            else 'pending'
          end,
          amount_paid=case
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
      order_id,invoice_id,revenue,cogs,gross_profit,posted_at,posted_by,reversed_at,reversed_by
    )
    values(
      p_order_id,v_invoice_id,v_revenue,v_cogs,round(v_revenue-v_cogs,2),now(),auth.uid(),null,null
    )
    on conflict(order_id) do update
    set invoice_id=excluded.invoice_id,
        revenue=excluded.revenue,
        cogs=excluded.cogs,
        gross_profit=excluded.gross_profit,
        posted_at=case when public.order_accounting_postings.reversed_at is null then public.order_accounting_postings.posted_at else now() end,
        posted_by=excluded.posted_by,
        reversed_at=null,
        reversed_by=null;

  elsif p_status in ('cancelled','refunded') then
    if v_already_posted then
      for v_item in
        select oi.*,p.track_inventory
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
            product_id,quantity_change,reason,reference_type,reference_id,created_by
          )
          values(
            v_item.product_id,v_item.quantity,'Delivered order reversal','order',p_order_id,auth.uid()
          );
        end if;
      end loop;
      delete from public.order_inventory_postings where order_id=p_order_id;
    end if;

    update public.order_accounting_postings
    set reversed_at=coalesce(reversed_at,now()),reversed_by=auth.uid()
    where order_id=p_order_id;

    -- A completed sale being reversed becomes refunded and is removed from recognized profit.
    update public.invoices
    set status=case when recognized_at is not null then 'refunded' else status end,
        recognized_revenue=0,
        recognized_cogs=0,
        recognized_profit=0
    where order_id=p_order_id;

    delete from public.invoices
    where order_id=p_order_id
      and recognized_at is null
      and coalesce(amount_paid,0)=0
      and status='pending';
  end if;

  update public.orders set status=p_status where id=p_order_id returning * into v_order;
  return v_order;
end;
$$;
grant execute on function public.set_order_status(uuid,public.order_status) to authenticated;

-- ============================================================
-- 7) RECOGNIZE HISTORICAL COMPLETED ORDERS (NO SECOND INVENTORY DEDUCTION)
-- ============================================================
-- Ensure an invoice exists for old completed orders.
insert into public.invoices(
  order_id,buyer_id,status,currency,subtotal,discount_total,grand_total,amount_paid,
  notes,payment_method,recognized_at,recognized_revenue,recognized_cogs,recognized_profit
)
select
  o.id,o.buyer_id,'pending',o.currency,o.subtotal,o.discount_total,o.grand_total,0,
  'V13.3 historical delivered order',coalesce(o.payment_method,'cash'),now(),o.grand_total,
  coalesce((select sum(oi.cogs_total) from public.order_items oi where oi.order_id=o.id),0),
  round(o.grand_total-coalesce((select sum(oi.cogs_total) from public.order_items oi where oi.order_id=o.id),0),2)
from public.orders o
where o.status='completed'
  and not exists(select 1 from public.invoices i where i.order_id=o.id);

update public.invoices i
set recognized_at=coalesce(i.recognized_at,i.issued_at,now()),
    payment_method=coalesce(nullif(i.payment_method,''),o.payment_method,'cash'),
    recognized_revenue=o.grand_total,
    recognized_cogs=coalesce((select sum(oi.cogs_total) from public.order_items oi where oi.order_id=o.id),0),
    recognized_profit=round(o.grand_total-coalesce((select sum(oi.cogs_total) from public.order_items oi where oi.order_id=o.id),0),2)
from public.orders o
where o.id=i.order_id and o.status='completed';

insert into public.order_accounting_postings(order_id,invoice_id,revenue,cogs,gross_profit,posted_at,posted_by)
select
  o.id,i.id,i.recognized_revenue,i.recognized_cogs,i.recognized_profit,
  coalesce(i.recognized_at,now()),auth.uid()
from public.orders o
join public.invoices i on i.order_id=o.id
where o.status='completed'
on conflict(order_id) do update
set invoice_id=excluded.invoice_id,
    revenue=excluded.revenue,
    cogs=excluded.cogs,
    gross_profit=excluded.gross_profit
where public.order_accounting_postings.reversed_at is null;

commit;

-- Optional quick verification after success:
-- select policyname,tablename,cmd from pg_policies where schemaname='public' and tablename in ('orders','order_items','invoices') order by tablename,policyname;
-- select id,order_number,status,payment_method from public.orders order by created_at desc limit 10;
