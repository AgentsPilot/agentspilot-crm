-- ── Run this once in Supabase SQL editor to create + seed all analytics tables ──

-- 1. Weekly Performance (Cohort + Analytics)
create table if not exists weekly_performance (
  id uuid primary key default gen_random_uuid(),
  week text not null,
  sort_order integer not null default 0,
  leads integer not null default 0,
  conversions integer not null default 0,
  cr decimal(5,2) not null default 0,
  cpl decimal(10,2) not null default 0,
  cpa decimal(10,2) not null default 0,
  spend decimal(12,2) not null default 0,
  revenue decimal(12,2) not null default 0
);
insert into weekly_performance (week, sort_order, leads, conversions, cr, cpl, cpa, spend, revenue) values
  ('W1',  1,  210, 14, 6.7, 48,  720, 10080,  42000),
  ('W2',  2,  245, 18, 7.3, 45,  613, 11025,  54000),
  ('W3',  3,  198, 12, 6.1, 52,  858, 10296,  36000),
  ('W4',  4,  280, 23, 8.2, 41,  502, 11480,  69000),
  ('W5',  5,  262, 20, 7.6, 44,  572, 11528,  60000),
  ('W6',  6,  315, 27, 8.6, 39,  453, 12285,  81000),
  ('W7',  7,  290, 24, 8.3, 42,  508, 12180,  72000),
  ('W8',  8,  340, 31, 9.1, 37,  420, 12580,  93000),
  ('W9',  9,  305, 26, 8.5, 40,  467, 12200,  78000),
  ('W10',10,  378, 35, 9.3, 35,  379, 13230, 105000),
  ('W11',11,  352, 32, 9.1, 36,  396, 12672,  96000),
  ('W12',12,  410, 40, 9.8, 33,  338, 13530, 120000)
on conflict do nothing;

-- 2. Channel Performance (Analytics)
create table if not exists channel_performance (
  id uuid primary key default gen_random_uuid(),
  channel text not null unique,
  leads integer not null default 0,
  conversions integer not null default 0,
  cr decimal(5,2) not null default 0,
  cpl decimal(10,2) not null default 0,
  spend decimal(12,2) not null default 0,
  revenue decimal(12,2) not null default 0,
  color text default '#6366F1'
);
insert into channel_performance (channel, leads, conversions, cr, cpl, spend, revenue, color) values
  ('Meta',    1250, 98, 7.8,  42, 52500,  294000, '#4F46E5'),
  ('Google',   680, 71, 10.4, 68, 46240,  213000, '#0EA5E9'),
  ('TikTok',   890, 54, 6.1,  31, 27590,  162000, '#EC4899'),
  ('Organic',  420, 52, 12.4,  0,     0,  156000, '#10B981'),
  ('Email',    145, 47, 32.4,  5,   725,  141000, '#F59E0B')
on conflict (channel) do nothing;

-- 3. Budget Months (Budget page)
create table if not exists budget_months (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  sort_order integer not null default 0,
  allocated decimal(12,2) not null default 0,
  spent decimal(12,2) not null default 0,
  revenue decimal(12,2) not null default 0,
  roi decimal(8,2) not null default 0
);
insert into budget_months (month, sort_order, allocated, spent, revenue, roi) values
  ('Jan', 1, 48000, 44200, 198000, 348),
  ('Feb', 2, 50000, 47800, 215000, 350),
  ('Mar', 3, 55000, 51200, 241000, 371),
  ('Apr', 4, 58000, 55600, 268000, 382),
  ('May', 5, 62000, 59800, 305000, 410),
  ('Jun', 6, 65000, 61500, 330000, 437)
on conflict do nothing;

-- 4. Channel Budgets (Budget page)
create table if not exists channel_budgets (
  id uuid primary key default gen_random_uuid(),
  channel text not null unique,
  allocated decimal(12,2) not null default 0,
  spent decimal(12,2) not null default 0,
  pct decimal(5,1) not null default 0
);
insert into channel_budgets (channel, allocated, spent, pct) values
  ('Meta',         24000, 22800, 37),
  ('Google',       18000, 17200, 28),
  ('TikTok',       12000, 11500, 19),
  ('Email',         4000,  3800,  6),
  ('Organic / SEO', 7000,  6200, 10)
on conflict (channel) do nothing;

-- 5. Checklist Items (Weekly Checklist)
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  task text not null,
  category text not null,
  priority text not null,
  due_day text not null,
  completed boolean not null default false,
  sort_order integer default 0
);
insert into checklist_items (task, category, priority, due_day, completed, sort_order) values
  ('Review last week''s ad performance and pause underperformers', 'Ads',       'High',   'Monday',    true,  1),
  ('Publish 2× Meta posts (carousel + video)',                     'Content',   'High',   'Monday',    true,  2),
  ('Send weekly email newsletter to full list',                    'Email',     'High',   'Tuesday',   true,  3),
  ('Update CPL/CPA tracking sheet with latest data',              'Analytics', 'High',   'Tuesday',   false, 4),
  ('Post 1× TikTok (trending hook format)',                       'Content',   'Medium', 'Wednesday', false, 5),
  ('A/B test new ad creative — launch 3 variants',                'Ads',       'High',   'Wednesday', false, 6),
  ('Review funnel drop-off points in analytics dashboard',        'Analytics', 'Medium', 'Thursday',  false, 7),
  ('Draft next week''s post calendar and get approval',           'Strategy',  'Medium', 'Thursday',  false, 8),
  ('Respond to all DMs and comments across platforms',            'Content',   'Low',    'Friday',    false, 9),
  ('Weekly strategy meeting — review KPIs vs targets',            'Strategy',  'High',   'Friday',    false, 10),
  ('Pull budget utilisation report for client',                   'Analytics', 'High',   'Friday',    false, 11),
  ('Repurpose top-performing post into 2 additional formats',     'Content',   'Low',    'Friday',    false, 12)
on conflict do nothing;

-- 6. Hooks Library
create table if not exists hooks_library (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text not null,
  platform text not null,
  usage_count integer default 0,
  avg_score decimal(5,2) default 0,
  tags text[] default '{}'
);
insert into hooks_library (text, category, platform, usage_count, avg_score, tags) values
  ('Most marketers make this mistake — and it''s costing them leads every day.',           'Fear',         'Meta',      8,  91, ARRAY['leads','mistake','marketing']),
  ('Stop scrolling — this 60-second trick changed how we run all our ads.',                'Curiosity',    'TikTok',   12,  95, ARRAY['trick','ads','quick-tip']),
  ('We helped 47 clients go from $0 to 6 figures. Here''s the playbook.',                 'Social Proof', 'LinkedIn',  5,  88, ARRAY['results','clients','playbook']),
  ('Your free [resource] is waiting inside — but only for the next 48 hours.',             'Urgency',      'Email',    15,  93, ARRAY['freebie','urgency','deadline']),
  ('I was losing $3,000/month on ads until I found this one thing.',                       'Story',        'Meta',      7,  89, ARRAY['story','ads','money']),
  ('Here''s what nobody tells you about scaling paid traffic past $10K/month.',            'Curiosity',    'Universal',10,  87, ARRAY['scaling','paid-traffic','advanced']),
  ('The conversion rate doubled when we changed just 3 words in the headline.',            'Benefit',      'Meta',      6,  84, ARRAY['conversion','copywriting','headline']),
  ('Warning: your competitors are already using this strategy. Are you?',                  'Fear',         'LinkedIn',  9,  86, ARRAY['competition','strategy','fomo']),
  ('I sent 500 cold DMs in 7 days. Here''s exactly what happened.',                       'Story',        'TikTok',   14,  96, ARRAY['dm','outreach','experiment']),
  ('Real talk — here are the actual numbers from our May campaign.',                       'Social Proof', 'Universal', 4,  82, ARRAY['transparency','results','numbers']),
  ('Grab your [template/checklist] — it''s free and takes 30 seconds to download.',       'Benefit',      'Email',    18,  90, ARRAY['lead-magnet','freebie','quick']),
  ('Don''t buy another course until you read this.',                                       'Curiosity',    'Meta',     11,  88, ARRAY['course','buying','warning']),
  ('The 3-step formula we use to write every winning ad — swipe it for free.',             'Benefit',      'Universal',16,  94, ARRAY['formula','ads','copywriting']),
  ('Last chance — [offer] expires at midnight tonight.',                                   'Urgency',      'Email',    20,  92, ARRAY['deadline','offer','last-chance']),
  ('If you''re still doing [old method], you''re already behind.',                         'Fear',         'Universal', 8,  85, ARRAY['old-way','fomo','competition'])
on conflict do nothing;

-- 7. Posts Library (performance-tracked posts, separate from social_posts campaign drafts)
create table if not exists posts_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  platform text not null,
  type text not null,
  status text not null default 'draft',
  post_date date,
  week_num integer default 0,
  reach bigint default 0,
  engagement decimal(5,2) default 0,
  clicks bigint default 0,
  leads_count integer default 0,
  score integer default 0,
  hook text default '',
  created_at timestamptz default now()
);
insert into posts_library (title, content, platform, type, status, post_date, week_num, reach, engagement, clicks, leads_count, score, hook) values
  ('5 Mistakes Killing Your Leads',        'Most marketers make these 5 critical errors that silently kill their lead flow...', 'Meta',      'carousel', 'published', '2026-05-01',  9, 42000, 3.8, 1596, 48, 92, 'Most marketers make this mistake...'),
  ('The 10x Framework Revealed',           'This simple 3-step framework helped us 10x our conversion rate in 90 days...',     'TikTok',    'video',    'published', '2026-05-03',  9, 87000, 6.2, 5394, 62, 95, 'Stop scrolling — this changed everything'),
  ('Client Case Study: $0 to $50K MRR',   'How our client went from struggling to scale to $50K MRR in 6 months...',          'LinkedIn',  'image',    'published', '2026-05-05',  9, 18000, 4.5,  810, 29, 84, 'Real results. Real numbers.'),
  ('Free Lead Gen Template',               'Download our proven lead gen template — used to generate 10,000+ leads...',        'Email',     'email',    'published', '2026-05-06',  9, 12500,28.4, 3550, 87, 97, 'Grab your free template inside'),
  ('Why Your Ads Are Losing Money',        'The #1 reason most ad campaigns fail is something nobody talks about...',           'Meta',      'video',    'published', '2026-05-08', 10, 63000, 5.1, 3213, 71, 91, 'Your ads are leaking money right now'),
  ('Instagram Reel: Behind the Scenes',   'A day in the life of our team as we build a campaign from scratch...',              'Instagram', 'story',    'published', '2026-05-09', 10, 31000, 7.3, 2263, 33, 78, 'We never show this...'),
  ('The Secret to High-Converting Copy',  'After writing 10,000+ ads, we found the pattern that converts every time...',       'Meta',      'carousel', 'scheduled', '2026-05-19', 11,     0, 0.0,    0,  0,  0, 'The pattern behind every winning ad'),
  ('Q2 Webinar: Scaling to 7 Figures',    'Join us live as we break down the exact playbook for scaling to 7 figures...',      'Email',     'email',    'scheduled', '2026-05-20', 11,     0, 0.0,    0,  0,  0, 'You''re invited — limited spots'),
  ('TikTok: Cold Outreach That Works',    'We sent 500 cold DMs. Here''s what happened — breakdown with templates...',         'TikTok',    'video',    'draft',     '2026-05-22', 11,     0, 0.0,    0,  0,  0, 'I sent 500 DMs in 7 days...'),
  ('Monthly Performance Report',          'May performance breakdown — leads, conversions, what worked and what didn''t...',    'LinkedIn',  'image',    'draft',     '2026-05-28', 12,     0, 0.0,    0,  0,  0, 'Our honest May results')
on conflict do nothing;
