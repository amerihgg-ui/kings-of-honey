-- =====================================================================
-- NUVEXA HUB V15.1 — VERIFIED FACTORY RESET INSTALLER
--
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor.
--
-- بعد تشغيله ورفع ملفات V15.1:
-- أول دخول بحساب المالك amerihgg@gmail.com يستدعي RPC
-- nuvexa_factory_reset_v151()
--
-- الـRPC:
-- 1) يتأكد أن المستخدم الحالي هو صاحب المنصة.
-- 2) يمسح كل جداول التشغيل في public ما عدا حسابات الدخول/الصلاحيات/الإعدادات.
-- 3) يمسح product-media.
-- 4) يتحقق أن كل جدول تم مسحه أصبح 0.
-- 5) فقط بعد نجاح التحقق يكتب Marker دائم يمنع إعادة التصفير.
--
-- لا يتم حذف auth.users / profiles / user_roles.
-- =====================================================================

begin;

-- Marker lives outside business data and survives the reset.
create table if not exists public.nuvexa_system_meta(
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.nuvexa_system_meta enable row level security;
revoke all on table public.nuvexa_system_meta from anon, authenticated;

create or replace function public.nuvexa_factory_reset_v151()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_uid uuid:=auth.uid();
  v_email text;
  v_done boolean:=false;
  v_table_list text;
  v_row record;
  v_count bigint;
  v_deleted_tables integer:=0;
  v_deleted_rows bigint:=0;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Server-side owner verification. No partner/seller can run this.
  select lower(email)
    into v_email
  from auth.users
  where id=v_uid;

  if coalesce(v_email,'')<>'amerihgg@gmail.com' then
    raise exception 'OWNER_ONLY';
  end if;

  select exists(
    select 1
    from public.nuvexa_system_meta
    where key='factory_reset_v15_1'
      and value->>'status'='complete'
  ) into v_done;

  if v_done then
    return jsonb_build_object(
      'ok',true,
      'reset_performed',false,
      'message','Factory reset already completed'
    );
  end if;

  -- Protected tables: login/access/settings only.
  create temporary table nx151_keep(
    oid oid primary key,
    table_name text not null
  ) on commit drop;

  insert into nx151_keep(oid,table_name)
  select c.oid,c.relname
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relkind in ('r','p')
    and (
      c.relname in (
        'profiles',
        'user_roles',
        'platform_users',
        'platform_access',
        'platform_permissions',
        'permissions',
        'roles',
        'settings',
        'app_settings',
        'site_settings',
        'store_settings',
        'nuvexa_system_meta',
        'spatial_ref_sys'
      )
      or c.relname like '%permission%'
      or c.relname like '%setting%'
    )
  on conflict do nothing;

  -- If a protected table references another public table, protect that parent too.
  declare
    v_added integer:=1;
  begin
    while v_added>0 loop
      with deps as (
        select distinct parent.oid,parent.relname
        from pg_constraint fk
        join nx151_keep child on child.oid=fk.conrelid
        join pg_class parent on parent.oid=fk.confrelid
        join pg_namespace pn on pn.oid=parent.relnamespace
        where fk.contype='f'
          and pn.nspname='public'
          and parent.relkind in ('r','p')
      )
      insert into nx151_keep(oid,table_name)
      select oid,relname from deps
      on conflict do nothing;

      get diagnostics v_added=row_count;
    end loop;
  end;

  create temporary table nx151_targets(
    table_name text primary key,
    rows_before bigint not null default 0
  ) on commit drop;

  -- EVERYTHING else in public = operational/business data.
  for v_row in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind in ('r','p')
      and not exists(
        select 1 from nx151_keep k where k.oid=c.oid
      )
    order by c.relname
  loop
    execute format('select count(*) from public.%I',v_row.table_name)
      into v_count;

    insert into nx151_targets(table_name,rows_before)
    values(v_row.table_name,v_count);

    v_deleted_rows:=v_deleted_rows+v_count;
  end loop;

  select count(*) into v_deleted_tables from nx151_targets;

  select string_agg(format('public.%I',table_name),', ' order by table_name)
    into v_table_list
  from nx151_targets;

  if coalesce(length(v_table_list),0)>0 then
    execute 'truncate table '||v_table_list||' restart identity cascade';
  end if;

  -- Product uploads are business data; repository logo/videos are untouched.
  delete from storage.objects
  where bucket_id='product-media';

  -- HARD verification. Failure raises and rolls back everything.
  for v_row in select table_name from nx151_targets loop
    execute format('select count(*) from public.%I',v_row.table_name)
      into v_count;

    if v_count<>0 then
      raise exception
        'RESET_VERIFICATION_FAILED: public.% still contains % rows',
        v_row.table_name,v_count;
    end if;
  end loop;

  -- Success marker is written ONLY after every business table verifies as zero.
  insert into public.nuvexa_system_meta(key,value,updated_at)
  values(
    'factory_reset_v15_1',
    jsonb_build_object(
      'status','complete',
      'completed_at',now(),
      'owner_id',v_uid,
      'deleted_tables',v_deleted_tables,
      'deleted_rows',v_deleted_rows
    ),
    now()
  )
  on conflict(key) do update
    set value=excluded.value,
        updated_at=excluded.updated_at;

  return jsonb_build_object(
    'ok',true,
    'reset_performed',true,
    'deleted_tables',v_deleted_tables,
    'deleted_rows',v_deleted_rows,
    'message','All business data verified at zero'
  );
end;
$$;

revoke all on function public.nuvexa_factory_reset_v151() from public, anon;
grant execute on function public.nuvexa_factory_reset_v151() to authenticated;

commit;

-- تأكيد أن الـRPC اتثبت:
select
  'nuvexa_factory_reset_v151' as installed_function,
  'READY' as status;
