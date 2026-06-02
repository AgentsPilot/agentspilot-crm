import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const {
    first_name, last_name, full_name,
    email, phone, company,
    utm_source, utm_medium, utm_campaign,
    source,        // 'web' | 'social' | 'manual'
    country, timezone,
    trial_started_at, trial_expires_at,
  } = await req.json()

  // Support both first_name/last_name and legacy full_name
  const firstName = first_name || full_name?.split(' ')[0] || ''
  const lastName  = last_name  || full_name?.split(' ').slice(1).join(' ') || ''

  if (!firstName || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const isWebSignup    = source === 'web' || !!trial_started_at
  const cleanEmail     = email.trim().toLowerCase()

  // ── 1. Check if lead already exists with this email ──────────────────────
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('contact_id, first_name, last_name')
    .eq('email', cleanEmail)
    .single()

  let contact: { contact_id: string }

  if (existingContact) {
    // ── Existing lead upgrading to trial ────────────────────────────────────
    contact = existingContact

    if (!isWebSignup) {
      // Pure lead re-submit — already exists, return success silently
      return NextResponse.json({ success: true, contact_id: contact.contact_id, existing: true })
    }

    // Update contact details in case they filled in more info
    await supabase.from('contacts').update({
      phone:        phone?.trim()    || null,
      company:      company?.trim()  || null,
      country:      country          || null,
      utm_source:   utm_source       || null,
      utm_medium:   utm_medium       || null,
      utm_campaign: utm_campaign     || null,
      source:       'web',
    }).eq('contact_id', contact.contact_id)

  } else {
    // ── New contact ──────────────────────────────────────────────────────────
    const { data: newContact, error: contactErr } = await supabase
      .from('contacts')
      .insert({
        first_name:       firstName.trim(),
        last_name:        lastName?.trim() || null,
        email:            cleanEmail,
        phone:            phone?.trim()    || null,
        company:          company?.trim()  || null,
        source:           isWebSignup ? 'web' : (source || 'manual'),
        utm_source:       utm_source   || (isWebSignup ? 'landing_page' : null),
        utm_medium:       utm_medium   || (isWebSignup ? 'organic'      : null),
        utm_campaign:     utm_campaign || null,
        country:          country      || null,
        timezone:         timezone     || 'UTC',
        acquisition_type: isWebSignup ? 'direct_trial' : 'lead_nurtured',
        lead_score:       isWebSignup ? null : 50,  // leads start at 50; rises/falls with cron rules
      })
      .select('contact_id')
      .single()

    if (contactErr || !newContact) {
      return NextResponse.json({ error: contactErr?.message ?? 'Insert failed' }, { status: 500 })
    }
    contact = newContact
  }

  // ── 2. Insert stage row ──────────────────────────────────────────────────
  const now        = new Date()
  const trialStart = trial_started_at ? new Date(trial_started_at) : now
  const trialEnd   = trial_expires_at
    ? new Date(trial_expires_at)
    : new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000)

  // Get current stage to use as from_stage/from_state
  const { data: currentStage } = await supabase
    .from('contacts_current')
    .select('stage,state')
    .eq('contact_id', contact.contact_id)
    .single()

  await supabase.from('contact_stages').insert({
    contact_id:       contact.contact_id,
    stage:            isWebSignup ? 'customer_trial' : 'lead',
    state:            isWebSignup ? 'active'         : 'new',
    from_stage:       currentStage?.stage ?? null,
    from_state:       currentStage?.state ?? null,
    trial_started_at: isWebSignup ? trialStart.toISOString() : null,
    trial_expires_at: isWebSignup ? trialEnd.toISOString()   : null,
    changed_by:       'api',
    notes:            existingContact && isWebSignup ? 'Lead upgraded to trial via web signup' : null,
  })

  // ── 3. Auto-create task ──────────────────────────────────────────────────
  const contactName = `${firstName} ${lastName}`.trim()
  const dueDate     = new Date()
  dueDate.setDate(dueDate.getDate() + 2)

  if (isWebSignup && existingContact) {
    // Existing lead upgraded to trial:
    // Mark their Lead Follow-up as done + create Trial Activation task
    await supabase.from('tasks')
      .update({ status: 'done' })
      .eq('contact_id', contact.contact_id)
      .eq('type', 'Lead Follow-up')
      .neq('status', 'done')

    // Only create Trial Activation if not already exists
    const { data: existingTA } = await supabase.from('tasks')
      .select('id').eq('contact_id', contact.contact_id).eq('type', 'Trial Activation').limit(1)
    if (!existingTA?.length) {
      await supabase.from('tasks').insert({
        contact_id: contact.contact_id, contact_name: contactName,
        title: `Trial Activation — ${contactName}`, type: 'Trial Activation',
        priority: 'High', due_date: dueDate.toISOString().split('T')[0],
        status: 'open', alarm_triggered: false,
        notes: `Upgraded from lead. Source: ${utm_source || source || 'web'}`,
      })
    }
  } else {
    // Fresh contact (new lead or new trial signup)
    await supabase.from('tasks').insert({
      contact_id:      contact.contact_id,
      contact_name:    contactName,
      title:           isWebSignup ? `Trial Activation — ${contactName}` : `Lead Follow-up — ${contactName}`,
      type:            isWebSignup ? 'Trial Activation' : 'Lead Follow-up',
      priority:        'High',
      due_date:        dueDate.toISOString().split('T')[0],
      status:          'open',
      alarm_triggered: false,
      notes:           `New ${isWebSignup ? 'trial signup' : 'lead'} from ${company || 'unknown'}. Source: ${utm_source || source || 'manual'}`,
    })
  }

  // ── 4. Send emails via Resend + log ──────────────────────────────────────
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const resendKey   = process.env.RESEND_API_KEY
  const adminEmail  = process.env.ADMIN_EMAIL || 'eomer3@gmail.com'

  const trialUrl     = process.env.TRIAL_SIGNUP_URL || 'https://agentspilot-marketing.vercel.app/signup'

  const welcomeSubject = isWebSignup
    ? `Welcome to AgentsPilot 🎉 — your 14-day trial has started`
    : `Welcome to AgentsPilot, ${firstName} — start your free trial`

  const leadWelcomeBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:10px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="4,2 20,12 4,22" fill="#f97316"/>
              </svg>
            </td>
            <td style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:2px;">
              AGENTS <span style="color:#f97316;">PILOT</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Hero banner -->
        <tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#111 50%,#1a0a00 100%);border-radius:16px 16px 0 0;padding:48px 40px 40px;text-align:center;border:1px solid #2a2a2a;border-bottom:none;">
          <div style="display:inline-block;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);border-radius:100px;padding:6px 16px;margin-bottom:20px;">
            <span style="color:#f97316;font-size:12px;font-weight:600;letter-spacing:1px;">🚀 FREE 14-DAY TRIAL</span>
          </div>
          <h1 style="margin:0 0 12px;color:#ffffff;font-size:32px;font-weight:800;line-height:1.2;">
            Welcome to AgentsPilot,<br/><span style="color:#f97316;">${firstName}!</span>
          </h1>
          <p style="margin:0;color:#a1a1aa;font-size:16px;line-height:1.6;max-width:400px;margin:0 auto;">
            The CRM built to turn leads into paying customers — automatically.
          </p>
        </td></tr>

        <!-- Features row -->
        <tr><td style="background:#111;border-left:1px solid #2a2a2a;border-right:1px solid #2a2a2a;padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="text-align:center;padding:0 8px;">
                <div style="font-size:28px;margin-bottom:8px;">🎯</div>
                <div style="color:#ffffff;font-size:13px;font-weight:600;margin-bottom:4px;">Lifecycle Tracking</div>
                <div style="color:#71717a;font-size:12px;line-height:1.5;">Lead → Trial → Paid, fully automated</div>
              </td>
              <td width="33%" style="text-align:center;padding:0 8px;">
                <div style="font-size:28px;margin-bottom:8px;">⚡</div>
                <div style="color:#ffffff;font-size:13px;font-weight:600;margin-bottom:4px;">Smart Automation</div>
                <div style="color:#71717a;font-size:12px;line-height:1.5;">Auto tasks &amp; emails at every stage</div>
              </td>
              <td width="33%" style="text-align:center;padding:0 8px;">
                <div style="font-size:28px;margin-bottom:8px;">📊</div>
                <div style="color:#ffffff;font-size:13px;font-weight:600;margin-bottom:4px;">Funnel Analytics</div>
                <div style="color:#71717a;font-size:12px;line-height:1.5;">Real-time conversion insights</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="background:#111;border-radius:0 0 16px 16px;padding:32px 40px 40px;text-align:center;border:1px solid #2a2a2a;border-top:1px solid #222;">
          <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.6;">
            Your free 14-day trial is just one click away.<br/>
            No credit card required. Cancel anytime.
          </p>
          <a href="${trialUrl}" style="display:inline-block;background:#f97316;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.5px;">
            Start My Free Trial →
          </a>
          <p style="margin:24px 0 0;color:#52525b;font-size:12px;">
            14 days free &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; Cancel anytime
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0;color:#3f3f46;font-size:12px;line-height:1.6;">
            You're receiving this because you requested a demo at agentspilot.com<br/>
            <a href="mailto:support@agentspilot.com" style="color:#52525b;text-decoration:none;">support@agentspilot.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const welcomeBody = isWebSignup
    ? `Hi ${firstName},<br/><br/>Welcome! Your 14-day free trial of AgentsPilot is now active.<br/><br/>Here's what you can do right now:<br/>• Track your leads through the lifecycle funnel<br/>• Set up automations for trial follow-ups<br/>• Monitor conversions in real time<br/><br/>Our team will reach out within 24 hours to help you get set up.<br/><br/>Questions? Just reply to this email.<br/><br/>— The AgentsPilot Team`
    : leadWelcomeBody

  async function sendAndLog(
    toEmail: string, toName: string,
    subject: string, body: string, templateName: string,
  ) {
    let emailStatus: 'sent' | 'queued' | 'failed' = 'queued'
    if (resendKey) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ from: fromAddress, to: toEmail, subject, html: body }),
        })
        emailStatus = r.ok ? 'sent' : 'failed'
        if (!r.ok) console.error('[email]', await r.text())
      } catch (e) {
        emailStatus = 'failed'
        console.error('[email]', e)
      }
    }
    await supabase.from('emails').insert([{
      contact_id:    contact!.contact_id,
      to_email:      toEmail,
      to_name:       toName,
      subject,
      body,
      template_name: templateName,
      status:        emailStatus,
    }])
  }

  await Promise.all([
    sendAndLog(
      email.trim().toLowerCase(), contactName,
      welcomeSubject, welcomeBody,
      isWebSignup ? 'Welcome to Trial' : 'lead_welcome',
    ),
    sendAndLog(
      adminEmail, 'Admin',
      `🚀 New ${isWebSignup ? 'trial signup' : 'lead'} — ${contactName}`,
      `Name: ${contactName}<br/>Email: ${email}<br/>Company: ${company || '—'}<br/>Source: ${utm_source || source || 'manual'}`,
      'lead_notification',
    ),
  ])

  // ── 5. Log to automation_runs ─────────────────────────────────────────────
  await supabase.from('automation_runs').insert({
    rule_id:      isWebSignup ? 'trial_signup_welcome' : 'new_lead_followup',
    contact_id:   contact.contact_id,
    contact_name: contactName,
    action:       isWebSignup
      ? 'Sent welcome trial email + Follow-up task created'
      : 'Sent welcome email + Follow-up task created',
  })

  return NextResponse.json({ success: true, contact_id: contact.contact_id })
}
