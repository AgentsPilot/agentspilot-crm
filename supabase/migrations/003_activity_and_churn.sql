-- ============================================================
-- AgentsPilot CRM — DB Migration 003
-- Activity tracking + churn automation
-- Run once in Supabase SQL Editor
-- ============================================================

-- ── 1. Fix tasks FK — was referencing contacts(id) but PK is contacts(contact_id)
alter table tasks drop constraint if exists tasks_contact_id_fkey;
alter table tasks
  add constraint tasks_contact_id_fkey
  foreign key (contact_id) references contacts(contact_id) on delete set null;

-- Fix emails FK the same way
alter table emails drop constraint if exists emails_contact_id_fkey;
alter table emails
  add constraint emails_contact_id_fkey
  foreign key (contact_id) references contacts(contact_id) on delete set null;

-- ── 2. Ensure activity columns exist on contacts ─────────────
alter table contacts
  add column if not exists last_activity_at    timestamptz,
  add column if not exists payment_failed      boolean default false,
  add column if not exists manual_at_risk_flag boolean default false;

-- ── 2. Add churn config key ──────────────────────────────────
insert into automation_config (key, value) values
  ('churn_after_at_risk_days', '30')
on conflict (key) do nothing;

-- Update at_risk_signals to include all 4 signals
insert into automation_config (key, value) values
  ('at_risk_signals', '{"inactivity":true,"mrr_zero":true,"payment_failed":true,"manual_flag":true}')
on conflict (key) do update set value = excluded.value;

-- ── 3. Register new automation rules ─────────────────────────
insert into automation_settings (rule_id, enabled) values
  ('at_risk_churned', true)
on conflict (rule_id) do nothing;

-- ── 4. Recreate contacts_current view ────────────────────────
-- Includes activity fields from contacts table so cron can use them
drop view if exists contacts_current;

create view contacts_current as
select
  c.contact_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.company,
  c.source,
  c.utm_source,
  c.utm_medium,
  c.utm_campaign,
  c.channel,
  c.country,
  c.timezone,
  c.last_activity_at,
  c.payment_failed,
  c.manual_at_risk_flag,
  c.created_at,
  cs.id          as stage_id,
  cs.stage,
  cs.state,
  cs.from_stage,
  cs.from_state,
  cs.trial_started_at,
  cs.trial_expires_at,
  cs.mrr,
  cs.plan,
  cs.changed_by,
  cs.changed_at,
  cs.notes
from contacts c
left join lateral (
  select *
  from contact_stages
  where contact_id = c.contact_id
  order by changed_at desc
  limit 1
) cs on true;

-- ── Verify ───────────────────────────────────────────────────
select stage, state, count(*)
from contacts_current
group by stage, state
order by stage, state;
