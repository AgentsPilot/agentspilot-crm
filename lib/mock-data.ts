// ─── Weekly Performance (12 weeks) ───────────────────────────────────────────
export const weeklyPerformance = [
  { week: 'W1', leads: 210, conversions: 14, cr: 6.7, cpl: 48, cpa: 720, spend: 10080, revenue: 42000 },
  { week: 'W2', leads: 245, conversions: 18, cr: 7.3, cpl: 45, cpa: 613, spend: 11025, revenue: 54000 },
  { week: 'W3', leads: 198, conversions: 12, cr: 6.1, cpl: 52, cpa: 858, spend: 10296, revenue: 36000 },
  { week: 'W4', leads: 280, conversions: 23, cr: 8.2, cpl: 41, cpa: 502, spend: 11480, revenue: 69000 },
  { week: 'W5', leads: 262, conversions: 20, cr: 7.6, cpl: 44, cpa: 572, spend: 11528, revenue: 60000 },
  { week: 'W6', leads: 315, conversions: 27, cr: 8.6, cpl: 39, cpa: 453, spend: 12285, revenue: 81000 },
  { week: 'W7', leads: 290, conversions: 24, cr: 8.3, cpl: 42, cpa: 508, spend: 12180, revenue: 72000 },
  { week: 'W8', leads: 340, conversions: 31, cr: 9.1, cpl: 37, cpa: 420, spend: 12580, revenue: 93000 },
  { week: 'W9', leads: 305, conversions: 26, cr: 8.5, cpl: 40, cpa: 467, spend: 12200, revenue: 78000 },
  { week: 'W10', leads: 378, conversions: 35, cr: 9.3, cpl: 35, cpa: 379, spend: 13230, revenue: 105000 },
  { week: 'W11', leads: 352, conversions: 32, cr: 9.1, cpl: 36, cpa: 396, spend: 12672, revenue: 96000 },
  { week: 'W12', leads: 410, conversions: 40, cr: 9.8, cpl: 33, cpa: 338, spend: 13530, revenue: 120000 },
]

// ─── Channel Performance ──────────────────────────────────────────────────────
export const channelPerformance = [
  { channel: 'Meta', leads: 1250, conversions: 98, cr: 7.8, cpl: 42, spend: 52500, revenue: 294000, color: '#4F46E5' },
  { channel: 'Google', leads: 680, conversions: 71, cr: 10.4, cpl: 68, spend: 46240, revenue: 213000, color: '#0EA5E9' },
  { channel: 'TikTok', leads: 890, conversions: 54, cr: 6.1, cpl: 31, spend: 27590, revenue: 162000, color: '#EC4899' },
  { channel: 'Organic', leads: 420, conversions: 52, cr: 12.4, cpl: 0, spend: 0, revenue: 156000, color: '#10B981' },
  { channel: 'Email', leads: 145, conversions: 47, cr: 32.4, cpl: 5, spend: 725, revenue: 141000, color: '#F59E0B' },
]

// ─── Funnel / Status by Level ─────────────────────────────────────────────────
export const funnelData = [
  { level: 'Awareness', count: 48500, pct: 100, color: '#6366F1' },
  { level: 'Interest', count: 12300, pct: 25.4, color: '#8B5CF6' },
  { level: 'Consideration', count: 5800, pct: 12.0, color: '#A78BFA' },
  { level: 'Intent', count: 3385, pct: 7.0, color: '#C4B5FD' },
  { level: 'Conversion', count: 322, pct: 0.66, color: '#DDD6FE' },
]

// ─── Budget (6 months) ────────────────────────────────────────────────────────
export const budgetData = [
  { month: 'Jan', allocated: 48000, spent: 44200, revenue: 198000, roi: 348 },
  { month: 'Feb', allocated: 50000, spent: 47800, revenue: 215000, roi: 350 },
  { month: 'Mar', allocated: 55000, spent: 51200, revenue: 241000, roi: 371 },
  { month: 'Apr', allocated: 58000, spent: 55600, revenue: 268000, roi: 382 },
  { month: 'May', allocated: 62000, spent: 59800, revenue: 305000, roi: 410 },
  { month: 'Jun', allocated: 65000, spent: 61500, revenue: 330000, roi: 437 },
]

export const channelBudget = [
  { channel: 'Meta', allocated: 24000, spent: 22800, pct: 37 },
  { channel: 'Google', allocated: 18000, spent: 17200, pct: 28 },
  { channel: 'TikTok', allocated: 12000, spent: 11500, pct: 19 },
  { channel: 'Email', allocated: 4000, spent: 3800, pct: 6 },
  { channel: 'Organic / SEO', allocated: 7000, spent: 6200, pct: 10 },
]

// ─── Users ────────────────────────────────────────────────────────────────────
export type User = {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive' | 'lead' | 'converted'
  level: 'Awareness' | 'Interest' | 'Consideration' | 'Intent' | 'Converted'
  channel: 'Meta' | 'Google' | 'TikTok' | 'Organic' | 'Email'
  joined: string
  lastActive: string
  leads: number
  conversions: number
  spend: number
  country: string
}

export const users: User[] = [
  { id: '001', name: 'Ava Thompson', email: 'ava@example.com', status: 'active', level: 'Converted', channel: 'Meta', joined: '2025-01-12', lastActive: '2026-05-15', leads: 3, conversions: 2, spend: 2400, country: 'US' },
  { id: '002', name: 'Liam Reyes', email: 'liam@example.com', status: 'lead', level: 'Interest', channel: 'Google', joined: '2025-03-08', lastActive: '2026-05-10', leads: 1, conversions: 0, spend: 0, country: 'CA' },
  { id: '003', name: 'Sophie Müller', email: 'sophie@example.com', status: 'active', level: 'Consideration', channel: 'TikTok', joined: '2025-04-20', lastActive: '2026-05-14', leads: 2, conversions: 0, spend: 0, country: 'DE' },
  { id: '004', name: 'Noah Park', email: 'noah@example.com', status: 'converted', level: 'Converted', channel: 'Organic', joined: '2025-02-01', lastActive: '2026-05-16', leads: 5, conversions: 3, spend: 3600, country: 'KR' },
  { id: '005', name: 'Emma White', email: 'emma@example.com', status: 'active', level: 'Intent', channel: 'Email', joined: '2025-05-10', lastActive: '2026-05-12', leads: 2, conversions: 1, spend: 1200, country: 'GB' },
  { id: '006', name: 'James Chen', email: 'james@example.com', status: 'inactive', level: 'Awareness', channel: 'Meta', joined: '2025-06-14', lastActive: '2026-04-02', leads: 0, conversions: 0, spend: 0, country: 'US' },
  { id: '007', name: 'Olivia Brown', email: 'olivia@example.com', status: 'lead', level: 'Interest', channel: 'Google', joined: '2025-07-22', lastActive: '2026-05-11', leads: 1, conversions: 0, spend: 0, country: 'AU' },
  { id: '008', name: 'William Davis', email: 'william@example.com', status: 'converted', level: 'Converted', channel: 'Meta', joined: '2025-02-28', lastActive: '2026-05-16', leads: 4, conversions: 4, spend: 4800, country: 'US' },
  { id: '009', name: 'Mia Garcia', email: 'mia@example.com', status: 'active', level: 'Consideration', channel: 'TikTok', joined: '2025-08-05', lastActive: '2026-05-13', leads: 2, conversions: 0, spend: 0, country: 'MX' },
  { id: '010', name: 'Ethan Wilson', email: 'ethan@example.com', status: 'active', level: 'Intent', channel: 'Organic', joined: '2025-03-17', lastActive: '2026-05-15', leads: 3, conversions: 1, spend: 1200, country: 'US' },
  { id: '011', name: 'Isabella Lee', email: 'isabella@example.com', status: 'lead', level: 'Awareness', channel: 'Meta', joined: '2025-09-30', lastActive: '2026-05-08', leads: 0, conversions: 0, spend: 0, country: 'SG' },
  { id: '012', name: 'Lucas Martinez', email: 'lucas@example.com', status: 'converted', level: 'Converted', channel: 'Google', joined: '2025-01-05', lastActive: '2026-05-16', leads: 6, conversions: 5, spend: 6000, country: 'ES' },
  { id: '013', name: 'Zoe Robinson', email: 'zoe@example.com', status: 'active', level: 'Consideration', channel: 'Email', joined: '2025-10-11', lastActive: '2026-05-14', leads: 1, conversions: 0, spend: 0, country: 'NZ' },
  { id: '014', name: 'Mason Taylor', email: 'mason@example.com', status: 'inactive', level: 'Awareness', channel: 'TikTok', joined: '2025-11-02', lastActive: '2026-03-20', leads: 0, conversions: 0, spend: 0, country: 'US' },
  { id: '015', name: 'Charlotte Harris', email: 'charlotte@example.com', status: 'active', level: 'Intent', channel: 'Meta', joined: '2025-04-18', lastActive: '2026-05-16', leads: 3, conversions: 2, spend: 2400, country: 'GB' },
]

// ─── Cohort Data (12 weeks) ───────────────────────────────────────────────────
export const cohortData = weeklyPerformance.map((w, i) => ({
  ...w,
  cohortId: `C${String(i + 1).padStart(2, '0')}`,
  meta: { leads: Math.round(w.leads * 0.38), spend: Math.round(w.spend * 0.37) },
  google: { leads: Math.round(w.leads * 0.21), spend: Math.round(w.spend * 0.28) },
  tiktok: { leads: Math.round(w.leads * 0.27), spend: Math.round(w.spend * 0.19) },
  organic: { leads: Math.round(w.leads * 0.13), spend: 0 },
  email: { leads: Math.round(w.leads * 0.04), spend: Math.round(w.spend * 0.01) },
}))

// ─── Posts ────────────────────────────────────────────────────────────────────
export type Post = {
  id: string
  title: string
  content: string
  platform: 'Meta' | 'Instagram' | 'TikTok' | 'LinkedIn' | 'Email'
  type: 'image' | 'video' | 'carousel' | 'story' | 'email'
  status: 'published' | 'scheduled' | 'draft'
  date: string
  week: number
  reach: number
  engagement: number
  clicks: number
  leads: number
  score: number
  hook: string
}

export const posts: Post[] = [
  { id: 'P001', title: '5 Mistakes Killing Your Leads', content: 'Most marketers make these 5 critical errors that silently kill their lead flow...', platform: 'Meta', type: 'carousel', status: 'published', date: '2026-05-01', week: 9, reach: 42000, engagement: 3.8, clicks: 1596, leads: 48, score: 92, hook: 'Most marketers make this mistake...' },
  { id: 'P002', title: 'The 10x Framework Revealed', content: 'This simple 3-step framework helped us 10x our conversion rate in 90 days...', platform: 'TikTok', type: 'video', status: 'published', date: '2026-05-03', week: 9, reach: 87000, engagement: 6.2, clicks: 5394, leads: 62, score: 95, hook: 'Stop scrolling — this changed everything' },
  { id: 'P003', title: 'Client Case Study: $0 to $50K MRR', content: 'How our client went from struggling to scale to $50K MRR in 6 months...', platform: 'LinkedIn', type: 'image', status: 'published', date: '2026-05-05', week: 9, reach: 18000, engagement: 4.5, clicks: 810, leads: 29, score: 84, hook: 'Real results. Real numbers.' },
  { id: 'P004', title: 'Free Lead Gen Template', content: 'Download our proven lead gen template — used to generate 10,000+ leads...', platform: 'Email', type: 'email', status: 'published', date: '2026-05-06', week: 9, reach: 12500, engagement: 28.4, clicks: 3550, leads: 87, score: 97, hook: 'Grab your free template inside' },
  { id: 'P005', title: 'Why Your Ads Are Losing Money', content: 'The #1 reason most ad campaigns fail is something nobody talks about...', platform: 'Meta', type: 'video', status: 'published', date: '2026-05-08', week: 10, reach: 63000, engagement: 5.1, clicks: 3213, leads: 71, score: 91, hook: 'Your ads are leaking money right now' },
  { id: 'P006', title: 'Instagram Reel: Behind the Scenes', content: 'A day in the life of our team as we build a campaign from scratch...', platform: 'Instagram', type: 'story', status: 'published', date: '2026-05-09', week: 10, reach: 31000, engagement: 7.3, clicks: 2263, leads: 33, score: 78, hook: 'We never show this...' },
  { id: 'P007', title: 'The Secret to High-Converting Copy', content: 'After writing 10,000+ ads, we found the pattern that converts every time...', platform: 'Meta', type: 'carousel', status: 'scheduled', date: '2026-05-19', week: 11, reach: 0, engagement: 0, clicks: 0, leads: 0, score: 0, hook: 'The pattern behind every winning ad' },
  { id: 'P008', title: 'Q2 Webinar: Scaling to 7 Figures', content: 'Join us live as we break down the exact playbook for scaling to 7 figures...', platform: 'Email', type: 'email', status: 'scheduled', date: '2026-05-20', week: 11, reach: 0, engagement: 0, clicks: 0, leads: 0, score: 0, hook: 'You\'re invited — limited spots' },
  { id: 'P009', title: 'TikTok: Cold Outreach That Works', content: 'We sent 500 cold DMs. Here\'s what happened — breakdown with templates...', platform: 'TikTok', type: 'video', status: 'draft', date: '2026-05-22', week: 11, reach: 0, engagement: 0, clicks: 0, leads: 0, score: 0, hook: 'I sent 500 DMs in 7 days...' },
  { id: 'P010', title: 'Monthly Performance Report', content: 'May performance breakdown — leads, conversions, what worked and what didn\'t...', platform: 'LinkedIn', type: 'image', status: 'draft', date: '2026-05-28', week: 12, reach: 0, engagement: 0, clicks: 0, leads: 0, score: 0, hook: 'Our honest May results' },
]

// ─── Post Tracker (weekly schedule) ──────────────────────────────────────────
export const postTracker = {
  weeks: ['W9 (May 1-7)', 'W10 (May 8-14)', 'W11 (May 19-25)', 'W12 (May 26-Jun 1)'],
  channels: ['Meta', 'Instagram', 'TikTok', 'LinkedIn', 'Email'],
  schedule: [
    { week: 'W9 (May 1-7)', channel: 'Meta', count: 2, status: 'published', posts: ['P001', 'P002'] },
    { week: 'W9 (May 1-7)', channel: 'TikTok', count: 1, status: 'published', posts: ['P002'] },
    { week: 'W9 (May 1-7)', channel: 'LinkedIn', count: 1, status: 'published', posts: ['P003'] },
    { week: 'W9 (May 1-7)', channel: 'Email', count: 1, status: 'published', posts: ['P004'] },
    { week: 'W10 (May 8-14)', channel: 'Meta', count: 1, status: 'published', posts: ['P005'] },
    { week: 'W10 (May 8-14)', channel: 'Instagram', count: 1, status: 'published', posts: ['P006'] },
    { week: 'W11 (May 19-25)', channel: 'Meta', count: 1, status: 'scheduled', posts: ['P007'] },
    { week: 'W11 (May 19-25)', channel: 'Email', count: 1, status: 'scheduled', posts: ['P008'] },
    { week: 'W11 (May 19-25)', channel: 'TikTok', count: 1, status: 'draft', posts: ['P009'] },
    { week: 'W12 (May 26-Jun 1)', channel: 'LinkedIn', count: 1, status: 'draft', posts: ['P010'] },
  ],
}

// ─── Hooks Library ────────────────────────────────────────────────────────────
export type Hook = {
  id: string
  text: string
  category: 'Curiosity' | 'Fear' | 'Benefit' | 'Social Proof' | 'Urgency' | 'Story'
  platform: 'Meta' | 'TikTok' | 'LinkedIn' | 'Email' | 'Universal'
  usageCount: number
  avgScore: number
  tags: string[]
}

export const hooks: Hook[] = [
  { id: 'H001', text: 'Most marketers make this mistake — and it\'s costing them leads every day.', category: 'Fear', platform: 'Meta', usageCount: 8, avgScore: 91, tags: ['leads', 'mistake', 'marketing'] },
  { id: 'H002', text: 'Stop scrolling — this 60-second trick changed how we run all our ads.', category: 'Curiosity', platform: 'TikTok', usageCount: 12, avgScore: 95, tags: ['trick', 'ads', 'quick-tip'] },
  { id: 'H003', text: 'We helped 47 clients go from $0 to 6 figures. Here\'s the playbook.', category: 'Social Proof', platform: 'LinkedIn', usageCount: 5, avgScore: 88, tags: ['results', 'clients', 'playbook'] },
  { id: 'H004', text: 'Your free [resource] is waiting inside — but only for the next 48 hours.', category: 'Urgency', platform: 'Email', usageCount: 15, avgScore: 93, tags: ['freebie', 'urgency', 'deadline'] },
  { id: 'H005', text: 'I was losing $3,000/month on ads until I found this one thing.', category: 'Story', platform: 'Meta', usageCount: 7, avgScore: 89, tags: ['story', 'ads', 'money'] },
  { id: 'H006', text: 'Here\'s what nobody tells you about scaling paid traffic past $10K/month.', category: 'Curiosity', platform: 'Universal', usageCount: 10, avgScore: 87, tags: ['scaling', 'paid-traffic', 'advanced'] },
  { id: 'H007', text: 'The conversion rate doubled when we changed just 3 words in the headline.', category: 'Benefit', platform: 'Meta', usageCount: 6, avgScore: 84, tags: ['conversion', 'copywriting', 'headline'] },
  { id: 'H008', text: 'Warning: your competitors are already using this strategy. Are you?', category: 'Fear', platform: 'LinkedIn', usageCount: 9, avgScore: 86, tags: ['competition', 'strategy', 'fomo'] },
  { id: 'H009', text: 'I sent 500 cold DMs in 7 days. Here\'s exactly what happened.', category: 'Story', platform: 'TikTok', usageCount: 14, avgScore: 96, tags: ['dm', 'outreach', 'experiment'] },
  { id: 'H010', text: 'Real talk — here are the actual numbers from our May campaign.', category: 'Social Proof', platform: 'Universal', usageCount: 4, avgScore: 82, tags: ['transparency', 'results', 'numbers'] },
  { id: 'H011', text: 'Grab your [template/checklist] — it\'s free and takes 30 seconds to download.', category: 'Benefit', platform: 'Email', usageCount: 18, avgScore: 90, tags: ['lead-magnet', 'freebie', 'quick'] },
  { id: 'H012', text: 'Don\'t buy another course until you read this.', category: 'Curiosity', platform: 'Meta', usageCount: 11, avgScore: 88, tags: ['course', 'buying', 'warning'] },
  { id: 'H013', text: 'The 3-step formula we use to write every winning ad — swipe it for free.', category: 'Benefit', platform: 'Universal', usageCount: 16, avgScore: 94, tags: ['formula', 'ads', 'copywriting'] },
  { id: 'H014', text: 'Last chance — [offer] expires at midnight tonight.', category: 'Urgency', platform: 'Email', usageCount: 20, avgScore: 92, tags: ['deadline', 'offer', 'last-chance'] },
  { id: 'H015', text: 'If you\'re still doing [old method], you\'re already behind.', category: 'Fear', platform: 'Universal', usageCount: 8, avgScore: 85, tags: ['old-way', 'fomo', 'competition'] },
]

// ─── Weekly Checklist ─────────────────────────────────────────────────────────
export type ChecklistItem = {
  id: string
  task: string
  category: 'Content' | 'Ads' | 'Analytics' | 'Email' | 'Strategy'
  priority: 'High' | 'Medium' | 'Low'
  dueDay: string
  completed: boolean
}

export const checklistItems: ChecklistItem[] = [
  { id: 'CL001', task: 'Review last week\'s ad performance and pause underperformers', category: 'Ads', priority: 'High', dueDay: 'Monday', completed: true },
  { id: 'CL002', task: 'Publish 2× Meta posts (carousel + video)', category: 'Content', priority: 'High', dueDay: 'Monday', completed: true },
  { id: 'CL003', task: 'Send weekly email newsletter to full list', category: 'Email', priority: 'High', dueDay: 'Tuesday', completed: true },
  { id: 'CL004', task: 'Update CPL/CPA tracking sheet with latest data', category: 'Analytics', priority: 'High', dueDay: 'Tuesday', completed: false },
  { id: 'CL005', task: 'Post 1× TikTok (trending hook format)', category: 'Content', priority: 'Medium', dueDay: 'Wednesday', completed: false },
  { id: 'CL006', task: 'A/B test new ad creative — launch 3 variants', category: 'Ads', priority: 'High', dueDay: 'Wednesday', completed: false },
  { id: 'CL007', task: 'Review funnel drop-off points in analytics dashboard', category: 'Analytics', priority: 'Medium', dueDay: 'Thursday', completed: false },
  { id: 'CL008', task: 'Draft next week\'s post calendar and get approval', category: 'Strategy', priority: 'Medium', dueDay: 'Thursday', completed: false },
  { id: 'CL009', task: 'Respond to all DMs and comments across platforms', category: 'Content', priority: 'Low', dueDay: 'Friday', completed: false },
  { id: 'CL010', task: 'Weekly strategy meeting — review KPIs vs targets', category: 'Strategy', priority: 'High', dueDay: 'Friday', completed: false },
  { id: 'CL011', task: 'Pull budget utilisation report for client', category: 'Analytics', priority: 'High', dueDay: 'Friday', completed: false },
  { id: 'CL012', task: 'Repurpose top-performing post into 2 additional formats', category: 'Content', priority: 'Low', dueDay: 'Friday', completed: false },
]

// ─── Lead Pipeline ────────────────────────────────────────────────────────────
export const pipeline = {
  columns: ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost'],
  cards: [
    { id: 'L001', name: 'Ava Thompson', company: 'Spark Digital', value: 4800, channel: 'Meta', stage: 'New Lead', priority: 'High', date: '2026-05-16' },
    { id: 'L002', name: 'Marco Rossi', company: 'Rossi Agency', value: 9600, channel: 'Google', stage: 'Contacted', priority: 'High', date: '2026-05-14' },
    { id: 'L003', name: 'Sarah Kim', company: 'Kim Ventures', value: 3600, channel: 'Organic', stage: 'Qualified', priority: 'Medium', date: '2026-05-12' },
    { id: 'L004', name: 'David Park', company: 'Park & Co.', value: 7200, channel: 'Email', stage: 'Proposal Sent', priority: 'High', date: '2026-05-10' },
    { id: 'L005', name: 'Nina Patel', company: 'Patel Group', value: 12000, channel: 'Meta', stage: 'Won', priority: 'High', date: '2026-05-08' },
    { id: 'L006', name: 'Tom Baker', company: 'Baker Labs', value: 2400, channel: 'TikTok', stage: 'Lost', priority: 'Low', date: '2026-05-05' },
    { id: 'L007', name: 'Lily Chen', company: 'Chen Creative', value: 6000, channel: 'Google', stage: 'Contacted', priority: 'Medium', date: '2026-05-15' },
    { id: 'L008', name: 'James Moore', company: 'Moore Media', value: 8400, channel: 'Meta', stage: 'Qualified', priority: 'High', date: '2026-05-13' },
    { id: 'L009', name: 'Sofia Torres', company: 'Torres Inc.', value: 4200, channel: 'Email', stage: 'New Lead', priority: 'Medium', date: '2026-05-16' },
    { id: 'L010', name: 'Alex Johnson', company: 'Johnson & Partners', value: 15000, channel: 'Organic', stage: 'Proposal Sent', priority: 'High', date: '2026-05-09' },
  ],
}

// ─── Dashboard summary totals ─────────────────────────────────────────────────
export const kpiSummary = {
  totalLeads: 3385,
  totalConversions: 322,
  avgCR: 9.5,
  avgCPL: 38,
  totalSpend: 127055,
  totalRevenue: 966000,
  budgetUsed: 82,
  activeCampaigns: 14,
  avgROI: 660,
}
