-- =====================================================================
-- NUVEXA HUB V15.4 — SELLER APPLICATION APPROVAL WORKFLOW
--
-- Run ONCE in Supabase SQL Editor.
--
-- Adds:
-- 1) rejection_reason on seller applications
-- 2) my-application RPC for the customer account
-- 3) admin list RPC
-- 4) review RPC with rejection reason
-- 5) approval grants seller role to same Google user automatically
--
-- Does NOT change Google OAuth.
-- Does NOT delete any business data.
-- =====================================================================

begin;

alter table public.seller_applications
  add column if not exists rejection_reason text;

-- Keep the existing submission RPC name so app.js continues working.
-- Re-submitting a rejected application clears the old rejection reason.
create or replace function public.submit_seller_application(
  p_business_name text default '',
  p_notes text default ''
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_email text;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select
    email,
    coalesce(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      split_part(email,'@',1)
    )
  into v_email,v_name
  from auth.users
  where id=auth.uid();

  insert into public.seller_applications(
    user_id,email,full_name,business_name,notes,status,
    rejection_reason,reviewed_by,reviewed_at
  )
  values(
    auth.uid(),
    lower(v_email),
    v_name,
    nullif(trim(p_business_name),''),
    nullif(trim(p_notes),''),
    'pending',
    null,
    null,
    null
  )
  on conflict(user_id) do update
  set
    email=excluded.email,
    full_name=excluded.full_name,
    business_name=excluded.business_name,
    notes=excluded.notes,
    status='pending',
    rejection_reason=null,
    reviewed_by=null,
    reviewed_at=null,
    updated_at=now();
end;
$$;

create or replace function public.get_my_seller_application_v154()
returns public.seller_applications
language sql
stable
security definer
set search_path=public
as $$
  select *
  from public.seller_applications
  where user_id=auth.uid()
  limit 1;
$$;

create or replace function public.list_seller_applications_v154()
returns setof public.seller_applications
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if auth.uid() is null or not public.is_partner() then
    raise exception 'Partner access required';
  end if;

  return query
  select *
  from public.seller_applications
  order by
    case status when 'pending' then 0 when 'approved' then 1 else 2 end,
    created_at desc;
end;
$$;

create or replace function public.review_seller_application_v154(
  p_application_id uuid,
  p_decision text,
  p_reason text default ''
)
returns public.seller_applications
language plpgsql
security definer
set search_path=public
as $$
declare
  v public.seller_applications%rowtype;
  v_reason text:=nullif(trim(coalesce(p_reason,'')),'');
begin
  if auth.uid() is null or not public.is_partner() then
    raise exception 'Partner access required';
  end if;

  if p_decision not in ('approved','rejected') then
    raise exception 'Invalid decision';
  end if;

  if p_decision='rejected' and length(coalesce(v_reason,''))<3 then
    raise exception 'Rejection reason is required';
  end if;

  update public.seller_applications
  set
    status=p_decision,
    rejection_reason=case when p_decision='rejected' then v_reason else null end,
    reviewed_by=auth.uid(),
    reviewed_at=now(),
    updated_at=now()
  where id=p_application_id
  returning * into v;

  if not found then
    raise exception 'Application not found';
  end if;

  -- Approval: grant seller role to this exact authenticated user.
  if p_decision='approved' then
    insert into public.user_roles(
      user_id,role_key,is_active,granted_by
    )
    values(
      v.user_id,'seller',true,auth.uid()
    )
    on conflict(user_id,role_key) do update
    set
      is_active=true,
      granted_by=excluded.granted_by;
  end if;

  -- Rejection intentionally does NOT alter any user role.
  return v;
end;
$$;

grant execute on function public.submit_seller_application(text,text) to authenticated;
grant execute on function public.get_my_seller_application_v154() to authenticated;
grant execute on function public.list_seller_applications_v154() to authenticated;
grant execute on function public.review_seller_application_v154(uuid,text,text) to authenticated;

commit;

select
  'seller_application_workflow_v15_4' as migration,
  'READY' as status;
