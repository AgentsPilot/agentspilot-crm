-- ============================================================
-- AgentsPilot CRM — DB Migration 004
-- Tasks: add status column, migrate legacy done/kanban_status
-- Run once in Supabase SQL Editor
-- ============================================================

-- ── 1. Add status column ──────────────────────────────────────
alter table tasks
  add column if not exists status text not null default 'open'
  check (status in ('open', 'in_progress', 'done'));

-- ── 2. Migrate legacy data ───────────────────────────────────
-- If existing rows have done=true, mark them done
update tasks
  set status = 'done'
  where done = true and status = 'open';

-- If kanban_status = 'inprogress', mark them in_progress
update tasks
  set status = 'in_progress'
  where kanban_status = 'inprogress' and status = 'open';

-- ── 3. (Optional) drop legacy columns once migrated ──────────
-- Uncomment after verifying all tasks have correct status:
-- alter table tasks drop column if exists done;
-- alter table tasks drop column if exists kanban_status;

-- ── Verify ───────────────────────────────────────────────────
select status, count(*) from tasks group by status order by status;
