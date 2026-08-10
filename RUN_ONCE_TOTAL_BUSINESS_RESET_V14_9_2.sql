-- ===================================================================
-- NUVEXA HUB V14.9.2 — TOTAL BUSINESS RESET
--
-- المطلوب:
-- صفر كل بيانات التشغيل بلا استثناء:
-- منتجات / خدمات / طلبات / مشترون / فواتير / مخزون / موردون /
-- مشتريات / مصروفات / مرتجعات / أرباح / قيود / تراخيص / تقييمات /
-- رسائل / إشعارات / أي جدول تشغيلي قديم أو جديد.
--
-- الذي نحافظ عليه فقط:
-- auth.users
-- public.profiles
-- public.user_roles
-- جداول الدخول/الصلاحيات/إعدادات الموقع الأساسية
-- وأي جدول تعتمد عليه الجداول المحمية بعلاقة Foreign Key.
--
-- RUN ONCE ONLY
-- ===================================================================

begin;

create temporary table nx_protected(
  oid oid primary key,
  table_name text not null
) on commit drop;

create temporary table nx_protected_counts(
  table_name text primary key,
  rows_before bigint not null
) on commit drop;

-- Protect access + settings tables if they exist.
insert into pg_temp.nx_protected(oid,table_name)
select c.oid,c.relname
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relkind in ('r','p')
  and c.relname in (
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
    'spatial_ref_sys'
  )
on conflict do nothing;

-- Protect FK ancestors required by the protected tables.
do $deps$
declare
  added integer:=1;
begin
  while added>0 loop
    with x as (
      select distinct parent.oid,parent.relname
      from pg_constraint fk
      join pg_temp.nx_protected child on child.oid=fk.conrelid
      join pg_class parent on parent.oid=fk.confrelid
      join pg_namespace pn on pn.oid=parent.relnamespace
      where fk.contype='f'
        and pn.nspname='public'
        and parent.relkind in ('r','p')
    )
    insert into pg_temp.nx_protected(oid,table_name)
    select oid,relname from x
    on conflict do nothing;

    get diagnostics added=row_count;
  end loop;
end
$deps$;

-- Snapshot protected row counts.
do $protected_snapshot$
declare
  r record;
  c bigint;
begin
  for r in select table_name from pg_temp.nx_protected loop
    execute format('select count(*) from public.%I',r.table_name) into c;
    insert into pg_temp.nx_protected_counts(table_name,rows_before)
    values(r.table_name,c);
  end loop;
end
$protected_snapshot$;

-- ALL other public tables are business data and will be cleared.
create temporary table nx_targets(
  table_name text primary key,
  rows_before bigint not null,
  rows_after bigint not null default -1
) on commit preserve rows;

do $collect$
declare
  r record;
  c bigint;
begin
  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind in ('r','p')
      and not exists(select 1 from pg_temp.nx_protected p where p.oid=c.oid)
    order by c.relname
  loop
    execute format('select count(*) from public.%I',r.table_name) into c;
    insert into pg_temp.nx_targets(table_name,rows_before)
    values(r.table_name,c);
  end loop;
end
$collect$;

-- Truncate every operational public table.
do $wipe$
declare
  list text;
begin
  select string_agg(format('public.%I',table_name),', ' order by table_name)
  into list
  from pg_temp.nx_targets;

  if coalesce(length(list),0)>0 then
    execute 'truncate table '||list||' restart identity cascade';
  end if;
end
$wipe$;

-- Uploaded product media is operational data too.
delete from storage.objects
where bucket_id='product-media';

-- Verify EVERY target table is actually zero.
do $verify_zero$
declare
  r record;
  c bigint;
begin
  for r in select table_name from pg_temp.nx_targets loop
    execute format('select count(*) from public.%I',r.table_name) into c;

    update pg_temp.nx_targets
    set rows_after=c
    where table_name=r.table_name;

    if c<>0 then
      raise exception 'RESET FAILED: public.% still contains % rows',r.table_name,c;
    end if;
  end loop;
end
$verify_zero$;

-- Verify access/settings tables were NOT changed.
do $verify_protected$
declare
  r record;
  c bigint;
begin
  for r in select * from pg_temp.nx_protected_counts loop
    execute format('select count(*) from public.%I',r.table_name) into c;

    if c<>r.rows_before then
      raise exception
        'SAFETY ROLLBACK: protected public.% changed (% -> %)',
        r.table_name,r.rows_before,c;
    end if;
  end loop;
end
$verify_protected$;

commit;

-- MUST SHOW rows_after = 0 FOR EVERY ROW.
select
  table_name,
  rows_before as deleted_rows,
  rows_after
from pg_temp.nx_targets
order by table_name;
