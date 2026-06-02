-- ============================================================
-- AgentsPilot CRM — Full Data Reset
-- Deletes ALL contacts and related records.
-- Config/settings/campaigns are preserved.
-- Run in Supabase SQL Editor.
-- ============================================================

-- Order matters — FK children first, then parent contacts

delete from automation_runs;
delete from campaign_events;
delete from campaign_enrollments;
delete from contact_stages;
delete from tasks;
delete from emails;
delete from contacts;

-- ── Verify everything is empty ───────────────────────────────
select 'contacts'          as tbl, count(*) from contacts
union all
select 'contact_stages',          count(*) from contact_stages
union all
select 'tasks',                   count(*) from tasks
union all
select 'emails',                  count(*) from emails
union all
select 'automation_runs',         count(*) from automation_runs
union all
select 'campaign_enrollments',    count(*) from campaign_enrollments
union all
select 'campaign_events',         count(*) from campaign_events;

-- ── Config/rules/campaigns are untouched ────────────────────
-- automation_settings: kept
-- automation_config:   kept
-- campaigns:           kept
-- campaign_steps:      kept
-- email_templates:     kept
