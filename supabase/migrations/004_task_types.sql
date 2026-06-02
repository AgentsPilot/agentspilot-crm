-- ============================================================
-- AgentsPilot CRM — DB Migration 004
-- Update task type + status check constraints for SaaS model
-- Run once in Supabase SQL Editor
-- ============================================================

-- ── 1. Drop old type constraint ──────────────────────────────
alter table tasks drop constraint if exists tasks_type_check;

-- ── 2. Add new type constraint with SaaS task types ──────────
alter table tasks
  add constraint tasks_type_check
  check (type in (
    'Lead Follow-up',
    'Trial Activation',
    'Trial Conversion',
    'Win-back',
    'Retention',
    'Re-engage',
    'Follow-up',
    'Onboarding',
    'Win-back',
    'Urgent',
    'Other'
  ));

-- ── 3. Drop old status/kanban constraints ─────────────────────
alter table tasks drop constraint if exists tasks_kanban_status_check;
alter table tasks drop constraint if exists tasks_status_check;

-- ── 4. Add status column if not exists ───────────────────────
alter table tasks
  add column if not exists status text not null default 'open';

-- ── 5. Add new status constraint ─────────────────────────────
alter table tasks
  add constraint tasks_status_check
  check (status in ('open', 'in_progress', 'done'));

-- ── Verify ───────────────────────────────────────────────────
select type, status, count(*)
from tasks
group by type, status
order by type;
