/**
 * Lifecycle Automation Cron
 * ─────────────────────────
 * Runs daily (Vercel cron: "0 9 * * *" in vercel.json)
 * Reads from `contacts_current` view (latest stage+state per contact).
 * Writes stage transitions to `contact_stages` (full history preserved).
 *
 * Stage / State reference
 * ─────────────────────────────────────────────────────────────────────────
 *   lead              → new | contacted | reminded_7d | reminded_21d | cold
 *   customer_trial    → active | inactive | expiring | expired
 *   customer_paid     → active | at_risk | churned
 * ─────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import {
  leadReminder7dEmail,
  leadReminder21dEmail,
  trialDay1Email,
  trialDay3Email,
  trialDay7Email,
  trialExpiryEmail,
  trialExpiredEmail,
} from '@/lib/emailTemplates'

// Service role key bypasses RLS — required for cron writes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContactRow {
  contact_id:          string
  first_name:          string
  last_name:           string | null
  email:               string | null
  stage:               string
  state:               string
  trial_started_at:    string | null
  trial_expires_at:    string | null
  mrr:                 number | null
  changed_at:          string | null
  last_activity_at:    string | null
  payment_failed:      boolean | null
  manual_at_risk_flag: boolean | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// SaaS task types aligned with lifecycle stage
// All tasks start as 'open'; agents move them to 'in_progress' / 'done'
const TASK_TYPES = {
  LEAD_FOLLOWUP:    'Lead Follow-up',
  TRIAL_ACTIVATION: 'Trial Activation',
  TRIAL_CONVERSION: 'Trial Conversion',
  WINBACK:          'Win-back',
  RETENTION:        'Retention',
  REENGAGE:         'Re-engage',
} as const

function fullName(c: Pick<ContactRow, 'first_name' | 'last_name'>): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
}

async function createTask(
  contactId: string,
  contactName: string,
  type: string,
  title: string,
  daysOut: number,
  status: 'open' | 'in_progress' | 'done' = 'open',
) {
  const due = new Date()
  due.setDate(due.getDate() + daysOut)
  const { error } = await supabase.from('tasks').insert({
    contact_id:    contactId,
    contact_name:  contactName,
    title,
    type,
    priority:      'High',
    due_date:      due.toISOString().split('T')[0],
    status,
    alarm_triggered: false,
  })
  if (error) console.error('[createTask] insert failed:', error.message, '| contact_id:', contactId)
}

// Update the status of an existing task for a contact by type
async function updateTaskStatus(
  contactId: string,
  type: string,
  newStatus: 'open' | 'in_progress' | 'done',
) {
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('contact_id', contactId)
    .eq('type', type)
    .neq('status', 'done') // never downgrade a done task
  if (error) console.error('[updateTaskStatus] failed:', error.message, '| contact_id:', contactId, type)
}

async function sendEmail(
  contactId: string,
  to: string,
  subject: string,
  body: string,
  opts?: { contactName?: string; templateName?: string },
) {
  if (!to) return
  const key = process.env.RESEND_API_KEY
  let status: 'sent' | 'queued' | 'failed' = 'queued'

  if (key) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? 'AgentsPilot <noreply@agentspilot.com>',
          to,
          subject,
          html: body.replace(/\n/g, '<br/>'),
        }),
      })
      status = res.ok ? 'sent' : 'failed'
      if (!res.ok) console.error('[email] Resend error:', await res.text())
    } catch (e) {
      status = 'failed'
      console.error('[email] send failed:', e)
    }
  }

  await supabase.from('emails').insert({
    contact_id:    contactId,
    to_email:      to,
    to_name:       opts?.contactName ?? null,
    subject,
    body,
    template_name: opts?.templateName ?? 'Auto',
    status,
  })
}

async function logRun(
  ruleId: string,
  contactId: string,
  contactName: string,
  action: string,
) {
  await supabase.from('automation_runs').insert({
    rule_id:      ruleId,
    contact_id:   contactId,
    contact_name: contactName,
    action,
  })
}

// Increment or decrement lead_score (clamped 0–100, defaults from 50 if null)
async function updateLeadScore(contactId: string, delta: number) {
  const { data } = await supabase.from('contacts').select('lead_score').eq('contact_id', contactId).single()
  const current = (data as { lead_score?: number | null } | null)?.lead_score ?? 50
  const newScore = Math.max(0, Math.min(100, current + delta))
  await supabase.from('contacts').update({ lead_score: newScore }).eq('contact_id', contactId)
}

// Append a tag to the contact record so the profile shows which automations fired
async function tagContact(contactId: string, tag: string) {
  const { data } = await supabase
    .from('contacts')
    .select('tags')
    .eq('contact_id', contactId)
    .single()
  const existing: string[] = (data as { tags?: string[] } | null)?.tags ?? []
  if (existing.includes(tag)) return
  await supabase.from('contacts').update({ tags: [...existing, tag] }).eq('contact_id', contactId)
}

// Add a timeline note without changing stage/state (e.g. email sent events)
async function addTimelineNote(
  contactId: string,
  stage: string,
  state: string,
  notes: string,
) {
  await supabase.from('contact_stages').insert({
    contact_id:  contactId,
    stage,
    state,
    from_stage:  stage,
    from_state:  state,
    changed_by:  'system',
    notes,
  })
}

// Insert a new stage transition row (preserves full history)
async function transitionStage(
  contactId: string,
  fromStage: string,
  fromState: string,
  toStage: string,
  toState: string,
  changedBy = 'system',
  notes?: string,
) {
  await supabase.from('contact_stages').insert({
    contact_id:  contactId,
    stage:       toStage,
    state:       toState,
    from_stage:  fromStage,
    from_state:  fromState,
    changed_by:  changedBy,
    notes:       notes ?? null,
  })
}

async function updateRuleMeta(ruleId: string, count: number) {
  await supabase.from('automation_settings').upsert(
    { rule_id: ruleId, last_run_at: new Date().toISOString(), last_run_count: count },
    { onConflict: 'rule_id' },
  )
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const productUrl = process.env.PRODUCT_URL || 'https://app.agentspilot.com'
  const url    = new URL(req.url)
  const demo   = url.searchParams.get('demo') === 'true'   // bypass all time checks
  // In demo mode, 'rule' limits execution to a single named rule so steps don't all fire at once
  const onlyRule    = url.searchParams.get('rule') ?? null
  const demoContact = url.searchParams.get('contact_id') ?? null  // scope demo to one contact
  const skip   = (id: string) => demo && onlyRule !== null && onlyRule !== id
  const now    = new Date()
  const results: Record<string, number> = {}

  // ── Debug: return contacts_current snapshot in demo mode ─────────────────
  if (demo && url.searchParams.get('debug') === 'true') {
    const { data, error } = await supabase
      .from('contacts_current')
      .select('contact_id,first_name,stage,state,changed_at,trial_started_at,trial_expires_at')
    return NextResponse.json({ debug: true, contacts: data, error })
  }

  // Load enabled rules
  const { data: settingsRows } = await supabase
    .from('automation_settings')
    .select('rule_id,enabled')

  const ruleEnabled = (id: string) => {
    if (!settingsRows?.length) return true
    const row = settingsRows.find((r: { rule_id: string; enabled: boolean }) => r.rule_id === id)
    return row ? row.enabled : true
  }

  // ── Rule 1: new_lead_followup ─────────────────────────────────────────────
  // Leads in 'new' state 24h+ → task In Progress + state → 'contacted'
  if (!skip('new_lead_followup') && ruleEnabled('new_lead_followup')) {
    const since = new Date(now); since.setDate(since.getDate() - 1)
    let q = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email')
      .eq('stage', 'lead').eq('state', 'new')
    if (!demo) q = q.lte('changed_at', since.toISOString())
    if (demoContact) q = q.eq('contact_id', demoContact)
    const { data: newLeads } = await q

    let count = 0
    for (const lead of (newLeads ?? []) as ContactRow[]) {
      const name = fullName(lead)
      await updateTaskStatus(lead.contact_id, TASK_TYPES.LEAD_FOLLOWUP, 'in_progress')
      await transitionStage(lead.contact_id, 'lead', 'new', 'lead', 'contacted', 'system', '24h follow-up — task moved to In Progress')
      await tagContact(lead.contact_id, 'contacted')
      await logRun('new_lead_followup', lead.contact_id, name, 'state → contacted · Lead Follow-up → In Progress')
      count++
    }
    await updateRuleMeta('new_lead_followup', count)
    results.new_lead_followup = count
  }

  // ── Rule 1b: lead_followup_done ──────────────────────────────────────────
  // Auto-close Lead Follow-up task when lead goes cold or moves to trial
  {
    const { data: advanced } = await supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name')
      .or('and(stage.eq.lead,state.eq.cold),and(stage.eq.customer_trial,state.neq.expired)')
    for (const c of (advanced ?? []) as ContactRow[]) {
      await updateTaskStatus(c.contact_id, TASK_TYPES.LEAD_FOLLOWUP, 'done')
    }
  }

  // ── Rule 1c: lead_reminder_7d ─────────────────────────────────────────────
  // Lead in 'contacted' state 7d+ → send reminder email + state → 'reminded_7d'
  if (!skip('lead_reminder_7d') && ruleEnabled('lead_reminder_7d')) {
    const cutoff7 = new Date(now); cutoff7.setDate(cutoff7.getDate() - 7)
    let q = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email')
      .eq('stage', 'lead').eq('state', 'contacted')
    if (!demo) q = q.lte('changed_at', cutoff7.toISOString())
    if (demoContact) q = q.eq('contact_id', demoContact)
    const { data: leads7 } = await q

    const trialUrl = process.env.TRIAL_SIGNUP_URL || 'https://agentspilot-marketing.vercel.app/signup'
    let count = 0
    for (const lead of (leads7 ?? []) as ContactRow[]) {
      const name = fullName(lead)
      await sendEmail(
        lead.contact_id, lead.email ?? '',
        `Still thinking it over, ${lead.first_name}? Your free trial is waiting`,
        leadReminder7dEmail(lead.first_name, trialUrl),
        { contactName: name, templateName: 'lead_reminder_7d' },
      )
      await transitionStage(lead.contact_id, 'lead', 'contacted', 'lead', 'reminded_7d', 'system', '7-day reminder email sent')
      await tagContact(lead.contact_id, 'reminder-7d-sent')
      await updateLeadScore(lead.contact_id, -10)
      await logRun('lead_reminder_7d', lead.contact_id, name, 'state → reminded_7d · 7-day reminder sent')
      count++
    }
    await updateRuleMeta('lead_reminder_7d', count)
    results.lead_reminder_7d = count
  }

  // ── Rule 1d: lead_reminder_21d ────────────────────────────────────────────
  // Lead in 'reminded_7d' state 14d+ → send final reminder + state → 'reminded_21d'
  if (!skip('lead_reminder_21d') && ruleEnabled('lead_reminder_21d')) {
    const cutoff14 = new Date(now); cutoff14.setDate(cutoff14.getDate() - 14)
    let q = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email')
      .eq('stage', 'lead').eq('state', 'reminded_7d')
    if (!demo) q = q.lte('changed_at', cutoff14.toISOString())
    if (demoContact) q = q.eq('contact_id', demoContact)
    const { data: leads21 } = await q

    const trialUrl = process.env.TRIAL_SIGNUP_URL || 'https://agentspilot-marketing.vercel.app/signup'
    let count = 0
    for (const lead of (leads21 ?? []) as ContactRow[]) {
      const name = fullName(lead)
      await sendEmail(
        lead.contact_id, lead.email ?? '',
        `Last message from us, ${lead.first_name}. Promise.`,
        leadReminder21dEmail(lead.first_name, trialUrl),
        { contactName: name, templateName: 'lead_reminder_21d' },
      )
      await transitionStage(lead.contact_id, 'lead', 'reminded_7d', 'lead', 'reminded_21d', 'system', '21-day final reminder email sent')
      await tagContact(lead.contact_id, 'reminder-21d-sent')
      await updateLeadScore(lead.contact_id, -15)
      await logRun('lead_reminder_21d', lead.contact_id, name, 'state → reminded_21d · 21-day reminder sent')
      count++
    }
    await updateRuleMeta('lead_reminder_21d', count)
    results.lead_reminder_21d = count
  }

  // ── Rule 1e: lead_cold_30d ────────────────────────────────────────────────
  // Lead still at 'reminded_21d' after 9+ more days (≈30d total) → mark cold, close task
  if (!skip('lead_cold_30d') && ruleEnabled('lead_cold_30d')) {
    const cutoff9 = new Date(now); cutoff9.setDate(cutoff9.getDate() - 9)
    let q = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name')
      .eq('stage', 'lead')
      .eq('state', 'reminded_21d')
    if (!demo) q = q.lte('changed_at', cutoff9.toISOString())
    if (demoContact) q = q.eq('contact_id', demoContact)
    const { data: coldLeads } = await q

    let count = 0
    for (const lead of (coldLeads ?? []) as ContactRow[]) {
      const name = fullName(lead)
      // Mark task done with 'cold' note so UI can display it differently from a converted done
      await supabase.from('tasks').update({ status: 'done', notes: 'cold — no trial signup after 30 days' })
        .eq('contact_id', lead.contact_id).eq('type', TASK_TYPES.LEAD_FOLLOWUP).neq('status', 'done')
      // Transition to 'cold' state — no response after full sequence (SaaS, no sales team)
      await transitionStage(lead.contact_id, 'lead', 'reminded_21d', 'lead', 'cold', 'system', 'No trial signup after 30-day sequence — marked cold')
      await tagContact(lead.contact_id, 'cold')
      await updateLeadScore(lead.contact_id, -25)
      await logRun('lead_cold_30d', lead.contact_id, name, 'Lead cold after 30 days — Lead Follow-up → done')
      count++
    }
    await updateRuleMeta('lead_cold_30d', count)
    results.lead_cold_30d = count
  }

  // ── Rule 2a: trial_no_activation_3d ──────────────────────────────────────
  // Trial contacts 3+ days in with no activation → move active → inactive
  if (!skip('trial_no_activation_3d') && ruleEnabled('trial_no_activation_3d')) {
    const cutoff3 = new Date(now); cutoff3.setDate(cutoff3.getDate() - 3)
    let q = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email,trial_started_at')
      .eq('stage', 'customer_trial')
      .eq('state', 'active')
      .not('trial_started_at', 'is', null)
      .is('activated_at', null)
    if (!demo) q = q.lte('trial_started_at', cutoff3.toISOString())
    if (demoContact) q = q.eq('contact_id', demoContact)
    const { data: notActivated } = await q

    let count = 0
    for (const c of (notActivated ?? []) as ContactRow[]) {
      const name = fullName(c)
      await transitionStage(c.contact_id, 'customer_trial', 'active', 'customer_trial', 'inactive', 'system',
        '3 days since signup with no activation — marked inactive')
      await tagContact(c.contact_id, 'no-activation-3d')
      await logRun('trial_no_activation_3d', c.contact_id, name, 'state active → inactive (no activation after 3 days)')
      count++
    }
    await updateRuleMeta('trial_no_activation_3d', count)
    results.trial_no_activation_3d = count
  }

  // ── Rule 2: trial_inactive_2d ─────────────────────────────────────────────
  // Trial contacts who are inactive 2+ days → send activation email + task
  if (ruleEnabled('trial_inactive_2d')) {
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 2)
    let inactiveQuery = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email,trial_started_at')
      .eq('stage', 'customer_trial')
      .eq('state', 'inactive')
      .not('trial_started_at', 'is', null)
    if (!demo) inactiveQuery = inactiveQuery.lte('trial_started_at', cutoff.toISOString())
    const { data: inactive } = await inactiveQuery

    let count = 0
    for (const c of (inactive ?? []) as ContactRow[]) {
      const name = fullName(c)
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('contact_id', c.contact_id)
        .eq('type', TASK_TYPES.TRIAL_ACTIVATION)
        .limit(1)
      if (existing?.length) continue

      await sendEmail(
        c.contact_id,
        c.email ?? '',
        'Activate your AgentsPilot trial',
        `Hi ${c.first_name},<br/><br/>Your trial is waiting — log in and get started! Let us know if you need any help.<br/><br/>— The AgentsPilot Team`,
        { contactName: name, templateName: 'Activate Your Trial' },
      )
      await createTask(c.contact_id, name, TASK_TYPES.TRIAL_ACTIVATION, `Trial Activation — ${name}`, 1)
      // Move Trial Activation → in_progress (activation email sent)
      await updateTaskStatus(c.contact_id, TASK_TYPES.TRIAL_ACTIVATION, 'in_progress')
      await tagContact(c.contact_id, 'activation-email-sent')
      await logRun('trial_inactive_2d', c.contact_id, name, 'Sent activation email + Trial Activation → in_progress')
      count++
    }
    await updateRuleMeta('trial_inactive_2d', count)
    results.trial_inactive_2d = count
  }

  // ── Rule 2b: trial_day1 ───────────────────────────────────────────────────
  // Trial contacts who signed up exactly 1 day ago — send "get started" activation email
  if (!skip('trial_day1') && ruleEnabled('trial_day1')) {
    const day1start = new Date(now); day1start.setDate(day1start.getDate() - 1); day1start.setHours(0,  0,  0,   0)
    const day1end   = new Date(now); day1end.setDate(day1end.getDate()     - 1); day1end.setHours(23, 59, 59, 999)

    let day1q = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email,trial_started_at')
      .eq('stage', 'customer_trial')
      .in('state', ['active', 'inactive'])
    if (!demo) {
      day1q = day1q.gte('trial_started_at', day1start.toISOString()).lte('trial_started_at', day1end.toISOString())
    }
    if (demoContact) day1q = day1q.eq('contact_id', demoContact)
    const { data: day1contacts } = await day1q

    let count = 0
    for (const c of (day1contacts ?? []) as ContactRow[]) {
      const name = fullName(c)
      const { data: alreadySent } = await supabase
        .from('emails').select('id').eq('contact_id', c.contact_id).eq('template_name', 'trial_day1_activation').limit(1)
      if (alreadySent?.length) continue

      await sendEmail(
        c.contact_id,
        c.email ?? '',
        `Day 1 — let's get you 10 minutes of real value, ${c.first_name}`,
        trialDay1Email(c.first_name, productUrl),
        { contactName: name, templateName: 'trial_day1_activation' },
      )
      await logRun('trial_day1', c.contact_id, name, 'Day 1 activation tips email sent')
      count++
    }
    await updateRuleMeta('trial_day1', count)
    results.trial_day1 = count
  }

  // ── Rule 2c: trial_day3 ───────────────────────────────────────────────────
  // Trial contacts who signed up exactly 3 days ago — feature spotlight + real use case
  if (!skip('trial_day3') && ruleEnabled('trial_day3')) {
    const day3start = new Date(now); day3start.setDate(day3start.getDate() - 3); day3start.setHours(0,  0,  0,   0)
    const day3end   = new Date(now); day3end.setDate(day3end.getDate()     - 3); day3end.setHours(23, 59, 59, 999)

    let day3q = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email,trial_started_at')
      .eq('stage', 'customer_trial')
      .in('state', ['active', 'inactive'])
    if (!demo) {
      day3q = day3q.gte('trial_started_at', day3start.toISOString()).lte('trial_started_at', day3end.toISOString())
    }
    if (demoContact) day3q = day3q.eq('contact_id', demoContact)
    const { data: day3contacts } = await day3q

    let count = 0
    for (const c of (day3contacts ?? []) as ContactRow[]) {
      const name = fullName(c)
      const { data: alreadySent } = await supabase
        .from('emails').select('id').eq('contact_id', c.contact_id).eq('template_name', 'trial_day3_feature').limit(1)
      if (alreadySent?.length) continue

      await sendEmail(
        c.contact_id,
        c.email ?? '',
        `How a founder closed 3 customers in 14 days using AgentsPilot`,
        trialDay3Email(c.first_name, productUrl),
        { contactName: name, templateName: 'trial_day3_feature' },
      )
      await logRun('trial_day3', c.contact_id, name, 'Day 3 feature spotlight email sent')
      count++
    }
    await updateRuleMeta('trial_day3', count)
    results.trial_day3 = count
  }

  // ── Rule 3: trial_expiring_3d ─────────────────────────────────────────────
  // Trial contacts whose trial expires within the next 3 days (any trial state except expired)
  if (ruleEnabled('trial_expiring_3d')) {
    const in3 = new Date(now); in3.setDate(in3.getDate() + 3)
    let expiringQuery = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email,trial_expires_at')
      .eq('stage', 'customer_trial')
      .neq('state', 'expired')
    if (!demo) {
      expiringQuery = expiringQuery
        .lte('trial_expires_at', in3.toISOString())
        .gte('trial_expires_at', now.toISOString())
    }
    const { data: expiring } = await expiringQuery

    let count = 0
    for (const c of (expiring ?? []) as ContactRow[]) {
      const name = fullName(c)
      // Skip if expiry warning already sent
      const { data: existing } = await supabase
        .from('emails')
        .select('id')
        .eq('contact_id', c.contact_id)
        .eq('template_name', 'Trial Expiring in 3 Days')
        .limit(1)
      if (existing?.length) continue

      await sendEmail(
        c.contact_id,
        c.email ?? '',
        `${c.first_name}, your trial ends in 3 days`,
        trialExpiryEmail(c.first_name, productUrl),
        { contactName: name, templateName: 'Trial Expiring in 3 Days' },
      )
      // Create Trial Conversion task directly as in_progress (expiry is imminent)
      const { data: existingConv } = await supabase.from('tasks').select('id').eq('contact_id', c.contact_id).eq('type', TASK_TYPES.TRIAL_CONVERSION).limit(1)
      if (!existingConv?.length) {
        await createTask(c.contact_id, name, TASK_TYPES.TRIAL_CONVERSION, `Trial Conversion — ${name}`, 3, 'in_progress')
      }
      await transitionStage(c.contact_id, 'customer_trial', c.state, 'customer_trial', 'expiring', 'system', 'Expiry warning sent')
      await tagContact(c.contact_id, 'expiry-warning-sent')
      await logRun('trial_expiring_3d', c.contact_id, name, 'Sent expiry warning + Trial Conversion task → in_progress + state → expiring')
      count++
    }
    await updateRuleMeta('trial_expiring_3d', count)
    results.trial_expiring_3d = count
  }

  // ── Rule 4: trial_expired ─────────────────────────────────────────────────
  // Contacts whose trial_expires_at has passed but state is not yet 'expired'
  if (ruleEnabled('trial_expired')) {
    let expiredQuery = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email,trial_expires_at')
      .eq('stage', 'customer_trial')
      .neq('state', 'expired')
      .not('trial_expires_at', 'is', null)
    if (!demo) expiredQuery = expiredQuery.lt('trial_expires_at', now.toISOString())
    const { data: nowExpired } = await expiredQuery

    let count = 0
    for (const c of (nowExpired ?? []) as ContactRow[]) {
      const name = fullName(c)
      // Skip if Win-back task already exists
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('contact_id', c.contact_id)
        .eq('type', TASK_TYPES.WINBACK)
        .limit(1)
      if (existing?.length) continue

      await sendEmail(
        c.contact_id,
        c.email ?? '',
        `Your trial ended, ${c.first_name}. No hard feelings.`,
        trialExpiredEmail(c.first_name, productUrl),
        { contactName: name, templateName: 'Trial Expired — Win-back' },
      )
      // Trial Conversion task → done (trial ended, now in win-back phase)
      await updateTaskStatus(c.contact_id, TASK_TYPES.TRIAL_CONVERSION, 'done')
      // Create Win-back task as in_progress (win-back email already sent)
      await createTask(c.contact_id, name, TASK_TYPES.WINBACK, `Win-back — ${name}`, 7, 'in_progress')
      await transitionStage(c.contact_id, 'customer_trial', c.state, 'customer_trial', 'expired', 'system', 'Trial period ended')
      await tagContact(c.contact_id, 'winback-email-sent')
      await logRun('trial_expired', c.contact_id, name, 'Trial expired + Trial Conversion → done + Win-back → in_progress + state → expired')
      count++
    }
    await updateRuleMeta('trial_expired', count)
    results.trial_expired = count
  }

  // ── Auto-detect at_risk (customer_paid → active → at_risk) ───────────────
  // Reads config, then checks each active paying customer for at-risk signals
  const { data: configRows } = await supabase.from('automation_config').select('key,value')
  const getConfig = (k: string) =>
    (configRows as { key: string; value: string }[] | null)?.find(r => r.key === k)?.value ?? null

  const inactivityDays    = parseInt(getConfig('at_risk_inactivity_days')    ?? '30')
  const churnAfterRiskDays = parseInt(getConfig('churn_after_at_risk_days')   ?? '30')
  let atRiskSignals: Record<string, boolean> = {
    inactivity: true, mrr_zero: true, payment_failed: true, manual_flag: true,
  }
  try {
    const raw = getConfig('at_risk_signals')
    if (raw) atRiskSignals = JSON.parse(raw)
  } catch { /* keep defaults */ }

  // ── Auto-detect at_risk: active paid → at_risk ───────────────────────────
  const { data: paidActive } = await supabase
    .from('contacts_current')
    .select('contact_id,first_name,last_name,email,mrr,last_activity_at,payment_failed,manual_at_risk_flag')
    .eq('stage', 'customer_paid')
    .eq('state', 'active')

  let atRiskCount = 0
  for (const c of (paidActive ?? []) as ContactRow[]) {
    let shouldMark = false
    const reasons: string[] = []

    // Signal 1 — inactivity: last_activity_at older than X days (or never)
    if (atRiskSignals.inactivity) {
      const inactiveCutoff = new Date(now)
      inactiveCutoff.setDate(inactiveCutoff.getDate() - inactivityDays)
      const lastActive = c.last_activity_at ? new Date(c.last_activity_at) : null
      if (!lastActive || lastActive < inactiveCutoff) {
        shouldMark = true
        reasons.push(`no activity for ${inactivityDays}+ days`)
      }
    }

    // Signal 2 — mrr_zero: paid customer dropped to $0 MRR
    if (atRiskSignals.mrr_zero && (c.mrr === 0 || c.mrr === null)) {
      shouldMark = true
      reasons.push('MRR dropped to $0')
    }

    // Signal 3 — payment_failed: last charge failed
    if (atRiskSignals.payment_failed && c.payment_failed) {
      shouldMark = true
      reasons.push('payment failed')
    }

    // Signal 4 — manual_flag: team manually flagged this customer
    if (atRiskSignals.manual_flag && c.manual_at_risk_flag) {
      shouldMark = true
      reasons.push('manually flagged at-risk')
    }

    if (shouldMark) {
      const note = `Auto at-risk: ${reasons.join(', ')}`
      await transitionStage(c.contact_id, 'customer_paid', 'active', 'customer_paid', 'at_risk', 'system', note)
      // Create Retention task as open (check-in not sent yet)
      const { data: existingRet } = await supabase.from('tasks').select('id').eq('contact_id', c.contact_id).eq('type', TASK_TYPES.RETENTION).limit(1)
      if (!existingRet?.length) {
        await createTask(c.contact_id, fullName(c), TASK_TYPES.RETENTION, `Retention — ${fullName(c)}`, 1, 'open')
      }
      await tagContact(c.contact_id, 'auto-at-risk')
      await logRun('at_risk_alert', c.contact_id, fullName(c), note)
      atRiskCount++
    }
  }
  results.at_risk_auto_detected = atRiskCount

  // ── Auto-churn: at_risk for X days with no recovery ─────────────────────
  if (ruleEnabled('at_risk_churned')) {
    const churnCutoff = new Date(now)
    churnCutoff.setDate(churnCutoff.getDate() - churnAfterRiskDays)

    let churnQuery = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email,changed_at')
      .eq('stage', 'customer_paid')
      .eq('state', 'at_risk')
    if (!demo) churnQuery = churnQuery.lte('changed_at', churnCutoff.toISOString())
    const { data: atRiskOld } = await churnQuery

    let churnCount = 0
    for (const c of (atRiskOld ?? []) as ContactRow[]) {
      const name = fullName(c)
      await transitionStage(
        c.contact_id, 'customer_paid', 'at_risk', 'customer_paid', 'churned',
        'system', `At-risk for ${churnAfterRiskDays}+ days with no recovery`,
      )
      await sendEmail(
        c.contact_id,
        c.email ?? '',
        'We\'re sad to see you go — AgentsPilot',
        `Hi ${c.first_name},<br/><br/>Your account has been inactive for a while and your subscription has lapsed.<br/><br/>If there\'s anything we could have done better, we\'d love to hear it — just reply to this email.<br/><br/>You\'re always welcome back.<br/><br/>— The AgentsPilot Team`,
        { contactName: name, templateName: 'Auto-Churned Notice' },
      )
      await tagContact(c.contact_id, 'auto-churned')
      await logRun('at_risk_churned', c.contact_id, name, `Auto-churned after ${churnAfterRiskDays} days at-risk`)
      churnCount++
    }
    await updateRuleMeta('at_risk_churned', churnCount)
    results.at_risk_churned = churnCount
  }

  // ── Rule 5: at_risk_alert ─────────────────────────────────────────────────
  if (ruleEnabled('at_risk_alert')) {
    const { data: atRisk } = await supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email')
      .eq('stage', 'customer_paid')
      .eq('state', 'at_risk')

    let count = 0
    for (const c of (atRisk ?? []) as ContactRow[]) {
      const name = fullName(c)
      // Skip if check-in email already sent
      const { data: existing } = await supabase
        .from('emails')
        .select('id')
        .eq('contact_id', c.contact_id)
        .eq('template_name', 'At-Risk Check-in')
        .limit(1)
      if (existing?.length) continue

      await sendEmail(
        c.contact_id,
        c.email ?? '',
        'We miss you — how can we help?',
        `Hi ${c.first_name},<br/><br/>We noticed you haven't been active recently. Is there anything we can help with?<br/><br/>Just reply to this email — we're here.<br/><br/>— The AgentsPilot Team`,
        { contactName: name, templateName: 'At-Risk Check-in' },
      )
      // Retention task → in_progress (check-in sent)
      await updateTaskStatus(c.contact_id, TASK_TYPES.RETENTION, 'in_progress')
      await tagContact(c.contact_id, 'at-risk-checkin-sent')
      await logRun('at_risk_alert', c.contact_id, name, 'Sent at-risk check-in email + Retention → in_progress')
      count++
    }
    await updateRuleMeta('at_risk_alert', count)
    results.at_risk_alert = count
  }

  // ── Rule 6: trial_midpoint_7d ─────────────────────────────────────────────
  // Trial contacts who started exactly 7 days ago (active or inactive state)
  if (ruleEnabled('trial_midpoint_7d')) {
    const day7start = new Date(now); day7start.setDate(day7start.getDate() - 7); day7start.setHours(0, 0, 0, 0)
    const day7end   = new Date(now); day7end.setDate(day7end.getDate() - 7);     day7end.setHours(23, 59, 59, 999)

    let day7q = supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email,trial_started_at')
      .eq('stage', 'customer_trial')
      .in('state', ['active', 'inactive'])
    if (!demo) {
      day7q = day7q.gte('trial_started_at', day7start.toISOString()).lte('trial_started_at', day7end.toISOString())
    }
    if (demoContact) day7q = day7q.eq('contact_id', demoContact)
    const { data: midpoint } = await day7q

    let count = 0
    for (const c of (midpoint ?? []) as ContactRow[]) {
      const name = fullName(c)
      // Skip if midpoint email already sent
      const { data: existing } = await supabase
        .from('emails')
        .select('id')
        .eq('contact_id', c.contact_id)
        .eq('template_name', 'Trial Mid-Point Check-in')
        .limit(1)
      if (existing?.length) continue

      await sendEmail(
        c.contact_id,
        c.email ?? '',
        `${c.first_name}, you're halfway through — here's what to do next`,
        trialDay7Email(c.first_name, productUrl),
        { contactName: name, templateName: 'Trial Mid-Point Check-in' },
      )
      await logRun('trial_midpoint_7d', c.contact_id, name, 'Sent mid-point check-in email (day 7)')
      count++
    }
    await updateRuleMeta('trial_midpoint_7d', count)
    results.trial_midpoint_7d = count
  }

  // ── Rule 7: churned_winback ──────────────────────────────────────────────
  // Multi-touch win-back sequence: day 7, 14, 30 after churning
  if (ruleEnabled('churned_winback')) {
    const { data: churned } = await supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email,changed_at')
      .eq('stage', 'customer_paid')
      .eq('state', 'churned')

    let count = 0
    for (const c of (churned ?? []) as ContactRow[]) {
      const name = fullName(c)
      if (!c.changed_at) continue
      const daysSinceChurn = Math.floor((now.getTime() - new Date(c.changed_at).getTime()) / 86400000)

      const sequences = [
        { day: 7,  subject: 'We miss you at AgentsPilot',     body: `Hi ${c.first_name},<br/><br/>It's been a week. Here's what's new — and we'd love to have you back.<br/><br/>— The AgentsPilot Team` },
        { day: 14, subject: 'Still thinking about it?',       body: `Hi ${c.first_name},<br/><br/>We'd love to have you back. Reply to this email and we'll set up a special offer.<br/><br/>— The AgentsPilot Team` },
        { day: 30, subject: 'One last thing — a gift for you', body: `Hi ${c.first_name},<br/><br/>Here's an exclusive offer to re-join AgentsPilot. This is our final outreach.<br/><br/>— The AgentsPilot Team` },
      ]

      for (const seq of sequences) {
        // Use a 2-day window so a missed cron day doesn't skip the email
        if (daysSinceChurn >= seq.day && daysSinceChurn < seq.day + 2) {
          // Skip if this day's email was already sent
          const { data: existing } = await supabase
            .from('emails')
            .select('id')
            .eq('contact_id', c.contact_id)
            .eq('subject', seq.subject)
            .limit(1)
          if (existing?.length) continue

          await sendEmail(c.contact_id, c.email ?? '', seq.subject, seq.body, { contactName: name, templateName: 'Churned Win-back' })

          if (seq.day === 7) {
            // Day 7: create Re-engage task as in_progress (sequence started)
            const { data: existingRe } = await supabase.from('tasks').select('id').eq('contact_id', c.contact_id).eq('type', TASK_TYPES.REENGAGE).limit(1)
            if (!existingRe?.length) {
              await createTask(c.contact_id, name, TASK_TYPES.REENGAGE, `Re-engage — ${name}`, 23, 'in_progress')
            }
            // Also mark Retention task as done (churned, no recovery)
            await updateTaskStatus(c.contact_id, TASK_TYPES.RETENTION, 'done')
          } else if (seq.day === 30) {
            // Day 30: Re-engage sequence complete → done
            await updateTaskStatus(c.contact_id, TASK_TYPES.REENGAGE, 'done')
          }

          await logRun('churned_winback', c.contact_id, name, `Win-back email — day ${seq.day}`)
          count++
        }
      }
    }
    await updateRuleMeta('churned_winback', count)
    results.churned_winback = count
  }

  return NextResponse.json({ ok: true, ran_at: now.toISOString(), results })
}
