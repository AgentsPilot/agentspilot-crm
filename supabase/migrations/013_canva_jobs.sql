-- ── Migration 013: canva_jobs queue ──────────────────────────────────────────
-- Stores pending Canva finalization requests
-- Claude processes these when asked "process pending jobs"

create table if not exists canva_jobs (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid references post_templates(id) on delete cascade,
  title       text not null,
  status      text not null default 'pending', -- pending | done | failed
  created_at  timestamptz default now(),
  completed_at timestamptz
);

-- Allow anon/auth to insert and read
create policy if not exists "Public canva_jobs access"
  on canva_jobs for all
  using (true)
  with check (true);

alter table canva_jobs enable row level security;
