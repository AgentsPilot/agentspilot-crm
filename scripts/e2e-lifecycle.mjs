/**
 * AgentsPilot CRM — E2E Lifecycle Test
 * ─────────────────────────────────────
 * Tests the full lead → trial → paid → at_risk → churned flow.
 * Backdates timestamps so every cron rule fires immediately.
 *
 * Usage:
 *   node scripts/e2e-lifecycle.mjs
 *
 * Requirements:
 *   - Dev server running on localhost:3001
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync }  from 'fs'
import { resolve }       from 'path'

// ── Load env ──────────────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()] }),
)

const SUPABASE_URL      = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY
const BASE_URL          = 'http://localhost:3001'
const CRON_SECRET       = env.CRON_SECRET ?? ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0
const results = []

function daysAgo(n)   { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString() }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString() }

async function assert(label, fn) {
  try {
    await fn()
    console.log(`  ✅ ${label}`)
    passed++
    results.push({ label, pass: true })
  } catch (err) {
    console.error(`  ❌ ${label}`)
    console.error(`     → ${err.message}`)
    failed++
    results.push({ label, pass: false, error: err.message })
  }
}

async function runCron() {
  const res = await fetch(`${BASE_URL}/api/cron/lifecycle`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  })
  if (!res.ok) throw new Error(`Cron returned ${res.status}: ${await res.text()}`)
  return res.json()
}

async function getContact(contactId) {
  const { data, error } = await db
    .from('contacts_current')
    .select('*')
    .eq('contact_id', contactId)
    .single()
  if (error) throw new Error(`contacts_current lookup failed: ${error.message}`)
  return data
}

async function getStageHistory(contactId) {
  const { data } = await db
    .from('contact_stages')
    .select('*')
    .eq('contact_id', contactId)
    .order('changed_at', { ascending: false })
  return data ?? []
}

async function getTasks(contactId) {
  const { data } = await db.from('tasks').select('*').eq('contact_id', contactId)
  return data ?? []
}

async function getEmails(contactId) {
  const { data } = await db.from('emails').select('*').eq('contact_id', contactId)
  return data ?? []
}

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function seedContact(fields) {
  const { data, error } = await db
    .from('contacts')
    .insert(fields)
    .select('contact_id')
    .single()
  if (error) throw new Error(`Insert contact failed: ${error.message}`)
  return data.contact_id
}

async function seedStage(contactId, stage, state, overrides = {}) {
  const { error } = await db.from('contact_stages').insert({
    contact_id: contactId,
    stage,
    state,
    changed_by: 'api',
    ...overrides,
  })
  if (error) throw new Error(`Insert stage failed: ${error.message}`)
}

async function setContactField(contactId, fields) {
  const { error } = await db
    .from('contacts')
    .update(fields)
    .eq('contact_id', contactId)
  if (error) throw new Error(`Update contact failed: ${error.message}`)
}

async function setStageDate(contactId, fields) {
  // Update the most recent contact_stages row
  const { data } = await db
    .from('contact_stages')
    .select('id')
    .eq('contact_id', contactId)
    .order('changed_at', { ascending: false })
    .limit(1)
    .single()
  if (!data) throw new Error('No stage row found')
  const { error } = await db.from('contact_stages').update(fields).eq('id', data.id)
  if (error) throw new Error(`Update stage row failed: ${error.message}`)
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup(contactId) {
  if (!contactId) return
  await db.from('automation_runs').delete().eq('contact_id', contactId)
  await db.from('campaign_events').delete().eq('contact_id', contactId)
  await db.from('campaign_enrollments').delete().eq('contact_id', contactId)
  await db.from('contact_stages').delete().eq('contact_id', contactId)
  await db.from('tasks').delete().eq('contact_id', contactId)
  await db.from('emails').delete().eq('contact_id', contactId)
  await db.from('contacts').delete().eq('contact_id', contactId)
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SCENARIOS
// ══════════════════════════════════════════════════════════════════════════════

// ── Scenario 1: New lead → welcome email → state = contacted ─────────────────
async function scenario1() {
  console.log('\n📋 Scenario 1: New lead → welcome email → contacted')
  let contactId

  try {
    // Seed: lead/new, added 2 hours ago
    contactId = await seedContact({
      first_name: 'Test', last_name: 'Lead',
      email: 'e2e-lead@agentspilot-test.com',
      channel: 'Organic',
    })
    await seedStage(contactId, 'lead', 'new', {
      changed_at: daysAgo(0), // just now
    })

    // Backdate changed_at to 2 hours ago (within the 24h window)
    await setStageDate(contactId, { changed_at: new Date(Date.now() - 2 * 3600000).toISOString() })

    const cronResult = await runCron()
    console.log('  [cron]', JSON.stringify(cronResult.results))

    await assert('Welcome email sent', async () => {
      const emails = await getEmails(contactId)
      const welcome = emails.find(e => e.template_name === 'lead_thank_you')
      if (!welcome) throw new Error(`No welcome email found. Emails: ${JSON.stringify(emails.map(e => e.template_name))}`)
    })

    await assert('State transitioned to contacted', async () => {
      const c = await getContact(contactId)
      if (c.state !== 'contacted') throw new Error(`Expected contacted, got: ${c.state}`)
    })

    await assert('Lead Follow-up task created', async () => {
      const tasks = await getTasks(contactId)
      const task = tasks.find(t => t.type === 'Lead Follow-up')
      if (!task) throw new Error(`No Lead Follow-up task found. Tasks: ${JSON.stringify(tasks.map(t => t.type))}`)
    })

  } finally {
    await cleanup(contactId)
  }
}

// ── Scenario 2: Trial inactive for 2 days → activation email ────────────────
async function scenario2() {
  console.log('\n📋 Scenario 2: Trial inactive 2d → activation email')
  let contactId

  try {
    contactId = await seedContact({
      first_name: 'Inactive', last_name: 'Trial',
      email: 'e2e-inactive@agentspilot-test.com',
      channel: 'Meta',
    })
    // Seed as customer_trial/inactive, trial started 3 days ago
    await seedStage(contactId, 'customer_trial', 'inactive', {
      trial_started_at: daysAgo(3),
      trial_expires_at: daysFromNow(11),
      changed_at: daysAgo(3),
    })

    const cronResult = await runCron()
    console.log('  [cron]', JSON.stringify(cronResult.results))

    await assert('Activation email sent', async () => {
      const emails = await getEmails(contactId)
      const email = emails.find(e => e.template_name === 'Activate Your Trial')
      if (!email) throw new Error(`No activation email. Got: ${JSON.stringify(emails.map(e => e.template_name))}`)
    })

    await assert('Trial Activation task created', async () => {
      const tasks = await getTasks(contactId)
      const task = tasks.find(t => t.type === 'Trial Activation')
      if (!task) throw new Error(`No Trial Activation task found. Tasks: ${JSON.stringify(tasks.map(t => t.type))}`)
    })

  } finally {
    await cleanup(contactId)
  }
}

// ── Scenario 3: Trial expiring in 2 days → expiry warning + state = expiring ─
async function scenario3() {
  console.log('\n📋 Scenario 3: Trial expiring in 2d → warning email + state = expiring')
  let contactId

  try {
    contactId = await seedContact({
      first_name: 'Expiring', last_name: 'Trial',
      email: 'e2e-expiring@agentspilot-test.com',
      channel: 'Google',
    })
    await seedStage(contactId, 'customer_trial', 'active', {
      trial_started_at: daysAgo(12),
      trial_expires_at: daysFromNow(2), // expires in 2 days — within 3-day window
      changed_at: daysAgo(12),
    })

    const cronResult = await runCron()
    console.log('  [cron]', JSON.stringify(cronResult.results))

    await assert('Expiry warning email sent', async () => {
      const emails = await getEmails(contactId)
      const email = emails.find(e => e.template_name === 'Trial Expiring in 3 Days')
      if (!email) throw new Error(`No expiry warning email. Got: ${JSON.stringify(emails.map(e => e.template_name))}`)
    })

    await assert('State = expiring', async () => {
      const c = await getContact(contactId)
      if (c.state !== 'expiring') throw new Error(`Expected expiring, got: ${c.state}`)
    })

  } finally {
    await cleanup(contactId)
  }
}

// ── Scenario 4: Trial expired → expired state + trial conversion task ────────
async function scenario4() {
  console.log('\n📋 Scenario 4: Trial expired → state = expired + trial conversion task')
  let contactId

  try {
    contactId = await seedContact({
      first_name: 'Expired', last_name: 'Trial',
      email: 'e2e-expired@agentspilot-test.com',
      channel: 'Linkedin',
    })
    await seedStage(contactId, 'customer_trial', 'active', {
      trial_started_at: daysAgo(16),
      trial_expires_at: daysAgo(2), // expired 2 days ago
      changed_at: daysAgo(16),
    })

    const cronResult = await runCron()
    console.log('  [cron]', JSON.stringify(cronResult.results))

    await assert('Win-back email sent', async () => {
      const emails = await getEmails(contactId)
      const email = emails.find(e => e.template_name === 'Trial Expired — Win-back')
      if (!email) throw new Error(`No win-back email. Got: ${JSON.stringify(emails.map(e => e.template_name))}`)
    })

    await assert('State = expired', async () => {
      const c = await getContact(contactId)
      if (c.state !== 'expired') throw new Error(`Expected expired, got: ${c.state}`)
    })

    await assert('Trial Conversion task created', async () => {
      const tasks = await getTasks(contactId)
      const task = tasks.find(t => t.type === 'Trial Conversion')
      if (!task) throw new Error(`No Trial Conversion task found. Tasks: ${JSON.stringify(tasks.map(t => t.type))}`)
    })

  } finally {
    await cleanup(contactId)
  }
}

// ── Scenario 5: Paid customer inactive 35 days → at_risk ────────────────────
async function scenario5() {
  console.log('\n📋 Scenario 5: Paid/active, inactive 35d → at_risk')
  let contactId

  try {
    contactId = await seedContact({
      first_name: 'Inactive', last_name: 'Paid',
      email: 'e2e-inactive-paid@agentspilot-test.com',
      channel: 'Organic',
      last_activity_at: daysAgo(35), // inactive for 35 days
    })
    await seedStage(contactId, 'customer_paid', 'active', {
      mrr: 99,
      plan: 'Pro',
      changed_at: daysAgo(60),
    })

    const cronResult = await runCron()
    console.log('  [cron]', JSON.stringify(cronResult.results))

    await assert('State = at_risk', async () => {
      const c = await getContact(contactId)
      if (c.state !== 'at_risk') throw new Error(`Expected at_risk, got: ${c.state}`)
    })

    await assert('Timeline shows at_risk transition', async () => {
      const history = await getStageHistory(contactId)
      const atRisk = history.find(h => h.state === 'at_risk' && h.changed_by === 'system')
      if (!atRisk) throw new Error('No system at_risk transition in history')
    })

  } finally {
    await cleanup(contactId)
  }
}

// ── Scenario 6: Paid/at_risk for 31 days → churned ──────────────────────────
async function scenario6() {
  console.log('\n📋 Scenario 6: Paid/at_risk 31d → churned + churn notice email')
  let contactId

  try {
    contactId = await seedContact({
      first_name: 'Churned', last_name: 'Customer',
      email: 'e2e-churned@agentspilot-test.com',
      channel: 'Google',
    })
    await seedStage(contactId, 'customer_paid', 'at_risk', {
      mrr: 49,
      plan: 'Starter',
      changed_at: daysAgo(31), // been at_risk for 31 days
    })

    const cronResult = await runCron()
    console.log('  [cron]', JSON.stringify(cronResult.results))

    await assert('State = churned', async () => {
      const c = await getContact(contactId)
      if (c.state !== 'churned') throw new Error(`Expected churned, got: ${c.state}`)
    })

    await assert('Churn notice email sent', async () => {
      const emails = await getEmails(contactId)
      const email = emails.find(e => e.template_name === 'Auto-Churned Notice')
      if (!email) throw new Error(`No churn notice. Got: ${JSON.stringify(emails.map(e => e.template_name))}`)
    })

  } finally {
    await cleanup(contactId)
  }
}

// ── Scenario 7: Trial midpoint (day 7) → tip email ───────────────────────────
async function scenario7() {
  console.log('\n📋 Scenario 7: Trial day 7 → mid-point tip email')
  let contactId

  try {
    contactId = await seedContact({
      first_name: 'Midpoint', last_name: 'Trial',
      email: 'e2e-midpoint@agentspilot-test.com',
      channel: 'Tiktok',
    })
    await seedStage(contactId, 'customer_trial', 'active', {
      trial_started_at: daysAgo(7), // exactly day 7
      trial_expires_at: daysFromNow(7),
      changed_at: daysAgo(7),
    })

    const cronResult = await runCron()
    console.log('  [cron]', JSON.stringify(cronResult.results))

    await assert('Mid-point tip email sent', async () => {
      const emails = await getEmails(contactId)
      const email = emails.find(e => e.template_name === 'Trial Mid-Point Check-in')
      if (!email) throw new Error(`No mid-point email. Got: ${JSON.stringify(emails.map(e => e.template_name))}`)
    })

  } finally {
    await cleanup(contactId)
  }
}

// ── Scenario 8: Churned → win-back sequence on day 7 ────────────────────────
async function scenario8() {
  console.log('\n📋 Scenario 8: Churned day 7 → win-back email #1')
  let contactId

  try {
    contactId = await seedContact({
      first_name: 'Winback', last_name: 'Customer',
      email: 'e2e-winback@agentspilot-test.com',
      channel: 'Meta',
    })
    await seedStage(contactId, 'customer_paid', 'churned', {
      changed_at: daysAgo(7), // churned exactly 7 days ago
    })

    const cronResult = await runCron()
    console.log('  [cron]', JSON.stringify(cronResult.results))

    await assert('Win-back day-7 email sent', async () => {
      const emails = await getEmails(contactId)
      const email = emails.find(e => e.subject?.includes('miss you'))
      if (!email) throw new Error(`No win-back day-7 email. Got: ${JSON.stringify(emails.map(e => e.subject))}`)
    })

  } finally {
    await cleanup(contactId)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RUNNER
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🚀 AgentsPilot CRM — E2E Lifecycle Test')
  console.log(`   Server: ${BASE_URL}`)
  console.log(`   DB:     ${SUPABASE_URL}\n`)

  // Quick health check
  try {
    const res = await fetch(`${BASE_URL}/api/cron/lifecycle`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (e) {
    console.error(`❌ Cannot reach ${BASE_URL}/api/cron/lifecycle — is the dev server running?`)
    process.exit(1)
  }

  await scenario1()
  await scenario2()
  await scenario3()
  await scenario4()
  await scenario5()
  await scenario6()
  await scenario7()
  await scenario8()

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50))
  console.log(`  E2E Results: ${passed} passed / ${failed} failed`)
  console.log('═'.repeat(50))

  if (failed > 0) {
    console.log('\nFailed tests:')
    results.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.label}: ${r.error}`))
    process.exit(1)
  } else {
    console.log('\n  ✅ All lifecycle rules verified!')
    process.exit(0)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
