-- ============================================================
-- AgentsPilot CRM — DB Migration 002
-- Contacts table redesign
-- Run once in Supabase SQL Editor
-- ============================================================

-- ── 1. Create contacts table ─────────────────────────────────
create table if not exists contacts (
  id               uuid default gen_random_uuid() primary key,
  type             text not null check (type in ('lead', 'trial', 'paid')) default 'lead',

  -- Identity
  full_name        text not null,
  email            text unique,
  phone            text,
  company          text,

  -- Source
  source           text check (source in ('social', 'web', 'manual')) default 'manual',
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  utm_content      text,
  utm_term         text,
  ad_id            text,
  channel          text,

  -- Lead fields
  lead_captured_at timestamptz default now(),

  -- Trial fields
  registered_at    timestamptz,
  trial_started_at timestamptz,
  trial_expires_at timestamptz,
  activated_at     timestamptz,

  -- Paid fields
  converted_at     timestamptz,
  mrr              numeric(10,2) default 0,
  plan             text,
  customer_source  text,

  -- Engagement
  lead_score           integer default 0,
  funnel_level         text,
  last_activity_at     timestamptz,
  last_active_at       timestamptz,
  nps_score            integer,
  churn_reason         text,
  tags                 text[] default '{}',
  notes                text,

  -- At-risk signals
  payment_failed       boolean default false,
  manual_at_risk_flag  boolean default false,

  -- Location
  country  text,
  city     text,
  language text,

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── 2. Migrate existing users data ───────────────────────────
insert into contacts (
  id, full_name, email, phone, company,
  source, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ad_id, channel,
  lead_captured_at,
  registered_at, trial_started_at, trial_expires_at, activated_at,
  converted_at, mrr, plan, customer_source,
  lead_score, funnel_level, last_activity_at, last_active_at,
  nps_score, churn_reason, tags, notes,
  payment_failed, manual_at_risk_flag,
  country, city, language,
  created_at, updated_at,
  type
)
select
  id,
  coalesce(full_name, 'Unknown'),
  email,
  phone,
  campaign_name,
  case
    when utm_source in ('facebook','instagram','linkedin','tiktok') then 'social'
    when utm_source = 'landing_page' then 'web'
    else 'manual'
  end,
  utm_source, utm_medium, utm_campaign, utm_content, utm_term, ad_id, channel,
  created_at,
  case when status in ('trial_inactive','trial_active','trial_expired') then created_at end,
  trial_started_at,
  trial_expires_at,
  activated_at,
  converted_at,
  coalesce(mrr, 0),
  plan,
  customer_source,
  coalesce(lead_score, 0),
  funnel_level,
  last_activity_at,
  last_active_at,
  nps_score,
  churn_reason,
  coalesce(tags, '{}'),
  notes,
  coalesce(payment_failed, false),
  coalesce(manual_at_risk_flag, false),
  country, city, language,
  created_at,
  created_at,
  case
    when status = 'customer' then 'paid'
    when status in ('trial_inactive','trial_active','trial_expired') then 'trial'
    else 'lead'
  end
from users
on conflict (email) do nothing;

-- ── 3. Add contact_id FK to tasks ────────────────────────────
alter table tasks
  add column if not exists contact_id uuid references contacts(id) on delete set null;

update tasks t
set contact_id = c.id
from contacts c
where lower(trim(t.contact_name)) = lower(trim(c.full_name))
  and t.contact_id is null;

-- ── 4. Add contact_id FK to emails ───────────────────────────
alter table emails
  add column if not exists contact_id uuid references contacts(id) on delete set null;

update emails e
set contact_id = c.id
from contacts c
where lower(trim(e.to_email)) = lower(trim(c.email))
  and e.contact_id is null;

-- ── 5. RLS policies for contacts ─────────────────────────────
alter table contacts enable row level security;

create policy "allow_select_contacts"  on contacts for select  using (true);
create policy "allow_insert_contacts"  on contacts for insert  with check (true);
create policy "allow_update_contacts"  on contacts for update  using (true);
create policy "allow_delete_contacts"  on contacts for delete  using (true);

-- ── 6. Auto updated_at trigger ───────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists contacts_updated_at on contacts;
create trigger contacts_updated_at
  before update on contacts
  for each row execute function set_updated_at();

-- ── Verify ───────────────────────────────────────────────────
select type, count(*) from contacts group by type order by type;
