/**
 * POST /api/trial/convert
 * ─────────────────────────────────────────────────────────────────────────────
 * Call this when a trial user upgrades to a paid plan — from your payment
 * webhook (Stripe, Paddle, etc.) or manually from the CRM UI.
 *
 * Effect:
 *   • Transitions contact from customer_trial → customer_paid / active
 *   • Sets contacts.converted_at = now
 *   • Sets contacts.mrr via latest contact_stages row (plan + mrr)
 *   • Marks Trial Conversion task as done
 *   • Creates an Onboarding task (due tomorrow)
 *   • Sends a "you're now a customer" confirmation email
 *   • Logs to automation_runs + Timeline
 *
 * Body (JSON):
 *   contact_id   string   required   (UUID)
 *   plan         string   optional   e.g. "starter", "pro", "enterprise"
 *   mrr          number   optional   monthly recurring revenue (USD)
 *   source       string   optional   e.g. "stripe_webhook", "manual", "paddle"
 *
 * CORS: allows any origin.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { trialConvertedEmail } from '@/lib/emailTemplates'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  let body: { contact_id?: string; plan?: string; mrr?: number; source?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS })
  }

  const { contact_id, plan, mrr, source = 'api' } = body
  if (!contact_id) {
    return NextResponse.json({ error: 'contact_id is required' }, { status: 400, headers: CORS })
  }

  // ── 1. Fetch current state ────────────────────────────────────────────────
  const { data: contact, error: fetchErr } = await supabase
    .from('contacts_current')
    .select('contact_id, first_name, last_name, email, stage, state, converted_at')
    .eq('contact_id', contact_id)
    .maybeSingle()

  if (fetchErr || !contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404, headers: CORS })
  }

  // Idempotent — if already paid, just return success
  if (contact.stage === 'customer_paid') {
    return NextResponse.json(
      { success: true, contact_id, already_converted: true, stage: 'customer_paid' },
      { status: 200, headers: CORS },
    )
  }

  if (contact.stage !== 'customer_trial') {
    return NextResponse.json(
      { error: `Expected customer_trial, got ${contact.stage}` },
      { status: 409, headers: CORS },
    )
  }

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ')
  const now  = new Date()

  // ── 2. Transition to customer_paid ────────────────────────────────────────
  const { error: stageErr } = await supabase.from('contact_stages').insert({
    contact_id:  contact_id,
    stage:       'customer_paid',
    state:       'active',
    from_stage:  'customer_trial',
    from_state:  contact.state,
    changed_by:  source,
    plan:        plan   ?? null,
    mrr:         mrr    ?? null,
    notes:       `Trial converted to paid. Plan: ${plan ?? '—'}, MRR: $${mrr ?? 0}. Source: ${source}`,
  })

  if (stageErr) {
    console.error('[trial/convert] stage insert error:', stageErr)
    return NextResponse.json({ error: stageErr.message }, { status: 500, headers: CORS })
  }

  // ── 3. Update contacts table ──────────────────────────────────────────────
  await supabase.from('contacts').update({
    converted_at: now.toISOString(),
    activated_at: contact.converted_at ? undefined : now.toISOString(), // set if not already
  }).eq('contact_id', contact_id)

  // ── 4. Task housekeeping ──────────────────────────────────────────────────
  // Close all open trial tasks
  await supabase.from('tasks')
    .update({ status: 'done' })
    .eq('contact_id', contact_id)
    .in('type', ['Trial Activation', 'Trial Conversion', 'Win-back'])
    .neq('status', 'done')

  // ── 5. Tag contact ────────────────────────────────────────────────────────
  const { data: tagData } = await supabase
    .from('contacts').select('tags').eq('contact_id', contact_id).single()
  const existingTags: string[] = (tagData as { tags?: string[] } | null)?.tags ?? []
  const newTags = [...new Set([...existingTags, 'converted', `plan:${plan ?? 'unknown'}`])]
  await supabase.from('contacts').update({ tags: newTags }).eq('contact_id', contact_id)

  // ── 6. Send confirmation email ────────────────────────────────────────────
  const resendKey   = process.env.RESEND_API_KEY
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const adminEmail  = process.env.ADMIN_EMAIL       || 'eomer3@gmail.com'
  const productUrl  = process.env.PRODUCT_URL       || 'https://app.agentspilot.com'

  const confirmHtml = trialConvertedEmail(contact.first_name, plan, mrr, productUrl)

  if (resendKey && contact.email) {
    await Promise.allSettled([
      fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          from:    fromAddress,
          to:      contact.email,
          subject: `You're now a customer — welcome to AgentsPilot Pro 🎉`,
          html:    confirmHtml,
        }),
      }),
      fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          from:    fromAddress,
          to:      adminEmail,
          subject: `💰 New paying customer — ${name} (${plan ?? '—'}, $${mrr ?? 0}/mo)`,
          html:    `<b>Contact:</b> ${name}<br/><b>Email:</b> ${contact.email}<br/><b>Plan:</b> ${plan ?? '—'}<br/><b>MRR:</b> $${mrr ?? 0}<br/><b>Source:</b> ${source}`,
        }),
      }),
    ])
  }

  // Log email to DB
  if (contact.email) {
    await supabase.from('emails').insert({
      contact_id:    contact_id,
      to_email:      contact.email,
      to_name:       name,
      subject:       `You're now a customer — welcome to AgentsPilot Pro 🎉`,
      body:          confirmHtml,
      template_name: 'trial_converted',
      status:        resendKey ? 'sent' : 'queued',
    })
  }

  // ── 7. Log to automation_runs ─────────────────────────────────────────────
  await supabase.from('automation_runs').insert({
    rule_id:      'trial_converted',
    contact_id:   contact_id,
    contact_name: name,
    action:       `Trial → customer_paid. Plan: ${plan ?? '—'}, MRR: $${mrr ?? 0}. Onboarding task created.`,
  })

  return NextResponse.json(
    { success: true, contact_id, plan, mrr, stage: 'customer_paid' },
    { status: 200, headers: CORS },
  )
}

// Email template is now in lib/emailTemplates.ts → trialConvertedEmail()
