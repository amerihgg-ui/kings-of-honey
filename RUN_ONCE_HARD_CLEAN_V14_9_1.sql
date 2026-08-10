-- =====================================================================
-- NUVEXA HUB V14.9.1 — HARD CLEAN START
--
-- السبب:
-- النسخة V14.9 صفّرت المتصفح، لكن حالة لوحة الإدارة السحابية القديمة
-- كانت يمكن أن تُحمّل من جديد بعد تسجيل الدخول.
--
-- هذا الملف يمسح كل بيانات التشغيل من public schema مع حماية:
--   public.profiles
--   public.user_roles
--   جداول الإعدادات/الصلاحيات الأساسية إن وجدت
--   وأي جدول تعتمد عليه الجداول المحمية عبر Foreign Keys
--
-- كما أنه لا يلمس auth.users.
--
-- شغّله مرة واحدة فقط:
-- Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

begin;

-- -----------------------------
-- 1) Snapshot safety counts
-- -----------------------------
create temporary table nx_hard_reset_protected_counts(
  table_name text primary key,
  rows_before bigint not null default 0
) on commit drop;

do $snapshot$
declare
  c bigint;
begin
  if to_regclass('public.profiles') is not null then
    execute 'select count(*) from public.profiles' into c;
    insert into pg_temp.nx_hard_reset_protected_counts values ('profiles',c);
  end if;

  if to_regclass('public.user_roles') is not null then
    execute 'select count(*) from public.user_roles' into c;
    insert into pg_temp.nx_hard_reset_protected_counts values ('user_roles',c);
  end if;
end
$snapshot$;

-- -----------------------------
-- 2) Build protected-table set
-- -----------------------------
create temporary table nx_hard_reset_protected(
  oid oid primary key,
  table_name text not null
) on commit drop;

insert into pg_temp.nx_hard_reset_protected(oid,table_name)
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
    'settings',
    'app_settings',
    'site_settings',
    'spatial_ref_sys'
  )
on conflict do nothing;

-- Protect every PUBLIC table referenced by an already-protected table.
-- This prevents TRUNCATE ... CASCADE from ever reaching profiles/user_roles
-- through an outgoing FK dependency.
do $protect_dependencies$
declare
  inserted_count integer:=1;
begin
  while inserted_count>0 loop
    with deps as (
      select distinct ref.oid,ref.relname
      from pg_constraint fk
      join pg_temp.nx_hard_reset_protected p on p.oid=fk.conrelid
      join pg_class ref on ref.oid=fk.confrelid
      join pg_namespace rn on rn.oid=ref.relnamespace
      where fk.contype='f'
        and rn.nspname='public'
        and ref.relkind in ('r','p')
    )
    insert into pg_temp.nx_hard_reset_protected(oid,table_name)
    select oid,relname from deps
    on conflict do nothing;

    get diagnostics inserted_count=row_count;
  end loop;
end
$protect_dependencies$;

-- -----------------------------
-- 3) Collect ALL remaining public tables
-- -----------------------------
create temporary table nx_hard_reset_targets(
  table_name text primary key,
  rows_before bigint not null default 0,
  rows_after bigint not null default 0
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
      and not exists (
        select 1
        from pg_temp.nx_hard_reset_protected p
        where p.oid=c.oid
      )
    order by c.relname
  loop
    execute format('select count(*) from public.%I',r.table_name) into c;
    insert into pg_temp.nx_hard_reset_targets(table_name,rows_before)
    values(r.table_name,c);
  end loop;
end
$collect$;

-- -----------------------------
-- 4) Hard truncate everything operational
-- -----------------------------
do $truncate$
declare
  table_list text;
begin
  select string_agg(format('public.%I',table_name),', ' order by table_name)
    into table_list
  from pg_temp.nx_hard_reset_targets;

  if table_list is not null and length(table_list)>0 then
    execute 'truncate table ' || table_list || ' restart identity cascade';
  end if;
end
$truncate$;

-- -----------------------------
-- 5) Uploaded product media only
-- -----------------------------
delete from storage.objects
where bucket_id='product-media';

-- -----------------------------
-- 6) Verify operational tables are truly zero
-- -----------------------------
do $verify_targets$
declare
  r record;
  c bigint;
begin
  for r in select table_name from pg_temp.nx_hard_reset_targets loop
    execute format('select count(*) from public.%I',r.table_name) into c;
    update pg_temp.nx_hard_reset_targets
       set rows_after=c
     where table_name=r.table_name;

    if c<>0 then
      raise exception 'HARD RESET FAILED: public.% still has % rows',r.table_name,c;
    end if;
  end loop;
end
$verify_targets$;

-- -----------------------------
-- 7) SAFETY: profiles/user_roles must be unchanged
-- If not, ROLLBACK the entire transaction automatically.
-- -----------------------------
do $verify_protected$
declare
  r record;
  c bigint;
begin
  for r in select * from pg_temp.nx_hard_reset_protected_counts loop
    execute format('select count(*) from public.%I',r.table_name) into c;
    if c<>r.rows_before then
      raise exception
        'SAFETY STOP: protected table public.% changed from % rows to % rows',
        r.table_name,r.rows_before,c;
    end if;
  end loop;
end
$verify_protected$;

commit;

-- FINAL REPORT:
-- rows_after MUST be 0 for every listed operational table.
select
  table_name,
  rows_before as deleted_rows,
  rows_after
from pg_temp.nx_hard_reset_targets
order by table_name;
