-- NUVEXA HUB V12.6 — shared admin data, persistent customer profile,
-- seller applications, cloud inventory fixes, and out-of-stock order workflow.
-- Run ONCE in Supabase -> SQL Editor -> New query.

begin;

-- 1) Shared admin state for data that was previously browser-local only.
create table if not exists public.platform_state (
  state_key text primary key,
  state_data jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.platform_state enable row level security;
drop policy if exists nuvexa_platform_state_partner on public.platform_state;
create policy nuvexa_platform_state_partner on public.platform_state
for all to authenticated using ((select public.is_partner())) with check ((select public.is_partner()));

create or replace function public.get_platform_state()
returns jsonb language sql stable security definer set search_path=public as $$
  select case when public.is_partner() then coalesce((select state_data from public.platform_state where state_key='main'),'{}'::jsonb) else '{}'::jsonb end;
$$;
create or replace function public.save_platform_state(p_state jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_partner() then raise exception 'Partner access required'; end if;
  insert into public.platform_state(state_key,state_data,updated_by,updated_at)
  values('main',coalesce(p_state,'{}'::jsonb),auth.uid(),now())
  on conflict(state_key) do update set state_data=excluded.state_data,updated_by=excluded.updated_by,updated_at=now();
end;$$;
grant execute on function public.get_platform_state() to authenticated;
grant execute on function public.save_platform_state(jsonb) to authenticated;

-- 2) Customer details saved once and reused on every device after Google sign-in.
create table if not exists public.customer_profiles (
  user_id uuid primary key,
  email text,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles enable row level security;
drop policy if exists nuvexa_customer_profiles_own on public.customer_profiles;
create policy nuvexa_customer_profiles_own on public.customer_profiles
for all to authenticated using (user_id=(select auth.uid()) or (select public.is_partner()))
with check (user_id=(select auth.uid()) or (select public.is_partner()));

create or replace function public.get_my_customer_profile()
returns public.customer_profiles language sql stable security definer set search_path=public as $$
  select * from public.customer_profiles where user_id=auth.uid();
$$;
create or replace function public.save_my_customer_profile(p_full_name text,p_phone text)
returns public.customer_profiles language plpgsql security definer set search_path=public as $$
declare v public.customer_profiles%rowtype; v_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_full_name,'')))<2 then raise exception 'Name is required'; end if;
  if length(trim(coalesce(p_phone,'')))<7 then raise exception 'Phone is required'; end if;
  select email into v_email from auth.users where id=auth.uid();
  insert into public.customer_profiles(user_id,email,full_name,phone)
  values(auth.uid(),lower(coalesce(v_email,'')),trim(p_full_name),trim(p_phone))
  on conflict(user_id) do update set email=excluded.email,full_name=excluded.full_name,phone=excluded.phone,updated_at=now()
  returning * into v;
  return v;
end;$$;
grant execute on function public.get_my_customer_profile() to authenticated;
grant execute on function public.save_my_customer_profile(text,text) to authenticated;

-- 3) Seller applications. Approval automatically grants seller role.
create table if not exists public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  full_name text,
  business_name text,
  notes text,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_seller_application_user on public.seller_applications(user_id);
alter table public.seller_applications enable row level security;
drop policy if exists nuvexa_seller_applications_own on public.seller_applications;
create policy nuvexa_seller_applications_own on public.seller_applications
for select to authenticated using (user_id=(select auth.uid()) or (select public.is_partner()));

create or replace function public.submit_seller_application(p_business_name text default '',p_notes text default '')
returns void language plpgsql security definer set search_path=public as $$
declare v_email text; v_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select email,coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',split_part(email,'@',1)) into v_email,v_name from auth.users where id=auth.uid();
  insert into public.seller_applications(user_id,email,full_name,business_name,notes,status,reviewed_by,reviewed_at)
  values(auth.uid(),lower(v_email),v_name,nullif(trim(p_business_name),''),nullif(trim(p_notes),''),'pending',null,null)
  on conflict(user_id) do update set business_name=excluded.business_name,notes=excluded.notes,status='pending',reviewed_by=null,reviewed_at=null,updated_at=now();
end;$$;

create or replace function public.list_seller_applications()
returns setof public.seller_applications language sql stable security definer set search_path=public as $$
  select * from public.seller_applications where public.is_partner() order by created_at desc;
$$;

create or replace function public.review_seller_application(p_application_id uuid,p_decision text)
returns void language plpgsql security definer set search_path=public as $$
declare v public.seller_applications%rowtype;
begin
  if not public.is_partner() then raise exception 'Partner access required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  update public.seller_applications set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_application_id returning * into v;
  if not found then raise exception 'Application not found'; end if;
  if p_decision='approved' then
    insert into public.user_roles(user_id,role_key,is_active,granted_by) values(v.user_id,'seller',true,auth.uid())
    on conflict(user_id,role_key) do update set is_active=true,granted_by=excluded.granted_by;
  end if;
end;$$;
grant execute on function public.submit_seller_application(text,text) to authenticated;
grant execute on function public.list_seller_applications() to authenticated;
grant execute on function public.review_seller_application(uuid,text) to authenticated;

-- 4) Inventory adjustments always update the cloud product balance and movement together.
create or replace function public.adjust_product_inventory(p_product_id uuid,p_quantity_change numeric,p_reason text default 'Manual inventory adjustment')
returns public.products language plpgsql security definer set search_path=public as $$
declare v public.products%rowtype; v_new numeric;
begin
  if not public.is_partner() then raise exception 'Partner access required'; end if;
  select * into v from public.products where id=p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  v_new:=coalesce(v.stock_quantity,0)+coalesce(p_quantity_change,0);
  if v_new<0 then raise exception 'Inventory cannot be negative'; end if;
  update public.products set stock_quantity=v_new where id=p_product_id returning * into v;
  insert into public.inventory_movements(product_id,quantity_change,reason,reference_type,created_by)
  values(p_product_id,p_quantity_change,coalesce(nullif(trim(p_reason),''),'Manual inventory adjustment'),'manual',auth.uid());
  return v;
end;$$;
grant execute on function public.adjust_product_inventory(uuid,numeric,text) to authenticated;

-- 5) Customer orders remain allowed even when stock is zero.
-- Inventory is posted only when enough stock exists; the order status itself is never blocked.
create or replace function public.set_order_status(p_order_id uuid,p_status public.order_status)
returns public.orders language plpgsql security definer set search_path=public as $$
declare
  v_order public.orders%rowtype; v_item record; v_already_posted boolean; v_can_post boolean:=true;
begin
  if auth.uid() is null or not public.is_partner() then raise exception 'Partner access required'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  select exists(select 1 from public.order_inventory_postings where order_id=p_order_id) into v_already_posted;

  if p_status in ('confirmed','processing','completed') and not v_already_posted then
    for v_item in select oi.*,p.track_inventory,p.stock_quantity from public.order_items oi join public.products p on p.id=oi.product_id where oi.order_id=p_order_id
    loop
      if v_item.track_inventory and v_item.stock_quantity < v_item.quantity then v_can_post:=false; end if;
    end loop;
    if v_can_post then
      for v_item in select oi.*,p.track_inventory from public.order_items oi join public.products p on p.id=oi.product_id where oi.order_id=p_order_id for update of p
      loop
        if v_item.track_inventory then
          update public.products set stock_quantity=stock_quantity-v_item.quantity where id=v_item.product_id;
          insert into public.inventory_movements(product_id,quantity_change,reason,reference_type,reference_id,created_by)
          values(v_item.product_id,-v_item.quantity,'Order inventory posting','order',p_order_id,auth.uid());
        end if;
      end loop;
      insert into public.order_inventory_postings(order_id,posted_by) values(p_order_id,auth.uid()) on conflict do nothing;
    end if;
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
end;$$;
grant execute on function public.set_order_status(uuid,public.order_status) to authenticated;

commit;

-- V12.8 inventory persistence patch: absolute stock reconciliation.
-- Prevents a stale browser balance from turning "set stock to 4" into an extra +4.
create or replace function public.set_product_inventory(
  p_product_id uuid,
  p_stock_quantity numeric,
  p_reason text default 'Absolute inventory reconciliation'
)
returns public.products language plpgsql security definer set search_path=public as $$
declare
  v public.products%rowtype;
  v_before numeric;
  v_target numeric:=coalesce(p_stock_quantity,0);
begin
  if not public.is_partner() then raise exception 'Partner access required'; end if;
  if v_target<0 then raise exception 'Inventory cannot be negative'; end if;
  select * into v from public.products where id=p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  v_before:=coalesce(v.stock_quantity,0);
  update public.products set stock_quantity=v_target where id=p_product_id returning * into v;
  if v_target<>v_before then
    insert into public.inventory_movements(product_id,quantity_change,reason,reference_type,created_by)
    values(p_product_id,v_target-v_before,coalesce(nullif(trim(p_reason),''),'Absolute inventory reconciliation'),'manual_set',auth.uid());
  end if;
  return v;
end;$$;
grant execute on function public.set_product_inventory(uuid,numeric,text) to authenticated;

-- V12.9 manual offers: offers appear only when the owner/seller explicitly enables them.
alter table public.products add column if not exists is_offer boolean not null default false;
alter table public.products add column if not exists offer_text text;

-- Partner can read customer directory; each customer can read only their own row.
-- Existing policy already provides this rule; recreate defensively for final package.
drop policy if exists nuvexa_customer_profiles_own on public.customer_profiles;
create policy nuvexa_customer_profiles_own on public.customer_profiles
for all to authenticated
using (user_id=(select auth.uid()) or (select public.is_partner()))
with check (user_id=(select auth.uid()) or (select public.is_partner()));
