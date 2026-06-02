-- ── Migration 008: add design fields to post_templates ───────────────────────
-- Adds design_url (Canva/Figma link) and design_preview_url (thumbnail image)
-- Run once in Supabase Dashboard → SQL Editor

alter table post_templates
  add column if not exists design_url         text default null,   -- Canva / Figma share link
  add column if not exists design_preview_url text default null;   -- thumbnail image URL

-- ── Create storage bucket for post design assets ──────────────────────────────
-- Run this separately in Supabase Dashboard → Storage → New bucket
-- Bucket name: post-designs
-- Public: true (images need to be publicly accessible for preview)

-- Note: bucket creation via SQL requires the storage extension.
-- If the bucket doesn't auto-create, create it manually in the Dashboard:
--   Storage → New bucket → "post-designs" → Public → Create

insert into storage.buckets (id, name, public)
values ('post-designs', 'post-designs', true)
on conflict (id) do nothing;

-- Allow authenticated and anon users to upload/read
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Public read post-designs'
  ) then
    create policy "Public read post-designs"
      on storage.objects for select
      using (bucket_id = 'post-designs');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Auth upload post-designs'
  ) then
    create policy "Auth upload post-designs"
      on storage.objects for insert
      with check (bucket_id = 'post-designs');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Auth delete post-designs'
  ) then
    create policy "Auth delete post-designs"
      on storage.objects for delete
      using (bucket_id = 'post-designs');
  end if;
end $$;
