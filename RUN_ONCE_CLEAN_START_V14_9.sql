-- ===============================================================
-- NUVEXA HUB V14.9 — CLEAN START / BUSINESS DATA RESET
-- RUN THIS FILE ONCE in Supabase:
-- SQL Editor -> New query -> paste/run
--
-- THIS IS DESTRUCTIVE AND CANNOT BE UNDONE WITHOUT A BACKUP.
--
-- PRESERVED ON PURPOSE:
--   auth.users
--   public.profiles
--   public.user_roles
--   platform access / owner permissions
--   site code/design
--
-- RESET:
--   products, product images, categories, reviews
--   customers' business-directory profiles
--   orders, order items, invoices, payments/accounting postings
--   seller applications/submissions
--   inventory/stock movements
--   purchases, suppliers, expenses, returns
--   licenses/devices/subscriptions if stored in dedicated tables
--   platform business state JSON
--   notifications/messages/audit/business logs
--   uploaded product-media Storage objects
-- ===============================================================

begin;

-- A temporary report lets you see exactly which public tables were reset
-- and how many rows each one contained before the reset.
create temporary table if not exists nuvexa_v14_9_reset_report(
  table_name text primary key,
  rows_before bigint not null default 0
) on commit preserve rows;

truncate table nuvexa_v14_9_reset_report;

do $reset_report$
declare
  r record;
  c bigint;
begin
  for r in
    select p.tablename
    from pg_catalog.pg_tables p
    where p.schemaname='public'
      and (
        -- Explicit current NUVEXA cloud tables
        p.tablename in (
          'products',
          'product_images',
          'product_reviews',
          'product_categories',
          'categories',
          'orders',
          'order_items',
          'order_accounting_postings',
          'invoices',
          'payments',
          'customer_profiles',
          'customers',
          'seller_applications',
          'seller_submissions',
          'platform_state',
          'platform_states',
          'app_state',
          'app_states',
          'inventory_movements',
          'product_inventory_movements',
          'stock_movements',
          'suppliers',
          'purchases',
          'purchase_items',
          'purchase_invoices',
          'expenses',
          'recurring_expenses',
          'returns',
          'return_items',
          'licenses',
          'license_products',
          'license_devices',
          'license_subscriptions',
          'notifications',
          'messages',
          'work_issues',
          'approvals',
          'journal',
          'finances',
          'backups',
          'audit',
          'audit_logs',
          'offers',
          'coupons'
        )
        -- Catch versioned/expanded business tables without touching auth.
        or p.tablename ~ '^(product_|order_|invoice_|payment_|inventory_|stock_|purchase_|supplier_|expense_|return_|license_|customer_|seller_application|seller_submission|notification_|message_|work_issue|approval_|finance_|backup_|audit_)'
      )
      and p.tablename not in (
        -- Access/security tables MUST survive.
        'profiles',
        'user_roles',
        'platform_users',
        'platform_access',
        'platform_permissions',
        'app_settings',
        'settings'
      )
    order by p.tablename
  loop
    execute format('select count(*) from public.%I',r.tablename) into c;
    insert into pg_temp.nuvexa_v14_9_reset_report(table_name,rows_before)
    values(r.tablename,c)
    on conflict(table_name) do update set rows_before=excluded.rows_before;
  end loop;
end
$reset_report$;

-- Truncate all selected business-data tables in a single CASCADE operation.
-- FK dependencies between orders/products/reviews/etc. are therefore handled
-- by PostgreSQL instead of relying on a fragile manual delete order.
do $reset_tables$
declare
  table_list text;
begin
  select string_agg(format('public.%I',table_name),', ' order by table_name)
    into table_list
  from pg_temp.nuvexa_v14_9_reset_report;

  if table_list is not null and length(table_list)>0 then
    execute 'truncate table ' || table_list || ' restart identity cascade';
  end if;
end
$reset_tables$;

-- Remove user-uploaded PRODUCT images from the current product-media bucket.
-- Branding, logos, videos and repository assets are NOT in this bucket.
delete from storage.objects
where bucket_id='product-media';

commit;

-- RESULT:
-- This result is your "what was deleted" report.
select
  table_name,
  rows_before as deleted_rows
from pg_temp.nuvexa_v14_9_reset_report
order by table_name;
