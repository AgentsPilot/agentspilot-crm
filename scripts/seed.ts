/**
 * Seed script — populates all CRM tables with realistic test data
 * Run: npx tsx scripts/seed.ts
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://rspnielpnsbguvygsnci.supabase.co',
  'sb_publishable_VDGLT5QPVuWUOiMxRsy97Q_yh6oNMFK'
)

const today = new Date().toISOString().split('T')[0]
const daysFromToday = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ─── 1. CAMPAIGNS ─────────────────────────────────────────────────────────────
const campaigns = [
  {
    name: 'May Meta — Strategy Call',
    channel: 'Meta',
    status: 'active',
    budget: 5000,
    spent: 3200,
    start_date: daysFromToday(-20),
    end_date: daysFromToday(10),
    utm_source: 'facebook',
    utm_medium: 'paid_social',
    utm_campaign: 'may_strategy_call',
    goal: 'Generate 100 qualified leads for strategy calls',
  },
  {
    name: 'Google Brand Keywords',
    channel: 'Google',
    status: 'active',
    budget: 3000,
    spent: 2100,
    start_date: daysFromToday(-30),
    end_date: daysFromToday(30),
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'brand_keywords',
    goal: 'Capture high-intent search traffic',
  },
  {
    name: 'TikTok Awareness — Reel Series',
    channel: 'TikTok',
    status: 'paused',
    budget: 2000,
    spent: 980,
    start_date: daysFromToday(-15),
    end_date: daysFromToday(15),
    utm_source: 'tiktok',
    utm_medium: 'paid_social',
    utm_campaign: 'reel_awareness_may',
    goal: 'Top of funnel awareness — 500K impressions',
  },
  {
    name: 'Email Nurture — Free Guide',
    channel: 'Email',
    status: 'active',
    budget: 500,
    spent: 180,
    start_date: daysFromToday(-10),
    end_date: daysFromToday(20),
    utm_source: 'email',
    utm_medium: 'newsletter',
    utm_campaign: 'free_guide_may',
    goal: 'Re-engage cold leads with free resource',
  },
]

// ─── 2. CONTACTS ──────────────────────────────────────────────────────────────
const contacts = [
  // Meta campaign
  { full_name: 'James Mitchell', email: 'james.mitchell@gmail.com', phone: '+1-415-234-5678', country: 'US', city: 'San Francisco', language: 'EN', channel: 'Meta', campaign_name: 'May Meta — Strategy Call', utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: 'may_strategy_call', utm_content: 'carousel_v2', ad_id: 'AD_001', status: 'active', funnel_level: 'Intent', lead_score: 78 },
  { full_name: 'Sophia Andersen', email: 'sophia.andersen@outlook.com', phone: '+45-22-334-455', country: 'DK', city: 'Copenhagen', language: 'EN', channel: 'Meta', campaign_name: 'May Meta — Strategy Call', utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: 'may_strategy_call', utm_content: 'video_v1', ad_id: 'AD_002', status: 'lead', funnel_level: 'Interest', lead_score: 45 },
  { full_name: 'Carlos Rivera', email: 'c.rivera@empresa.mx', phone: '+52-55-1234-5678', country: 'MX', city: 'Mexico City', language: 'ES', channel: 'Meta', campaign_name: 'May Meta — Strategy Call', utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: 'may_strategy_call', utm_content: 'carousel_v1', ad_id: 'AD_001', status: 'converted', funnel_level: 'Converted', lead_score: 95 },
  { full_name: 'Emily Zhao', email: 'emily.zhao@tech.sg', phone: '+65-9123-4567', country: 'SG', city: 'Singapore', language: 'EN', channel: 'Meta', campaign_name: 'May Meta — Strategy Call', utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: 'may_strategy_call', utm_content: 'video_v2', ad_id: 'AD_003', status: 'active', funnel_level: 'Consideration', lead_score: 62 },
  { full_name: 'Noah Fischer', email: 'noah.fischer@web.de', phone: '+49-30-12345678', country: 'DE', city: 'Berlin', language: 'DE', channel: 'Meta', campaign_name: 'May Meta — Strategy Call', utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: 'may_strategy_call', utm_content: 'carousel_v2', ad_id: 'AD_002', status: 'lead', funnel_level: 'Awareness', lead_score: 22 },

  // Google campaign
  { full_name: 'Rachel Kim', email: 'rachel.kim@startup.io', phone: '+1-212-567-8901', country: 'US', city: 'New York', language: 'EN', channel: 'Google', campaign_name: 'Google Brand Keywords', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'brand_keywords', utm_content: 'ad_1', status: 'converted', funnel_level: 'Converted', lead_score: 92 },
  { full_name: 'Luca Bianchi', email: 'luca.bianchi@studio.it', phone: '+39-02-1234567', country: 'IT', city: 'Milan', language: 'IT', channel: 'Google', campaign_name: 'Google Brand Keywords', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'brand_keywords', utm_content: 'ad_2', status: 'active', funnel_level: 'Intent', lead_score: 80 },
  { full_name: 'Amira Hassan', email: 'amira.hassan@agency.ae', phone: '+971-50-123-4567', country: 'AE', city: 'Dubai', language: 'AR', channel: 'Google', campaign_name: 'Google Brand Keywords', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'brand_keywords', utm_content: 'ad_1', status: 'lead', funnel_level: 'Consideration', lead_score: 55 },
  { full_name: 'Tom Bradley', email: 'tom.bradley@consulting.co.uk', phone: '+44-20-7946-0123', country: 'GB', city: 'London', language: 'EN', channel: 'Google', campaign_name: 'Google Brand Keywords', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'brand_keywords', utm_content: 'ad_3', status: 'active', funnel_level: 'Interest', lead_score: 48 },

  // TikTok campaign
  { full_name: 'Yuki Tanaka', email: 'yuki.tanaka@gmail.com', phone: '+81-90-1234-5678', country: 'JP', city: 'Tokyo', language: 'JA', channel: 'TikTok', campaign_name: 'TikTok Awareness — Reel Series', utm_source: 'tiktok', utm_medium: 'paid_social', utm_campaign: 'reel_awareness_may', utm_content: 'reel_03', status: 'lead', funnel_level: 'Awareness', lead_score: 18 },
  { full_name: 'Isabella Santos', email: 'isabella.santos@mktg.br', phone: '+55-11-98765-4321', country: 'BR', city: 'São Paulo', language: 'PT', channel: 'TikTok', campaign_name: 'TikTok Awareness — Reel Series', utm_source: 'tiktok', utm_medium: 'paid_social', utm_campaign: 'reel_awareness_may', utm_content: 'reel_01', status: 'lead', funnel_level: 'Interest', lead_score: 35 },
  { full_name: 'Marcus Johnson', email: 'marcus.j@creative.ca', phone: '+1-604-234-5678', country: 'CA', city: 'Vancouver', language: 'EN', channel: 'TikTok', campaign_name: 'TikTok Awareness — Reel Series', utm_source: 'tiktok', utm_medium: 'paid_social', utm_campaign: 'reel_awareness_may', utm_content: 'reel_02', status: 'active', funnel_level: 'Consideration', lead_score: 58 },

  // Email campaign
  { full_name: 'Sara Levi', email: 'sara.levi@startup.co.il', phone: '+972-50-123-4567', country: 'IL', city: 'Tel Aviv', language: 'HE', channel: 'Email', campaign_name: 'Email Nurture — Free Guide', utm_source: 'email', utm_medium: 'newsletter', utm_campaign: 'free_guide_may', utm_content: 'cta_button', status: 'converted', funnel_level: 'Converted', lead_score: 90 },
  { full_name: 'David Park', email: 'david.park@growth.kr', phone: '+82-10-1234-5678', country: 'KR', city: 'Seoul', language: 'KO', channel: 'Email', campaign_name: 'Email Nurture — Free Guide', utm_source: 'email', utm_medium: 'newsletter', utm_campaign: 'free_guide_may', utm_content: 'cta_link', status: 'active', funnel_level: 'Intent', lead_score: 73 },
  { full_name: 'Nina Petrova', email: 'nina.petrova@agency.ru', phone: '+7-495-123-4567', country: 'RU', city: 'Moscow', language: 'RU', channel: 'Email', campaign_name: 'Email Nurture — Free Guide', utm_source: 'email', utm_medium: 'newsletter', utm_campaign: 'free_guide_may', utm_content: 'cta_button', status: 'inactive', funnel_level: 'Awareness', lead_score: 10 },
]

// ─── 3. PIPELINE DEALS ────────────────────────────────────────────────────────
const deals = [
  { contact_name: 'James Mitchell', contact_email: 'james.mitchell@gmail.com', company: 'Mitchell Ventures', value: 4800, channel: 'Meta', campaign_name: 'May Meta — Strategy Call', stage: 'Proposal Sent', priority: 'High', notes: 'Interested in Pro plan. Budget approved.' },
  { contact_name: 'Carlos Rivera', contact_email: 'c.rivera@empresa.mx', company: 'Empresa MX', value: 7200, channel: 'Meta', campaign_name: 'May Meta — Strategy Call', stage: 'Won', priority: 'High', notes: 'Closed! Annual plan signed.' },
  { contact_name: 'Rachel Kim', contact_email: 'rachel.kim@startup.io', company: 'Startup IO', value: 9600, channel: 'Google', campaign_name: 'Google Brand Keywords', stage: 'Won', priority: 'High', notes: 'Enterprise deal — 12 months.' },
  { contact_name: 'Luca Bianchi', contact_email: 'luca.bianchi@studio.it', company: 'Studio Bianchi', value: 3600, channel: 'Google', campaign_name: 'Google Brand Keywords', stage: 'Qualified', priority: 'Medium', notes: 'Has a team of 5. Decision in 2 weeks.' },
  { contact_name: 'Emily Zhao', contact_email: 'emily.zhao@tech.sg', company: 'Tech SG', value: 6000, channel: 'Meta', campaign_name: 'May Meta — Strategy Call', stage: 'Contacted', priority: 'High', notes: 'Replied to intro email — call scheduled.' },
  { contact_name: 'Tom Bradley', contact_email: 'tom.bradley@consulting.co.uk', company: 'Bradley Consulting', value: 4200, channel: 'Google', campaign_name: 'Google Brand Keywords', stage: 'Contacted', priority: 'Medium', notes: 'Opened email 3 times — warm lead.' },
  { contact_name: 'Sara Levi', contact_email: 'sara.levi@startup.co.il', company: 'Startup IL', value: 5400, channel: 'Email', campaign_name: 'Email Nurture — Free Guide', stage: 'Won', priority: 'High', notes: 'Fast close — 3 days from lead to deal.' },
  { contact_name: 'David Park', contact_email: 'david.park@growth.kr', company: 'Growth KR', value: 3000, channel: 'Email', campaign_name: 'Email Nurture — Free Guide', stage: 'Qualified', priority: 'Medium', notes: 'Needs approval from CFO.' },
  { contact_name: 'Marcus Johnson', contact_email: 'marcus.j@creative.ca', company: 'Creative CA', value: 2400, channel: 'TikTok', campaign_name: 'TikTok Awareness — Reel Series', stage: 'New Lead', priority: 'Low', notes: 'Early stage — just signed up.' },
  { contact_name: 'Sophia Andersen', contact_email: 'sophia.andersen@outlook.com', company: null, value: 1800, channel: 'Meta', campaign_name: 'May Meta — Strategy Call', stage: 'New Lead', priority: 'Medium', notes: 'Downloaded free guide. Booked a call.' },
]

// ─── 4. TASKS ─────────────────────────────────────────────────────────────────
const tasks = [
  { title: 'Call James Mitchell — follow up on proposal', contact_name: 'James Mitchell', type: 'Call', priority: 'High', due_date: today, done: false, notes: 'He asked for a call today at 3pm' },
  { title: 'Send intro email to Sophia Andersen', contact_name: 'Sophia Andersen', type: 'Email', priority: 'High', due_date: today, done: false, notes: 'Use the intro template' },
  { title: 'Qualify Luca Bianchi — budget & timeline', contact_name: 'Luca Bianchi', type: 'Call', priority: 'Medium', due_date: today, done: false, notes: 'Ask about team size and Q3 budget' },
  { title: 'Follow up — Tom Bradley opened email 3×', contact_name: 'Tom Bradley', type: 'Follow-up', priority: 'Medium', due_date: daysFromToday(-2), done: false, notes: 'Overdue — reach out now' },
  { title: 'Send proposal to Amira Hassan', contact_name: 'Amira Hassan', type: 'Email', priority: 'High', due_date: daysFromToday(-1), done: false, notes: 'She asked for pricing last week' },
  { title: 'Schedule strategy call with Emily Zhao', contact_name: 'Emily Zhao', type: 'Meeting', priority: 'High', due_date: daysFromToday(1), done: false, notes: 'She\'s in Singapore — check timezone' },
  { title: 'Check in with David Park — CFO approval?', contact_name: 'David Park', type: 'Follow-up', priority: 'Medium', due_date: daysFromToday(2), done: false, notes: 'Waiting on CFO sign-off' },
  { title: 'Onboarding call — Carlos Rivera', contact_name: 'Carlos Rivera', type: 'Meeting', priority: 'High', due_date: daysFromToday(3), done: false, notes: 'Welcome call — show them the dashboard' },
  { title: 'Sent welcome email — Rachel Kim', contact_name: 'Rachel Kim', type: 'Email', priority: 'Medium', due_date: daysFromToday(-5), done: true, notes: null },
  { title: 'Called Sara Levi — confirmed deal', contact_name: 'Sara Levi', type: 'Call', priority: 'High', due_date: daysFromToday(-3), done: true, notes: 'Signed contract!' },
  { title: 'Reviewed TikTok campaign performance', contact_name: null, type: 'Other', priority: 'Low', due_date: daysFromToday(-7), done: true, notes: 'Paused low-performing ad sets' },
  { title: 'Follow up — Marcus Johnson (TikTok lead)', contact_name: 'Marcus Johnson', type: 'Follow-up', priority: 'Low', due_date: daysFromToday(5), done: false, notes: 'Early stage — light touch' },
]

// ─── RUN SEED ─────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 AgentsPilot CRM — Seed Script\n')

  // Clear existing data
  console.log('🧹 Clearing existing data...')
  await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('pipeline_deals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('   ✓ All tables cleared\n')

  // 1. Campaigns
  console.log('📣 Seeding campaigns...')
  const { data: campData, error: campErr } = await supabase.from('campaigns').insert(campaigns).select()
  if (campErr) { console.error('   ✗ Campaigns error:', campErr.message); process.exit(1) }
  console.log(`   ✓ ${campData?.length} campaigns created\n`)

  // 2. Contacts
  console.log('👥 Seeding contacts...')
  const { data: contactData, error: contactErr } = await supabase.from('users').insert(contacts).select()
  if (contactErr) { console.error('   ✗ Contacts error:', contactErr.message); process.exit(1) }
  console.log(`   ✓ ${contactData?.length} contacts created\n`)

  // 3. Pipeline deals
  console.log('📋 Seeding pipeline deals...')
  const { data: dealData, error: dealErr } = await supabase.from('pipeline_deals').insert(deals).select()
  if (dealErr) { console.error('   ✗ Deals error:', dealErr.message); process.exit(1) }
  console.log(`   ✓ ${dealData?.length} deals created\n`)

  // 4. Tasks
  console.log('✅ Seeding tasks...')
  const { data: taskData, error: taskErr } = await supabase.from('tasks').insert(tasks).select()
  if (taskErr) { console.error('   ✗ Tasks error:', taskErr.message); process.exit(1) }
  console.log(`   ✓ ${taskData?.length} tasks created\n`)

  // Summary
  console.log('─'.repeat(40))
  console.log('✅ Seed complete! Here\'s what was created:\n')
  console.log(`   📣 Campaigns : ${campData?.length}`)
  console.log(`   👥 Contacts  : ${contactData?.length}`)
  console.log(`   📋 Deals     : ${dealData?.length} (across all pipeline stages)`)
  console.log(`   ✅ Tasks     : ${taskData?.length} (${tasks.filter(t => !t.done).length} pending, ${tasks.filter(t => t.done).length} done)`)
  console.log('\n🔗 Open http://localhost:3001 to test\n')
  console.log('E2E Flow to verify:')
  console.log('  1. /contacts   — 15 contacts from 4 campaigns')
  console.log('  2. /pipeline   — 10 deals across 5 stages (3 Won)')
  console.log('  3. /tasks      — 3 due today, 2 overdue, 5 upcoming')
  console.log('  4. /campaigns  — 4 campaigns with live lead counts\n')
}

seed()
