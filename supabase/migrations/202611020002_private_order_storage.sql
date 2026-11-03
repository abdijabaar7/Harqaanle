-- Private Storage access for order images.
-- Create the private bucket "order-files" from the Supabase dashboard/API
-- before applying this migration. MIME types below are provisional; set the
-- matching bucket allow-list. Maximum file size remains an open decision.

create policy "order_files_insert_authorized"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'order-files'
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.order_files f
    where f.object_path = name
      and f.upload_state in ('pending', 'uploaded')
      and f.business_id::text = (storage.foldername(name))[1]
      and f.order_id::text = (storage.foldername(name))[2]
      and f.mime_type = storage.objects.metadata->>'mimetype'
      and storage.objects.metadata->>'mimetype' = any(array['image/jpeg','image/png','image/webp','image/heic'])
      and public.has_business_role(f.business_id, array['business_admin']::public.business_role[])
  )
);

create policy "order_files_read_authorized"
on storage.objects for select to authenticated
using (
  bucket_id = 'order-files'
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.order_files f
    where f.object_path = name
      and f.upload_state = 'uploaded'
      and f.business_id::text = (storage.foldername(name))[1]
      and f.order_id::text = (storage.foldername(name))[2]
      and (
        public.has_business_role(f.business_id, array['business_admin']::public.business_role[])
        or public.is_assigned_staff(f.business_id, f.order_id)
      )
  )
);

-- No UPDATE/DELETE policy: clients must upload a new opaque object and use
-- controlled metadata changes. Super Admin gets no tenant file access.
