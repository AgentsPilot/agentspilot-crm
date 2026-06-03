-- ── Migration 010: add logo_url to post_templates ────────────────────────────
alter table post_templates
  add column if not exists logo_url text default null;
