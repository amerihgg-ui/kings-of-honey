-- NUVEXA HUB V12.3
-- Cloud orders, invoices and inventory posting.
-- Run once in Supabase SQL Editor.

begin;

create table if not exists public.order_inventory_postings (
  order_id uuid primary key references public.orders(id) on delete cascade,
  posted_at timestamptz not null default now(),
  posted_by uuid references public.profiles(id) on delete set null
);

alter table public.order_inventory_postings enable row level security;
drop policy if exists nuvexa_order_inventory_postings_select on public.order_inventory_postings;
create policy nuvexa_order_inventory_postings_select on public.order_inventory_postings
for select to authenticated using ((select public.is_partner()));

create or replace function public.create_store_order(
  p_items jsonb,
  p_shipping_address jsonb default '{}'::jsonb,
  p_notes text default null,
  p_payment_method text default 'cash'
)
returns table(order_id uuid, order_number bigint, invoice_id uuid, invoice_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order_id uuid;
  v_invoice_id uuid;
  v_subtotal numeric(14,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric(14,3);
  v_price numeric(14,2);
  v_line numeric(14,2);
  v_order_number bigint;
  v_invoice_number bigint;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Order items are required';
  end if;

  insert into public.orders(buyer_id,status,currency,subtotal,discount_total,shipping_total,grand_total,notes,shipping_address)
  values(v_uid,'new','TRY',0,0,0,0,p_notes,coalesce(p_shipping_address,'{}'::jsonb))
  returning id, orders.order_number into v_order_id,v_order_number;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and status='approved' for share;
    if not found then raise exception 'Product is unavailable'; end if;
    v_qty := greatest(coalesce((v_item->>'quantity')::numeric,0),0);
    if v_qty<=0 then raise exception 'Invalid quantity'; end if;
    v_price := v_product.price;
    v_line := round(v_price*v_qty,2);
    v_subtotal := v_subtotal+v_line;
    insert into public.order_items(order_id,product_id,seller_id,product_name,quantity,unit_price,discount_amount,line_total,commission_percent,seller_net)
    values(v_order_id,v_product.id,v_product.seller_id,v_product.name,v_qty,v_price,0,v_line,0,v_line);
  end loop;

  update public.orders set subtotal=v_subtotal,grand_total=v_subtotal where id=v_order_id;
  insert into public.invoices(order_id,buyer_id,status,currency,subtotal,discount_total,grand_total,amount_paid,notes)
  values(v_order_id,v_uid,'pending','TRY',v_subtotal,0,v_subtotal,0,'Payment method: '||coalesce(p_payment_method,'cash'))
  returning id,invoices.invoice_number into v_invoice_id,v_invoice_number;

  return query select v_order_id,v_order_number,v_invoice_id,v_invoice_number;
end;
$$;

grant execute on function public.create_store_order(jsonb,jsonb,text,text) to authenticated;

create or replace function public.set_order_status(p_order_id uuid,p_status public.order_status)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_already_posted boolean;
begin
  if auth.uid() is null or not public.is_partner() then raise exception 'Partner access required'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  select exists(select 1 from public.order_inventory_postings where order_id=p_order_id) into v_already_posted;
  if p_status in ('confirmed','processing','completed') and not v_already_posted then
    for v_item in select oi.*,p.track_inventory,p.stock_quantity from public.order_items oi join public.products p on p.id=oi.product_id where oi.order_id=p_order_id for update of p
    loop
      if v_item.track_inventory then
        if v_item.stock_quantity < v_item.quantity then raise exception 'Insufficient stock for %',v_item.product_name; end if;
        update public.products set stock_quantity=stock_quantity-v_item.quantity where id=v_item.product_id;
        insert into public.inventory_movements(product_id,quantity_change,reason,reference_type,reference_id,created_by)
        values(v_item.product_id,-v_item.quantity,'Order inventory posting','order',p_order_id,auth.uid());
      end if;
    end loop;
    insert into public.order_inventory_postings(order_id,posted_by) values(p_order_id,auth.uid()) on conflict do nothing;
  elsif p_status in ('cancelled','refunded') and v_already_posted then
    for v_item in select oi.*,p.track_inventory from public.order_items oi join public.products p on p.id=oi.product_id where oi.order_id=p_order_id for update of p
    loop
      if v_item.track_inventory then
        update public.products set stock_quantity=stock_quantity+v_item.quantity where id=v_item.product_id;
        insert into public.inventory_movements(product_id,quantity_change,reason,reference_type,reference_id,created_by)
        values(v_item.product_id,v_item.quantity,'Order inventory reversal','order',p_order_id,auth.uid());
      end if;
    end loop;
    delete from public.order_inventory_postings where order_id=p_order_id;
  end if;

  update public.orders set status=p_status where id=p_order_id returning * into v_order;
  if p_status='completed' then update public.invoices set status=case when amount_paid>=grand_total then 'paid' else status end where order_id=p_order_id; end if;
  return v_order;
end;
$$;

grant execute on function public.set_order_status(uuid,public.order_status) to authenticated;

-- Sellers may read orders containing their own items.
drop policy if exists nuvexa_orders_select on public.orders;
create policy nuvexa_orders_select on public.orders for select to authenticated
using (
  buyer_id=(select auth.uid()) or (select public.is_partner()) or
  exists(select 1 from public.order_items oi where oi.order_id=id and oi.seller_id=(select auth.uid()))
);

commit;
