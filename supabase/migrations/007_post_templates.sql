-- ── Post Templates table ────────────────────────────────────────────────────
-- Replaces the hardcoded TEMPLATES array in social/page.tsx.
-- Each row is a reusable post template the manager can pick when creating a post.

create table if not exists post_templates (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,                      -- e.g. "Teaser Post #1"
  platforms    text not null default '',           -- comma-separated: "LinkedIn, Facebook"
  media_type   text not null default '',           -- e.g. "Short Video (15–30s)"
  background   text not null default '',           -- messaging / context brief
  cta          text not null default '',           -- call to action text
  caption      text not null default '',           -- final post caption
  sort_order   integer not null default 0,         -- display order
  active       boolean not null default true,      -- soft-delete / hide
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- RLS: only authenticated users (admin CRM)
alter table post_templates enable row level security;
create policy "Authenticated users can manage post_templates"
  on post_templates for all
  using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- ── Seed: migrate the 7 existing hardcoded templates ──────────────────────────

insert into post_templates (title, platforms, media_type, background, cta, caption, sort_order) values

('Teaser Post #1',
 'LinkedIn, Facebook, Instagram, TikTok',
 'Short Video (15–30s)',
 'The same operational work. Every single day. Emails. Follow-ups. Updates. Tracking. ✨ A different way to handle it is coming ✨',
 '👉 Follow to see how recurring work gets handled',
 'The same operational work. Every single day. Emails. Follow-ups. Updates. Tracking. ✨ A different way is coming ✨ 👉 Follow to see how recurring work gets handled',
 1),

('Teaser Post #2 — Pain Question',
 'LinkedIn, Facebook, Instagram',
 'Short Video',
 'What''s the recurring work that takes your time every day? Emails. Follow-ups. Status checks. ✨ Something new is coming ✨',
 '👉 Vote & follow to see what''s coming',
 'What''s the recurring work that takes your time every day? Emails. Follow-ups. Status checks. ✨ Something new is coming ✨ 👉 Vote & follow',
 2),

('Comparison Post (Core)',
 'LinkedIn, Instagram',
 'Static / Video split screen',
 'Automation sounds easy — until you have to run it. Other solutions: workflows, rules, maintenance. AgentsPilot: recurring work, fully managed, finished outcomes.',
 '👉 Follow to see the difference',
 E'Automation sounds easy — until you have to run it.\nOther solutions: workflows, rules, maintenance\nAgentsPilot: fully managed, finished outcomes\nAutomation adds responsibility. AgentsPilot removes it.',
 3),

('Value Post — Time & Money',
 'LinkedIn',
 'Static clean post',
 'Small business managers spend hours on the same operational work every day. Not strategic — just constant. AgentsPilot removes it entirely.',
 '👉 Learn how it works',
 'The same work. Every day. Not complex — just constant.\nAgentsPilot handles it for you. No setup. Just results.',
 4),

('Use Case — Expenses',
 'LinkedIn, Instagram',
 'Demo / Static',
 'Expense tracking is recurring work. Receipts, invoices, updates — every month. AgentsPilot handles it and delivers the finished result.',
 '👉 See how it works',
 'Expense tracking is recurring work.\nAgentsPilot handles it for you. No manual entry. No management. Just handled.',
 5),

('Engagement Post — Question',
 'LinkedIn',
 'Text-only or poll',
 'Be honest — what''s the one task you repeat every day? If it shows up every day, it shouldn''t be your job to manage it.',
 '👉 Comment or vote',
 'What''s the one task you repeat every day?\nIt shouldn''t be your job to manage it.',
 6),

('Reveal Post (Later Stage)',
 'LinkedIn, Website',
 'Video / Hero',
 'Managed Recurring Operations Assistance. We don''t automate tasks. We deliver outcomes.',
 '👉 Request a demo',
 E'Managed Recurring Operations Assistance\nWe don''t automate tasks. We deliver outcomes.',
 7);
