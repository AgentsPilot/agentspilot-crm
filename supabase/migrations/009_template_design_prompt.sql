-- ── Migration 009: add design_prompt to post_templates ───────────────────────
-- Stores the AI image generation prompt for each template
-- Run once in Supabase Dashboard → SQL Editor

alter table post_templates
  add column if not exists design_prompt text default null;

-- Update existing templates with their AI image generation prompts
update post_templates set design_prompt = 'Dark professional social media post. Bold white headline: "The same operational work. Every single day." Dark charcoal background with subtle grid texture, orange accent line, modern B2B SaaS aesthetic. Clean typography, square 1:1 format. No people, no stock photos — typography and geometry only.'
where title = 'Teaser Post #1';

update post_templates set design_prompt = 'Minimalist dark social media post. Large bold white question: "What''s the recurring work that takes your time every day?" Dark background, subtle orange glow accent on the text, clean B2B tech typography. Lots of negative space. Square 1:1 format.'
where title = 'Teaser Post #2 — Pain Question';

update post_templates set design_prompt = 'Split-panel comparison social media post. Left panel: dark/chaotic red-tinted design labeled "Without automation". Right panel: clean orange-accented design labeled "With AgentsPilot". Bold contrast, professional B2B SaaS style. Square 1:1 format.'
where title = 'Comparison Post (Core)';

update post_templates set design_prompt = 'Clean professional LinkedIn post. Large bold white text: "The same work. Every day. Not complex — just constant." Dark navy background, orange accent underline, modern fintech/SaaS typography, subtle light rays from top. Square 1:1 format.'
where title = 'Value Post — Time & Money';

update post_templates set design_prompt = 'Professional B2B product demo post. Shows a clean UI card for expense tracking with checkmarks. Dark background, orange highlights, small label "AgentsPilot handles it automatically". No manual entry tagline. Modern dashboard aesthetic. Square 1:1 format.'
where title = 'Use Case — Expenses';

update post_templates set design_prompt = 'Bold text-based engagement post. Large provocative white question on dark background: "How many hours a week does your team spend on repetitive work?" Orange underline accent, minimalist design, professional B2B style. Square 1:1 format.'
where title = 'Engagement Post — Question';

update post_templates set design_prompt = 'Dramatic hero announcement post. Dark background with orange-to-gold light burst effect. Bold text: "AgentsPilot" in large white letters, tagline "Operational AI. Built for growing businesses." Premium product reveal aesthetic, cinematic feel. Square 1:1 format.'
where title = 'Reveal Post (Later Stage)';
