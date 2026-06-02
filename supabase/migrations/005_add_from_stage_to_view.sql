-- ── Migration 005: add from_stage / from_state to contacts_current ──────────
-- Run once in Supabase SQL Editor

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
  cs.stage,
  cs.state,
  cs.from_stage,
  cs.from_state,
  cs.plan,
  cs.mrr,
  cs.trial_started_at,
  cs.trial_expires_at,
  cs.changed_at
from contacts c
left join lateral (
  select *
  from contact_stages
  where contact_id = c.contact_id
  order by changed_at desc
  limit 1
) cs on true;
