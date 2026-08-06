-- NUVEXA HUB V12.2 — Product media bucket and free Storage policies
-- Run once in Supabase SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  6291456,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists nuvexa_product_media_public_read on storage.objects;
drop policy if exists nuvexa_product_media_insert on storage.objects;
drop policy if exists nuvexa_product_media_update on storage.objects;
drop policy if exists nuvexa_product_media_delete on storage.objects;

create policy nuvexa_product_media_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-media');

create policy nuvexa_product_media_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_partner())
  )
);

create policy nuvexa_product_media_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_partner())
  )
)
with check (
  bucket_id = 'product-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_partner())
  )
);

create policy nuvexa_product_media_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_partner())
  )
);
