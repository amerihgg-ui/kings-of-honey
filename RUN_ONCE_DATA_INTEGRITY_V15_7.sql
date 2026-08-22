-- =====================================================================
-- NUVEXA HUB V15.7 — DATA INTEGRITY + INVENTORY CLOUD SYNC
-- Run ONCE in Supabase SQL Editor.
-- No reset. No deletes. No Google OAuth changes.
-- =====================================================================

begin;

-- Each operational section is saved independently so a change from one
-- device does not overwrite unrelated sections saved from another device.
create table if not exists public.operational_sections_v157 (
  section_key text primary key,
  state_data jsonb not null default 'null'::jsonb,
  revision bigint not null default 1,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

alter table public.operational_sections_v157 enable row level security;

drop policy if exists operational_sections_v157_partner on public.operational_sections_v157;
create policy operational_sections_v157_partner
on public.operational_sections_v157
for all to authenticated
using ((select public.is_partner()))
with check ((select public.is_partner()));

create or replace function public.get_operational_sections_v157()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if auth.uid() is null or not public.is_partner() then
    raise exception 'Partner access required';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'section_key',section_key,
        'state_data',state_data,
        'revision',revision,
        'updated_at',updated_at,
        'updated_by',updated_by
      ) order by section_key
    )
    from public.operational_sections_v157
  ),'[]'::jsonb);
end;
$$;

create or replace function public.save_operational_sections_v157(p_sections jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r record;
begin
  if auth.uid() is null or not public.is_partner() then
    raise exception 'Partner access required';
  end if;

  if jsonb_typeof(coalesce(p_sections,'{}'::jsonb)) <> 'object' then
    raise exception 'Sections payload must be an object';
  end if;

  for r in select key,value from jsonb_each(coalesce(p_sections,'{}'::jsonb))
  loop
    insert into public.operational_sections_v157(
      section_key,state_data,revision,updated_by,updated_at
    )
    values(r.key,r.value,1,auth.uid(),now())
    on conflict(section_key) do update
    set state_data=excluded.state_data,
        revision=public.operational_sections_v157.revision+1,
        updated_by=excluded.updated_by,
        updated_at=now();
  end loop;

  return public.get_operational_sections_v157();
end;
$$;


-- ---------------------------------------------------------------------
-- Record-level operational persistence.
-- Each entity is stored independently so saves from different devices do
-- not overwrite unrelated invoices/customers/expenses.
-- ---------------------------------------------------------------------
create table if not exists public.operational_records_v157 (
  section_key text not null,
  record_key text not null,
  record_data jsonb,
  deleted boolean not null default false,
  revision bigint not null default 1,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key(section_key,record_key)
);

create index if not exists ix_operational_records_v157_section
  on public.operational_records_v157(section_key,updated_at desc);

alter table public.operational_records_v157 enable row level security;

drop policy if exists operational_records_v157_partner on public.operational_records_v157;
create policy operational_records_v157_partner
on public.operational_records_v157
for all to authenticated
using ((select public.is_partner()))
with check ((select public.is_partner()));

create or replace function public.get_operational_records_v157()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if auth.uid() is null or not public.is_partner() then
    raise exception 'Partner access required';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'section_key',section_key,
        'record_key',record_key,
        'record_data',record_data,
        'deleted',deleted,
        'revision',revision,
        'updated_at',updated_at,
        'updated_by',updated_by
      ) order by section_key,record_key
    )
    from public.operational_records_v157
  ),'[]'::jsonb);
end;
$$;

create or replace function public.save_operational_records_v157(p_records jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r jsonb;
  v_section text;
  v_key text;
begin
  if auth.uid() is null or not public.is_partner() then
    raise exception 'Partner access required';
  end if;

  if jsonb_typeof(coalesce(p_records,'[]'::jsonb)) <> 'array' then
    raise exception 'Records payload must be an array';
  end if;

  for r in select value from jsonb_array_elements(coalesce(p_records,'[]'::jsonb))
  loop
    v_section:=nullif(trim(r->>'section_key'),'');
    v_key:=nullif(trim(r->>'record_key'),'');

    if v_section is null or v_key is null then
      raise exception 'section_key and record_key are required';
    end if;

    insert into public.operational_records_v157(
      section_key,record_key,record_data,deleted,revision,updated_by,updated_at
    )
    values(
      v_section,v_key,r->'record_data',
      coalesce((r->>'deleted')::boolean,false),
      1,auth.uid(),now()
    )
    on conflict(section_key,record_key) do update
    set record_data=excluded.record_data,
        deleted=excluded.deleted,
        revision=public.operational_records_v157.revision+1,
        updated_by=excluded.updated_by,
        updated_at=now();
  end loop;

  return public.get_operational_records_v157();
end;
$$;

-- ---------------------------------------------------------------------
-- Idempotent + concurrent-safe inventory operations.
-- If an existing cloud flow already posted local_after, no duplicate stock
-- movement occurs. Otherwise the local delta is applied to CURRENT server
-- stock, so simultaneous devices do not overwrite each other's movements.
-- ---------------------------------------------------------------------
create table if not exists public.inventory_sync_ops_v157 (
  op_id uuid primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  local_before numeric not null,
  local_after numeric not null,
  applied_delta numeric not null default 0,
  server_before numeric not null default 0,
  server_after numeric not null default 0,
  target_cost numeric,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.inventory_sync_ops_v157 enable row level security;

drop policy if exists inventory_sync_ops_v157_partner on public.inventory_sync_ops_v157;
create policy inventory_sync_ops_v157_partner
on public.inventory_sync_ops_v157
for select to authenticated
using ((select public.is_partner()));

create or replace function public.apply_product_inventory_change_v157(
  p_op_id uuid,
  p_product_id uuid,
  p_local_before numeric,
  p_local_after numeric,
  p_target_cost numeric default null,
  p_reason text default 'NUVEXA operational sync'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v public.products%rowtype;
  v_existing public.inventory_sync_ops_v157%rowtype;
  v_delta numeric;
  v_apply numeric;
  v_server_before numeric;
  v_server_after numeric;
begin
  if auth.uid() is null or not public.is_partner() then
    raise exception 'Partner access required';
  end if;

  if p_op_id is null or p_product_id is null then
    raise exception 'Operation id and product id are required';
  end if;

  if p_local_before is null or p_local_after is null or p_local_after < 0 then
    raise exception 'Invalid inventory values';
  end if;

  select * into v_existing
  from public.inventory_sync_ops_v157
  where op_id=p_op_id;

  if found then
    return jsonb_build_object(
      'id',v_existing.product_id,
      'stock_quantity',v_existing.server_after,
      'applied_delta',v_existing.applied_delta,
      'already_applied',true
    );
  end if;

  select * into v
  from public.products
  where id=p_product_id
  for update;

  if not found then raise exception 'Product not found'; end if;

  if not coalesce(v.track_inventory,true) then
    return jsonb_build_object(
      'id',v.id,'stock_quantity',v.stock_quantity,
      'cost_price',v.cost_price,'skipped',true
    );
  end if;

  v_server_before:=coalesce(v.stock_quantity,0);
  v_delta:=p_local_after-p_local_before;

  if v_server_before=p_local_after then
    v_apply:=0;
    v_server_after:=v_server_before;
  else
    v_apply:=v_delta;
    v_server_after:=v_server_before+v_apply;
  end if;

  if v_server_after<0 then raise exception 'Inventory cannot become negative'; end if;

  update public.products
  set stock_quantity=v_server_after,
      cost_price=case
        when p_target_cost is not null and p_target_cost>=0 then p_target_cost
        else cost_price
      end
  where id=p_product_id
  returning * into v;

  if v_apply<>0 then
    insert into public.inventory_movements(
      product_id,quantity_change,reason,reference_type,created_by
    )
    values(
      p_product_id,v_apply,
      coalesce(nullif(trim(p_reason),''),'NUVEXA operational sync'),
      'admin_sync_v157',auth.uid()
    );
  end if;

  insert into public.inventory_sync_ops_v157(
    op_id,product_id,local_before,local_after,applied_delta,
    server_before,server_after,target_cost,reason,created_by
  )
  values(
    p_op_id,p_product_id,p_local_before,p_local_after,v_apply,
    v_server_before,v_server_after,p_target_cost,
    coalesce(nullif(trim(p_reason),''),'NUVEXA operational sync'),
    auth.uid()
  );

  return jsonb_build_object(
    'id',v.id,'stock_quantity',v.stock_quantity,
    'cost_price',v.cost_price,'applied_delta',v_apply,
    'server_before',v_server_before,'already_applied',v_apply=0
  );
end;
$$;

-- Absolute inventory sync used only when the existing app changes stock
-- locally (purchase invoice, direct POS sale, return, invoice edit, etc.).
-- Absolute target makes retries idempotent and prevents double posting.
create or replace function public.sync_product_inventory_state_v157(
  p_product_id uuid,
  p_target_stock numeric,
  p_target_cost numeric default null,
  p_reason text default 'NUVEXA operational sync'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v public.products%rowtype;
  v_before numeric;
  v_delta numeric;
begin
  if auth.uid() is null or not public.is_partner() then
    raise exception 'Partner access required';
  end if;

  if p_target_stock is null or p_target_stock < 0 then
    raise exception 'Inventory cannot be negative';
  end if;

  select * into v
  from public.products
  where id=p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  if not coalesce(v.track_inventory,true) then
    return jsonb_build_object(
      'id',v.id,
      'stock_quantity',v.stock_quantity,
      'cost_price',v.cost_price,
      'skipped',true
    );
  end if;

  v_before:=coalesce(v.stock_quantity,0);
  v_delta:=p_target_stock-v_before;

  update public.products
  set stock_quantity=p_target_stock,
      cost_price=case
        when p_target_cost is not null and p_target_cost >= 0 then p_target_cost
        else cost_price
      end
  where id=p_product_id
  returning * into v;

  if v_delta<>0 then
    insert into public.inventory_movements(
      product_id,quantity_change,reason,reference_type,created_by
    )
    values(
      p_product_id,v_delta,
      coalesce(nullif(trim(p_reason),''),'NUVEXA operational sync'),
      'admin_sync_v157',auth.uid()
    );
  end if;

  return jsonb_build_object(
    'id',v.id,
    'stock_quantity',v.stock_quantity,
    'cost_price',v.cost_price,
    'quantity_change',v_delta
  );
end;
$$;

revoke all on function public.get_operational_records_v157() from public,anon;
revoke all on function public.save_operational_records_v157(jsonb) from public,anon;
revoke all on function public.apply_product_inventory_change_v157(uuid,uuid,numeric,numeric,numeric,text) from public,anon;

grant execute on function public.get_operational_records_v157() to authenticated;
grant execute on function public.save_operational_records_v157(jsonb) to authenticated;
grant execute on function public.apply_product_inventory_change_v157(uuid,uuid,numeric,numeric,numeric,text) to authenticated;

revoke all on function public.get_operational_sections_v157() from public,anon;
revoke all on function public.save_operational_sections_v157(jsonb) from public,anon;
revoke all on function public.sync_product_inventory_state_v157(uuid,numeric,numeric,text) from public,anon;

grant execute on function public.get_operational_sections_v157() to authenticated;
grant execute on function public.save_operational_sections_v157(jsonb) to authenticated;
grant execute on function public.sync_product_inventory_state_v157(uuid,numeric,numeric,text) to authenticated;

commit;

select
  'NUVEXA Data Integrity V15.7' as migration,
  'READY' as status,
  (select count(*) from public.operational_sections_v157) as saved_sections,
  (select count(*) from public.operational_records_v157) as saved_records,
  (select count(*) from public.inventory_sync_ops_v157) as inventory_sync_operations;
