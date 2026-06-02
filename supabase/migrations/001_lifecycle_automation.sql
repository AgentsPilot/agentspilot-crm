-- ─────────────────────────────────────────────────────────────────────────────
-- Lifecycle Automation — run once in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. automation_config  (key-value store for cron settings)
-- ─────────────────────────────────────────────────────────
create table if not exists automation_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

-- Seed defaults
insert into automation_config (key, value) values
  ('at_risk_inactivity_days', '30'),
  ('at_risk_signals', '{"inactivity":true,"mrr_zero":true,"payment_failed":true,"manual_flag":true}')
on conflict (key) do nothing;


-- 2. automation_settings  (per-rule on/off + last-run metadata)
-- ──────────────────────────────────────────────────────────────
create table if not exists automation_settings (
  rule_id        text primary key,
  enabled        boolean default true,
  last_run_at    timestamptz,
  last_run_count integer default 0,
  updated_at     timestamptz default now()
);


-- 3. automation_runs  (log every contact triggered per rule)
-- ───────────────────────────────────────────────────────────
create table if not exists automation_runs (
  id            uuid default gen_random_uuid() primary key,
  rule_id       text not null,
  contact_id    uuid,
  contact_name  text,
  action        text,
  triggered_at  timestamptz default now()
);


-- 4. users table — add at-risk detection columns
-- ─────────────────────────────────────────────
alter table users
  add column if not exists last_activity_at    timestamptz,
  add column if not exists payment_failed      boolean default false,
  add column if not exists manual_at_risk_flag boolean default false;
