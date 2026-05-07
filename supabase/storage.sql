-- Storage bucket for tailored CV PDFs.
-- Run this in the Supabase SQL Editor after schema.sql.
--
-- Path convention: cv-pdfs/<user_id>/<cv_id>.pdf
-- The first folder segment is the auth.uid(), which lets us write
-- short RLS policies that pin reads/writes to the owning user.

insert into storage.buckets (id, name, public)
values ('cv-pdfs', 'cv-pdfs', false)
on conflict (id) do nothing;

-- Owners can read their own PDFs.
drop policy if exists "Users can read own CV PDFs" on storage.objects;
create policy "Users can read own CV PDFs" on storage.objects
  for select
  using (
    bucket_id = 'cv-pdfs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owners can upload to their own folder.
drop policy if exists "Users can upload own CV PDFs" on storage.objects;
create policy "Users can upload own CV PDFs" on storage.objects
  for insert
  with check (
    bucket_id = 'cv-pdfs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owners can overwrite their own PDFs (re-tailor).
drop policy if exists "Users can update own CV PDFs" on storage.objects;
create policy "Users can update own CV PDFs" on storage.objects
  for update
  using (
    bucket_id = 'cv-pdfs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owners can delete their own PDFs.
drop policy if exists "Users can delete own CV PDFs" on storage.objects;
create policy "Users can delete own CV PDFs" on storage.objects
  for delete
  using (
    bucket_id = 'cv-pdfs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Note: the service role bypasses these policies. Server-side code that
-- uploads PDFs uses getServiceClient() and so isn't affected by RLS — but
-- by convention always writes under the correct user folder.
