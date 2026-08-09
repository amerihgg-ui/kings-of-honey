-- NUVEXA HUB V13.0 — Product Reviews & Ratings
-- Run ONCE in Supabase -> SQL Editor -> New query.
-- This adds ONLY the product reviews/ratings feature.

begin;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  buyer_name text not null default 'عميل',
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  is_verified_purchase boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id,buyer_id)
);

create index if not exists idx_product_reviews_product_created
  on public.product_reviews(product_id,created_at desc);

alter table public.product_reviews enable row level security;

-- No direct browser access to the table. Public reading goes through a safe RPC
-- that does not expose buyer IDs or emails.
revoke all on table public.product_reviews from anon, authenticated;

create or replace function public.get_public_product_reviews(p_product_id uuid)
returns table(
  review_id uuid,
  product_id uuid,
  buyer_name text,
  rating smallint,
  comment text,
  verified boolean,
  created_at timestamptz,
  updated_at timestamptz,
  is_mine boolean
)
language sql
stable
security definer
set search_path=public
as $$
  select
    r.id,
    r.product_id,
    r.buyer_name,
    r.rating,
    r.comment,
    r.is_verified_purchase,
    r.created_at,
    r.updated_at,
    (auth.uid() is not null and r.buyer_id=auth.uid()) as is_mine
  from public.product_reviews r
  where r.product_id=p_product_id
  order by r.created_at desc;
$$;

create or replace function public.can_review_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select
    auth.uid() is not null
    and exists(
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id=o.id
      where o.buyer_id=auth.uid()
        and o.status='completed'
        and oi.product_id=p_product_id
    );
$$;

create or replace function public.upsert_product_review(
  p_product_id uuid,
  p_rating integer,
  p_comment text default ''
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_name text;
  v_review_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_rating is null or p_rating<1 or p_rating>5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  if char_length(coalesce(p_comment,''))>1000 then
    raise exception 'Comment is too long';
  end if;

  if not exists(
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id=o.id
    where o.buyer_id=v_uid
      and o.status='completed'
      and oi.product_id=p_product_id
  ) then
    raise exception 'A completed purchase is required before reviewing this product';
  end if;

  select coalesce(
    nullif(trim(cp.full_name),''),
    nullif(trim(u.raw_user_meta_data->>'full_name'),''),
    nullif(trim(u.raw_user_meta_data->>'name'),''),
    split_part(coalesce(u.email,''),'@',1),
    'عميل'
  )
  into v_name
  from auth.users u
  left join public.customer_profiles cp on cp.user_id=u.id
  where u.id=v_uid;

  insert into public.product_reviews(
    product_id,buyer_id,buyer_name,rating,comment,is_verified_purchase,created_at,updated_at
  )
  values(
    p_product_id,v_uid,coalesce(v_name,'عميل'),p_rating,trim(coalesce(p_comment,'')),true,now(),now()
  )
  on conflict(product_id,buyer_id)
  do update set
    buyer_name=excluded.buyer_name,
    rating=excluded.rating,
    comment=excluded.comment,
    is_verified_purchase=true,
    updated_at=now()
  returning id into v_review_id;

  return v_review_id;
end;
$$;

create or replace function public.delete_product_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null or not public.is_partner() then
    raise exception 'Partner access required';
  end if;

  delete from public.product_reviews where id=p_review_id;
end;
$$;

grant execute on function public.get_public_product_reviews(uuid) to anon, authenticated;
grant execute on function public.can_review_product(uuid) to authenticated;
grant execute on function public.upsert_product_review(uuid,integer,text) to authenticated;
grant execute on function public.delete_product_review(uuid) to authenticated;

commit;
