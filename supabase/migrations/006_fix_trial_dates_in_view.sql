-- ── Migration 006: fix trial dates in contacts_current view ──────────────────
-- Problem: contacts_current picks the LATEST contact_stages row for all fields.
-- When a trial state transitions (active → expiring → expired), the new row
-- doesn't carry trial_started_at / trial_expires_at forward, so those become null.
--
-- Fix: use a second lateral join to get trial dates from the most recent
-- contact_stages row that actually HAS trial dates set.
-- Run once in Supabase SQL Editor.

drop view if exists contacts_current;
create view contacts_current as
select
  c.contact_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.company,
  c.country,
  c.timezone,
  c.channel,
  c.source,
  c.utm_source,
  c.utm_medium,
  c.utm_campaign,
  c.acquisition_type,
  c.lead_score,
  c.funnel_level,
  c.last_activity_at,
  c.tags,
  c.notes,
  c.payment_failed,
  c.manual_at_risk_flag,
  c.activated_at,
  c.converted_at,
  c.customer_source,
  c.created_at,
  -- Stage / state from latest row
  cs.stage,
  cs.state,
  cs.from_stage,
  cs.from_state,
  cs.plan,
  cs.mrr,
  cs.changed_at,
  -- Trial dates from latest row that actually has them set
  -- (state transitions don't always carry these forward)
  coalesce(cs.trial_started_at, ct.trial_started_at) as trial_started_at,
  coalesce(cs.trial_expires_at, ct.trial_expires_at) as trial_expires_at
from contacts c
left join lateral (
  select *
  from contact_stages
  where contact_id = c.contact_id
  order by changed_at desc
  limit 1
) cs on true
left join lateral (
  select trial_started_at, trial_expires_at
  from contact_stages
  where contact_id = c.contact_id
    and (trial_started_at is not null or trial_expires_at is not null)
  order by changed_at desc
  limit 1
) ct on true;
