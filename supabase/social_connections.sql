-- ── Run this in Supabase SQL editor (one-time setup) ──────────────────────────
-- Creates / fixes the social_connections table

create table if not exists social_connections (
  id                 uuid primary key default gen_random_uuid(),
  platform           text not null,
  access_token       text not null,
  refresh_token      text,
  expires_at         timestamptz,
  platform_user_id   text,          -- LinkedIn: urn:li:person:XXX  |  Instagram: IG business account ID
  platform_username  text,
  page_id            text,          -- Facebook: page ID  |  Instagram: same IG business account ID
  page_access_token  text,          -- Facebook: page-level token (different from user token)
  updated_at         timestamptz default now()
);

-- Ensure platform is unique so upsert works
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'social_connections'::regclass
      and contype = 'u'
      and conname = 'social_connections_platform_key'
  ) then
    alter table social_connections add constraint social_connections_platform_key unique (platform);
  end if;
end $$;
