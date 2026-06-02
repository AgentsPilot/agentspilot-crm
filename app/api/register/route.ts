/**
 * POST /api/register
 * ─────────────────────────────────────────────────────────────────────────────
 * Public trial-signup endpoint. Called from an external landing page.
 *
 * Body (JSON):
 *   first_name    string   required
 *   last_name     string   optional
 *   email         string   required
 *   company       string   optional
 *   phone         string   optional
 *   role          string   optional  (e.g. "Founder", "Head of Sales")
 *   utm_source    string   optional
 *   utm_medium    string   optional
 *   utm_campaign  string   optional
 *
 * Response:
 *   { success: true, contact_id: string, welcome_url: string }
 *   or
 *   { error: string }  with 4xx/5xx status
 *
 * CORS: allows any origin so the external site can POST directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { trialWelcomeEmail } from '@/lib/emailTemplates'

// Service role key so we can write without RLS restrictions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ── Preflight ─────────────────────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// ── Registration ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 0. Parse & validate ──────────────────────────────────────────────────
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: CORS_HEADERS })
  }

  const {
    first_name, last_name, email, company, phone, role,
    utm_source, utm_medium, utm_campaign,
  } = body

  if (!first_name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: 'first_name and email are required' },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const cleanEmail   = email.trim().toLowerCase()
  const firstName    = first_name.trim()
  const lastName     = last_name?.trim() || null
  const contactName  = [firstName, lastName].filter(Boolean).join(' ')

  // ── 1. Deduplicate by email ──────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('contacts')
    .select('contact_id, first_name, last_name')
    .eq('email', cleanEmail)
    .maybeSingle()

  let contactId: string

  if (existing) {
    // Already in CRM — upgrade them to trial (idempotent)
    contactId = existing.contact_id

    await supabase.from('contacts').update({
      phone:        phone?.trim()    || null,
      company:      company?.trim()  || null,
      notes:        role ? `Role: ${role.trim()}` : null,
      utm_source:   utm_source       || null,
      utm_medium:   utm_medium       || null,
      utm_campaign: utm_campaign     || null,
      source:       'web',
    }).eq('contact_id', contactId)

  } else {
    // ── New contact ────────────────────────────────────────────────────────
    const { data: newContact, error: insertErr } = await supabase
      .from('contacts')
      .insert({
        first_name:       firstName,
        last_name:        lastName,
        email:            cleanEmail,
        phone:            phone?.trim()    || null,
        company:          company?.trim()  || null,
        notes:            role ? `Role: ${role.trim()}` : null,
        source:           'web',
        utm_source:       utm_source   || 'direct',
        utm_medium:       utm_medium   || 'organic',
        utm_campaign:     utm_campaign || null,
        acquisition_type: 'direct_trial',
        timezone:         'UTC',
      })
      .select('contact_id')
      .single()

    if (insertErr || !newContact) {
      console.error('[register] contact insert error:', insertErr)
      return NextResponse.json(
        { error: insertErr?.message ?? 'Failed to create contact' },
        { status: 500, headers: CORS_HEADERS },
      )
    }
    contactId = newContact.contact_id
  }

  // ── 2. Check current stage to set from_stage/from_state ──────────────────
  const { data: currentStage } = await supabase
    .from('contacts_current')
    .select('stage, state')
    .eq('contact_id', contactId)
    .maybeSingle()

  // Don't insert a duplicate trial stage row if they're already in trial
  if (currentStage?.stage !== 'customer_trial') {
    const now      = new Date()
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const { error: stageErr } = await supabase.from('contact_stages').insert({
      contact_id:       contactId,
      stage:            'customer_trial',
      state:            'active',
      from_stage:       currentStage?.stage ?? null,
      from_state:       currentStage?.state ?? null,
      trial_started_at: now.toISOString(),
      trial_expires_at: trialEnd.toISOString(),
      changed_by:       'web_signup',
      notes:            existing
        ? 'Lead upgraded to trial via web signup'
        : 'New trial signup from web',
    })

    if (stageErr) {
      console.error('[register] stage insert error:', stageErr)
      // Don't fail the request — contact was created, log and continue
    }
  }

  // ── 3. Create onboarding task ─────────────────────────────────────────────
  // Close any open Lead Follow-up tasks (they signed up, lead work is done)
  if (existing) {
    await supabase
      .from('tasks')
      .update({ status: 'done' })
      .eq('contact_id', contactId)
      .eq('type', 'Lead Follow-up')
      .neq('status', 'done')
  }

  // Only create a Trial Activation task if one doesn't already exist
  const { data: existingTask } = await supabase
    .from('tasks')
    .select('id')
    .eq('contact_id', contactId)
    .eq('type', 'Trial Activation')
    .limit(1)

  if (!existingTask?.length) {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)   // due tomorrow — activate quickly

    await supabase.from('tasks').insert({
      contact_id:   contactId,
      contact_name: contactName,
      title:        `Trial Activation — ${contactName}`,
      type:         'Trial Activation',
      priority:     'High',
      due_date:     dueDate.toISOString().split('T')[0],
      status:       'open',
      notes:        [
        `New trial signup via web.`,
        company ? `Company: ${company}` : null,
        role    ? `Role: ${role}`       : null,
        utm_source ? `Source: ${utm_source}` : null,
      ].filter(Boolean).join(' | '),
    })
  }

  // ── 4. Send welcome email + admin notification ────────────────────────────
  const resendKey   = process.env.RESEND_API_KEY
  const fromAddress = process.env.RESEND_FROM_EMAIL  || 'onboarding@resend.dev'
  const adminEmail  = process.env.ADMIN_EMAIL        || 'eomer3@gmail.com'
  const productUrl  = process.env.PRODUCT_URL        || 'https://app.agentspilot.com'

  const trialEndFormatted = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const welcomeHtml = trialWelcomeEmail(firstName, trialEndFormatted, productUrl)

  if (resendKey) {
    await Promise.allSettled([
      // Welcome to user
      fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          from:    fromAddress,
          to:      cleanEmail,
          subject: `Welcome to AgentsPilot 🎉 — your 14-day trial has started`,
          html:    welcomeHtml,
        }),
      }),
      // Notification to admin
      fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          from:    fromAddress,
          to:      adminEmail,
          subject: `🚀 New trial signup — ${contactName}`,
          html:    `<b>Name:</b> ${contactName}<br/><b>Email:</b> ${cleanEmail}<br/><b>Company:</b> ${company || '—'}<br/><b>Role:</b> ${role || '—'}<br/><b>Source:</b> ${utm_source || 'direct'}`,
        }),
      }),
    ])
  }

  // Log email to DB regardless (so Timeline shows it)
  await supabase.from('emails').insert({
    contact_id:    contactId,
    to_email:      cleanEmail,
    to_name:       contactName,
    subject:       `Welcome to AgentsPilot 🎉 — your 14-day trial has started`,
    body:          welcomeHtml,
    template_name: 'trial_welcome_day0',
    status:        resendKey ? 'sent' : 'queued',
  })

  // ── 5. Log automation run ─────────────────────────────────────────────────
  await supabase.from('automation_runs').insert({
    rule_id:      'trial_signup_welcome',
    contact_id:   contactId,
    contact_name: contactName,
    action:       'Trial started. Welcome email sent. Activation task created.',
  })

  // ── 6. Respond ────────────────────────────────────────────────────────────
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  const welcomeUrl = `${appUrl}/trial/welcome?name=${encodeURIComponent(firstName)}&expires=${encodeURIComponent(trialEndFormatted)}`

  return NextResponse.json(
    { success: true, contact_id: contactId, welcome_url: welcomeUrl },
    { status: 200, headers: CORS_HEADERS },
  )
}

// Email template is now in lib/emailTemplates.ts → trialWelcomeEmail()
