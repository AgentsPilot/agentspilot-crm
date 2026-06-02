-- ============================================================
-- AgentsPilot CRM — Full Schema (Fresh Install)
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- on a brand-new database.
-- ============================================================

-- ── Helper: auto-update updated_at ───────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. CONTACTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists contacts (
  contact_id           uuid primary key default gen_random_uuid(),
  first_name           text not null,
  last_name            text,
  email                text unique,
  phone                text,
  company              text,

  -- Source / UTM
  source               text check (source in ('social','web','manual','direct')) default 'manual',
  utm_source           text,
  utm_medium           text,
  utm_campaign         text,
  utm_content          text,
  utm_term             text,
  ad_id                text,
  channel              text,
  acquisition_type     text,

  -- Engagement
  lead_score           integer default 0,
  funnel_level         text,
  last_activity_at     timestamptz,
  last_active_at       timestamptz,
  tags                 text[] default '{}',
  notes                text,
  nps_score            integer,
  churn_reason         text,

  -- At-risk signals
  payment_failed       boolean default false,
  manual_at_risk_flag  boolean default false,

  -- Lifecycle timestamps
  activated_at         timestamptz,
  converted_at         timestamptz,
  customer_source      text,

  -- Location
  country              text,
  city                 text,
  language             text,
  timezone             text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table contacts enable row level security;
create policy "allow_select_contacts"  on contacts for select  using (true);
create policy "allow_insert_contacts"  on contacts for insert  with check (true);
create policy "allow_update_contacts"  on contacts for update  using (true);
create policy "allow_delete_contacts"  on contacts for delete  using (true);

drop trigger if exists contacts_updated_at on contacts;
create trigger contacts_updated_at
  before update on contacts
  for each row execute function set_updated_at();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. CONTACT_STAGES  (lifecycle history — one row per transition)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists contact_stages (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid not null references contacts(contact_id) on delete cascade,
  stage            text not null check (stage in ('lead','customer_trial','customer_paid')),
  state            text not null default 'new',
  from_stage       text,
  from_state       text,
  plan             text,
  mrr              numeric(10,2) default 0,
  trial_started_at timestamptz,
  trial_expires_at timestamptz,
  changed_by       text default 'system',
  changed_at       timestamptz not null default now(),
  notes            text
);

alter table contact_stages enable row level security;
create policy "allow_all_contact_stages" on contact_stages for all using (true);

create index if not exists contact_stages_contact_id_idx on contact_stages(contact_id);
create index if not exists contact_stages_changed_at_idx  on contact_stages(changed_at desc);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. TASKS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists tasks (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  contact_id       uuid references contacts(contact_id) on delete set null,
  contact_name     text,
  type             text not null default 'Follow-up'
                   check (type in (
                     'Lead Follow-up','Trial Activation','Trial Conversion',
                     'Win-back','Retention','Re-engage','Follow-up',
                     'Onboarding','Urgent','Other'
                   )),
  priority         text not null default 'Medium'
                   check (priority in ('High','Medium','Low')),
  due_date         date,
  status           text not null default 'open'
                   check (status in ('open','in_progress','done')),
  done             boolean default false,
  alarm_at         timestamptz,
  alarm_triggered  boolean default false,
  kanban_status    text,
  notes            text,
  created_at       timestamptz not null default now()
);

alter table tasks enable row level security;
create policy "allow_all_tasks" on tasks for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. EMAILS  (outbound log)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists emails (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid references contacts(contact_id) on delete set null,
  to_email      text,
  to_name       text,
  subject       text,
  body          text,
  template_name text,
  status        text default 'queued'
                check (status in ('queued','sent','failed','opened')),
  created_at    timestamptz not null default now()
);

alter table emails enable row level security;
create policy "allow_all_emails" on emails for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. AUTOMATION_CONFIG  (key-value settings for cron rules)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists automation_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

insert into automation_config (key, value) values
  ('at_risk_inactivity_days',  '30'),
  ('churn_after_at_risk_days', '30'),
  ('at_risk_signals', '{"inactivity":true,"mrr_zero":true,"payment_failed":true,"manual_flag":true}')
on conflict (key) do nothing;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. AUTOMATION_SETTINGS  (per-rule on/off + last-run metadata)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists automation_settings (
  rule_id        text primary key,
  enabled        boolean default true,
  last_run_at    timestamptz,
  last_run_count integer default 0,
  updated_at     timestamptz default now()
);

insert into automation_settings (rule_id, enabled) values
  ('new_lead_followup',    true),
  ('trial_day3_checkin',   true),
  ('trial_day10_nudge',    true),
  ('trial_expiry_warning', true),
  ('trial_expired_winback',true),
  ('at_risk_detection',    true),
  ('at_risk_winback',      true),
  ('at_risk_churned',      true)
on conflict (rule_id) do nothing;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. AUTOMATION_RUNS  (per-contact trigger log)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists automation_runs (
  id            uuid primary key default gen_random_uuid(),
  rule_id       text not null,
  contact_id    uuid,
  contact_name  text,
  action        text,
  triggered_at  timestamptz default now()
);

alter table automation_runs enable row level security;
create policy "allow_all_automation_runs" on automation_runs for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. CAMPAIGNS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  channel      text,
  status       text not null default 'draft'
               check (status in ('active','paused','draft','ended')),
  budget       numeric(10,2) default 0,
  spent        numeric(10,2) default 0,
  impressions  integer default 0,
  clicks       integer default 0,
  start_date   date,
  end_date     date,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  goal         text,
  notes        text,
  created_at   timestamptz not null default now()
);

alter table campaigns enable row level security;
create policy "allow_all_campaigns" on campaigns for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 9. SOCIAL_POSTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists social_posts (
  id             uuid primary key default gen_random_uuid(),
  collateral     text not null default '',
  platforms      text not null default '',
  background     text not null default '',
  media_type     text not null default '',
  cta            text not null default '',
  caption        text not null default '',
  scheduled_date date,
  status         text not null default 'draft'
                 check (status in ('draft','scheduled','published')),
  campaign_id    uuid references campaigns(id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table social_posts enable row level security;
create policy "allow_all_social_posts" on social_posts for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 10. SOCIAL_CONNECTIONS  (OAuth tokens per platform)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists social_connections (
  id                uuid primary key default gen_random_uuid(),
  platform          text not null,
  platform_user_id  text,
  platform_username text,
  access_token      text,
  refresh_token     text,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(platform, platform_user_id)
);

alter table social_connections enable row level security;
create policy "allow_all_social_connections" on social_connections for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 11. POST_TEMPLATES  (reusable post content templates)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists post_templates (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  platforms    text not null default '',
  media_type   text not null default '',
  background   text not null default '',
  cta          text not null default '',
  caption      text not null default '',
  sort_order   integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table post_templates enable row level security;
create policy "allow_all_post_templates" on post_templates for all using (true);

insert into post_templates (title, platforms, media_type, background, cta, caption, sort_order) values
('Teaser Post #1',
 'LinkedIn, Facebook, Instagram, TikTok', 'Short Video (15–30s)',
 'The same operational work. Every single day. Emails. Follow-ups. Updates. Tracking. ✨ A different way to handle it is coming ✨',
 '👉 Follow to see how recurring work gets handled',
 'The same operational work. Every single day. Emails. Follow-ups. Updates. Tracking. ✨ A different way is coming ✨ 👉 Follow to see how recurring work gets handled', 1),

('Teaser Post #2 — Pain Question',
 'LinkedIn, Facebook, Instagram', 'Short Video',
 'What''s the recurring work that takes your time every day? Emails. Follow-ups. Status checks. ✨ Something new is coming ✨',
 '👉 Vote & follow to see what''s coming',
 'What''s the recurring work that takes your time every day? Emails. Follow-ups. Status checks. ✨ Something new is coming ✨ 👉 Vote & follow', 2),

('Comparison Post (Core)',
 'LinkedIn, Instagram', 'Static / Video split screen',
 'Automation sounds easy — until you have to run it. Other solutions: workflows, rules, maintenance. AgentsPilot: recurring work, fully managed, finished outcomes.',
 '👉 Follow to see the difference',
 E'Automation sounds easy — until you have to run it.\nOther solutions: workflows, rules, maintenance\nAgentsPilot: fully managed, finished outcomes\nAutomation adds responsibility. AgentsPilot removes it.', 3),

('Value Post — Time & Money',
 'LinkedIn', 'Static clean post',
 'Small business managers spend hours on the same operational work every day. Not strategic — just constant. AgentsPilot removes it entirely.',
 '👉 Learn how it works',
 'The same work. Every day. Not complex — just constant.\nAgentsPilot handles it for you. No setup. Just results.', 4),

('Use Case — Expenses',
 'LinkedIn, Instagram', 'Demo / Static',
 'Expense tracking is recurring work. Receipts, invoices, updates — every month. AgentsPilot handles it and delivers the finished result.',
 '👉 See how it works',
 'Expense tracking is recurring work.\nAgentsPilot handles it for you. No manual entry. No management. Just handled.', 5),

('Engagement Post — Question',
 'LinkedIn', 'Text-only or poll',
 'Be honest — what''s the one task you repeat every day? If it shows up every day, it shouldn''t be your job to manage it.',
 '👉 Comment or vote',
 'What''s the one task you repeat every day?\nIt shouldn''t be your job to manage it.', 6),

('Reveal Post (Later Stage)',
 'LinkedIn, Website', 'Video / Hero',
 'Managed Recurring Operations Assistance. We don''t automate tasks. We deliver outcomes.',
 '👉 Request a demo',
 E'Managed Recurring Operations Assistance\nWe don''t automate tasks. We deliver outcomes.', 7);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 12. CONTENT_LIBRARY  (nurture / post content for pipeline)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists content_library (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  body            text not null default '',
  type            text not null default 'post',
  pipeline_stages text[] default '{}',
  created_at      timestamptz not null default now()
);

alter table content_library enable row level security;
create policy "allow_all_content_library" on content_library for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 13. HOOKS_LIBRARY  (ad/post opening hooks)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists hooks_library (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  category    text not null default 'Other',
  platform    text not null default 'Universal',
  usage_count integer default 0,
  avg_score   numeric(3,1) default 0,
  tags        text[] default '{}',
  created_at  timestamptz not null default now()
);

alter table hooks_library enable row level security;
create policy "allow_all_hooks_library" on hooks_library for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 14. PIPELINE_DEALS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists pipeline_deals (
  id            uuid primary key default gen_random_uuid(),
  stage         text not null default 'New Lead',
  value         numeric(10,2) default 0,
  channel       text,
  campaign_name text,
  contact_email text,
  contact_name  text,
  created_at    timestamptz not null default now()
);

alter table pipeline_deals enable row level security;
create policy "allow_all_pipeline_deals" on pipeline_deals for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 15. BUDGET_MONTHS  (monthly ad budget tracking)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists budget_months (
  id         uuid primary key default gen_random_uuid(),
  month      text not null,
  allocated  numeric(10,2) default 0,
  spent      numeric(10,2) default 0,
  revenue    numeric(10,2) default 0,
  roi        numeric(5,2)  default 0,
  sort_order integer not null default 0
);

alter table budget_months enable row level security;
create policy "allow_all_budget_months" on budget_months for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 16. CHANNEL_BUDGETS  (budget split per marketing channel)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists channel_budgets (
  id          uuid primary key default gen_random_uuid(),
  channel     text not null,
  allocated   numeric(10,2) default 0,
  spent       numeric(10,2) default 0,
  pct         numeric(5,2)  default 0,
  conversions integer       default 0,
  cr          numeric(5,2)  default 0,
  cpl         numeric(10,2) default 0,
  color       text default '#6366f1'
);

alter table channel_budgets enable row level security;
create policy "allow_all_channel_budgets" on channel_budgets for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 17. WEEKLY_PERFORMANCE  (cohort / weekly metrics)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists weekly_performance (
  id          uuid primary key default gen_random_uuid(),
  week        text not null,
  leads       integer       default 0,
  conversions integer       default 0,
  cr          numeric(5,2)  default 0,
  cpl         numeric(10,2) default 0,
  cpa         numeric(10,2) default 0,
  spend       numeric(10,2) default 0,
  revenue     numeric(10,2) default 0,
  sort_order  integer not null default 0
);

alter table weekly_performance enable row level security;
create policy "allow_all_weekly_performance" on weekly_performance for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 18. CHECKLIST_ITEMS  (weekly operations checklist)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create table if not exists checklist_items (
  id         uuid primary key default gen_random_uuid(),
  task       text not null,
  category   text not null default 'General',
  priority   text not null default 'Medium',
  due_day    text default '',
  completed  boolean default false,
  sort_order integer not null default 0
);

alter table checklist_items enable row level security;
create policy "allow_all_checklist_items" on checklist_items for all using (true);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 19. CONTACTS_CURRENT  (view — always reflects latest stage)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  -- Stage / state from the most recent contact_stages row
  cs.stage,
  cs.state,
  cs.from_stage,
  cs.from_state,
  cs.plan,
  cs.mrr,
  cs.changed_at,
  -- Trial dates: fall back to the most recent row that actually has them
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


-- ── Verify all tables exist ───────────────────────────────────
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type in ('BASE TABLE','VIEW')
order by table_name;
