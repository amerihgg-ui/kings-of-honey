-- =====================================================================
-- NUVEXA HUB V15.2 — FULL EMPTY DATA
--
-- تصفير كامل لكل بيانات الأقسام.
--
-- سيصبح صفر/فارغ:
-- المنتجات والخدمات
-- الطلبات وبنود الطلبات
-- المشترون وملفات العملاء السحابية
-- البائعون وطلبات البائعين التجريبية
-- الفواتير
-- المخزون والحركات
-- الموردون والمشتريات
-- المصروفات
-- المرتجعات
-- التراخيص
-- التنبيهات والرسائل
-- القيود والحسابات والتقارير التشغيلية
-- Platform State
-- التقييمات
-- وكل جداول التشغيل الأخرى داخل public schema
--
-- سيبقى فقط:
-- auth.users
-- حساب المالك amerihgg@gmail.com داخل public.profiles
-- صلاحيات المالك فقط
-- جداول تعريف الأدوار/الإعدادات/الصلاحيات
-- =====================================================================

begin;

do $full_reset$
declare
  v_owner uuid;
  v_list text;
  r record;
  c bigint;
begin
  select id into v_owner
  from auth.users
  where lower(email)='amerihgg@gmail.com'
  limit 1;

  if v_owner is null then
    raise exception 'OWNER_NOT_FOUND: amerihgg@gmail.com';
  end if;

  create temporary table nx152_keep(
    oid oid primary key,
    table_name text not null
  ) on commit drop;

  insert into nx152_keep(oid,table_name)
  select c.oid,c.relname
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relkind in ('r','p')
    and (
      c.relname in (
        'profiles',
        'user_roles',
        'roles',
        'permissions',
        'role_permissions',
        'settings',
        'app_settings',
        'site_settings',
        'store_settings',
        'spatial_ref_sys'
      )
      or c.relname like '%_settings'
      or c.relname like '%permission%'
    )
  on conflict do nothing;

  create temporary table nx152_targets(
    table_name text primary key,
    rows_before bigint not null default 0,
    rows_after bigint not null default -1
  ) on commit preserve rows;

  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind in ('r','p')
      and not exists(select 1 from nx152_keep k where k.oid=c.oid)
    order by c.relname
  loop
    execute format('select count(*) from public.%I',r.table_name) into c;
    insert into nx152_targets(table_name,rows_before)
    values(r.table_name,c);
  end loop;

  select string_agg(format('public.%I',table_name),', ' order by table_name)
  into v_list
  from nx152_targets;

  if coalesce(length(v_list),0)>0 then
    execute 'truncate table '||v_list||' restart identity cascade';
  end if;

  if to_regclass('public.profiles') is not null then
    delete from public.profiles where id<>v_owner;
  end if;

  if to_regclass('public.user_roles') is not null then
    delete from public.user_roles where user_id<>v_owner;
  end if;

  if to_regclass('public.platform_users') is not null
     and exists(
       select 1 from information_schema.columns
       where table_schema='public'
         and table_name='platform_users'
         and column_name='email'
     ) then
    execute 'delete from public.platform_users where lower(email)<>''amerihgg@gmail.com''';
  end if;

  if to_regclass('public.platform_access') is not null
     and exists(
       select 1 from information_schema.columns
       where table_schema='public'
         and table_name='platform_access'
         and column_name='user_id'
     ) then
    execute format(
      'delete from public.platform_access where user_id<>%L::uuid',
      v_owner
    );
  end if;

  delete from storage.objects where bucket_id='product-media';

  for r in select table_name from nx152_targets loop
    execute format('select count(*) from public.%I',r.table_name) into c;

    update nx152_targets
       set rows_after=c
     where table_name=r.table_name;

    if c<>0 then
      raise exception
        'RESET_FAILED: public.% still has % rows',
        r.table_name,c;
    end if;
  end loop;

  if to_regclass('public.profiles') is not null
     and not exists(select 1 from public.profiles where id=v_owner) then
    raise exception 'SAFETY_ROLLBACK: owner profile was lost';
  end if;
end
$full_reset$;

commit;

select
  table_name,
  rows_before as deleted_rows,
  rows_after
from pg_temp.nx152_targets
order by table_name;
