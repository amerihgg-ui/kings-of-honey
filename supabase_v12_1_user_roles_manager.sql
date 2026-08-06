-- NUVEXA HUB V12.1 — Cloud user & role manager
-- Run once in Supabase SQL Editor after V11 schema.
begin;

create table if not exists public.role_invitations (
  email text not null,
  display_name text,
  role_key public.app_role not null references public.roles(key) on delete restrict,
  is_active boolean not null default true,
  invited_by uuid references public.profiles(id) on delete set null,
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (email, role_key),
  check (email = lower(trim(email)))
);

create index if not exists idx_role_invitations_email on public.role_invitations (lower(email));

alter table public.role_invitations enable row level security;
drop policy if exists nuvexa_role_invitations_partner_all on public.role_invitations;
create policy nuvexa_role_invitations_partner_all on public.role_invitations
for all to authenticated
using ((select public.is_partner()))
with check ((select public.is_partner()));

-- Apply invitations automatically when the invited email signs in for the first time.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name');
  v_avatar text := coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');
begin
  insert into public.profiles(id,email,full_name,avatar_url,status)
  values(new.id,v_email,v_name,v_avatar,'active')
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  insert into public.user_roles(user_id,role_key,is_active)
  values(new.id,'buyer',true)
  on conflict (user_id,role_key) do update set is_active = true;

  insert into public.user_roles(user_id,role_key,is_active,granted_by)
  select new.id,ri.role_key,ri.is_active,ri.invited_by
  from public.role_invitations ri
  where lower(ri.email)=v_email
  on conflict (user_id,role_key) do update set
    is_active=excluded.is_active,
    granted_by=excluded.granted_by;

  update public.role_invitations
  set claimed_by=new.id,claimed_at=coalesce(claimed_at,now()),updated_at=now()
  where lower(email)=v_email;

  if v_email = 'amerihgg@gmail.com' then
    insert into public.user_roles(user_id,role_key,is_active)
    values (new.id,'seller',true),(new.id,'partner',true)
    on conflict (user_id,role_key) do update set is_active=true;
  end if;
  return new;
end;
$$;

-- Create/update an access record. Works before or after first Google sign-in.
create or replace function public.upsert_platform_user_access(
  p_email text,
  p_display_name text,
  p_role public.app_role,
  p_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email,'')));
  v_user_id uuid;
begin
  if not public.is_partner() then raise exception 'Not authorized'; end if;
  if v_email='' or position('@' in v_email)=0 then raise exception 'Invalid email'; end if;
  if v_email='amerihgg@gmail.com' then raise exception 'Owner account is protected'; end if;

  select id into v_user_id from public.profiles where lower(email)=v_email limit 1;

  insert into public.role_invitations(email,display_name,role_key,is_active,invited_by,claimed_by,claimed_at)
  values(v_email,nullif(trim(coalesce(p_display_name,'')),''),p_role,p_active,auth.uid(),v_user_id,case when v_user_id is null then null else now() end)
  on conflict (email,role_key) do update set
    display_name=excluded.display_name,
    is_active=excluded.is_active,
    invited_by=excluded.invited_by,
    claimed_by=coalesce(public.role_invitations.claimed_by,excluded.claimed_by),
    claimed_at=coalesce(public.role_invitations.claimed_at,excluded.claimed_at),
    updated_at=now();

  if v_user_id is not null then
    update public.profiles
      set full_name=coalesce(nullif(trim(coalesce(p_display_name,'')),''),full_name),
          status=case when p_active then 'active'::public.account_status else 'suspended'::public.account_status end,
          updated_at=now()
      where id=v_user_id;

    insert into public.user_roles(user_id,role_key,is_active,granted_by)
    values(v_user_id,p_role,p_active,auth.uid())
    on conflict (user_id,role_key) do update set is_active=excluded.is_active,granted_by=excluded.granted_by;
  end if;
end;
$$;

create or replace function public.set_platform_user_active(p_email text,p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_email text:=lower(trim(coalesce(p_email,''))); v_user_id uuid;
begin
  if not public.is_partner() then raise exception 'Not authorized'; end if;
  if v_email='amerihgg@gmail.com' then raise exception 'Owner account is protected'; end if;
  update public.role_invitations set is_active=p_active,updated_at=now() where lower(email)=v_email;
  select id into v_user_id from public.profiles where lower(email)=v_email limit 1;
  if v_user_id is not null then
    update public.profiles set status=case when p_active then 'active'::public.account_status else 'suspended'::public.account_status end,updated_at=now() where id=v_user_id;
    update public.user_roles set is_active=p_active where user_id=v_user_id and role_key<>'buyer';
  end if;
end;
$$;

create or replace function public.remove_platform_user_access(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_email text:=lower(trim(coalesce(p_email,''))); v_user_id uuid;
begin
  if not public.is_partner() then raise exception 'Not authorized'; end if;
  if v_email='amerihgg@gmail.com' then raise exception 'Owner account is protected'; end if;
  delete from public.role_invitations where lower(email)=v_email;
  select id into v_user_id from public.profiles where lower(email)=v_email limit 1;
  if v_user_id is not null then
    delete from public.user_roles where user_id=v_user_id and role_key in ('seller','partner');
    update public.profiles set status='active',updated_at=now() where id=v_user_id;
  end if;
end;
$$;

create or replace function public.list_platform_users()
returns table(
  email text, display_name text, role text, active boolean, protected boolean,
  claimed boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with live as (
    select p.email,p.full_name,
      case when lower(p.email)='amerihgg@gmail.com' then 'owner'
           when bool_or(ur.role_key='partner' and ur.is_active) then 'admin'
           when bool_or(ur.role_key='seller' and ur.is_active) then 'seller'
           else 'customer' end as role,
      p.status='active' as active,
      lower(p.email)='amerihgg@gmail.com' as protected,
      true as claimed,p.created_at
    from public.profiles p left join public.user_roles ur on ur.user_id=p.id
    group by p.id
  ), pending as (
    select ri.email,max(ri.display_name) as full_name,
      case when bool_or(ri.role_key='partner' and ri.is_active) then 'admin'
           when bool_or(ri.role_key='seller' and ri.is_active) then 'seller'
           else 'customer' end as role,
      bool_or(ri.is_active) as active,false as protected,false as claimed,min(ri.created_at) as created_at
    from public.role_invitations ri
    where ri.claimed_by is null
    group by ri.email
  )
  select l.email,l.full_name,l.role,l.active,l.protected,l.claimed,l.created_at from live l
  union all
  select p.email,p.full_name,p.role,p.active,p.protected,p.claimed,p.created_at from pending p
  where not exists(select 1 from live l where lower(l.email)=lower(p.email))
  order by protected desc,created_at desc;
$$;

grant execute on function public.upsert_platform_user_access(text,text,public.app_role,boolean) to authenticated;
grant execute on function public.set_platform_user_active(text,boolean) to authenticated;
grant execute on function public.remove_platform_user_access(text) to authenticated;
grant execute on function public.list_platform_users() to authenticated;

commit;
