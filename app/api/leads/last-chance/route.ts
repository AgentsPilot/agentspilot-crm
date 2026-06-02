import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const trialUrl    = process.env.TRIAL_SIGNUP_URL || 'https://agentspilot-marketing.vercel.app/signup'
const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const resendKey   = process.env.RESEND_API_KEY

function lastChanceHtml(firstName: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:2px;">
            AGENTS <span style="color:#f97316;">PILOT</span>
          </span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#111;border-radius:16px;border:1px solid #2a2a2a;padding:48px 40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:16px;">🚀</div>
          <h1 style="margin:0 0 12px;color:#ffffff;font-size:28px;font-weight:800;line-height:1.2;">
            One last thing, <span style="color:#f97316;">${firstName}</span>
          </h1>
          <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;max-width:420px;margin:0 auto 24px;">
            We've been quiet — but we haven't forgotten you.<br/>
            AgentsPilot automates your entire lead pipeline,
            from first contact to paying customer, without a single manual step.
          </p>

          <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px 24px;margin:24px 0;text-align:left;">
            <div style="display:flex;align-items:center;margin-bottom:12px;">
              <span style="font-size:18px;margin-right:10px;">⚡</span>
              <span style="color:#fff;font-size:13px;font-weight:600;">What you get — free for 14 days</span>
            </div>
            <ul style="margin:0;padding-left:0;list-style:none;color:#a1a1aa;font-size:13px;line-height:2;">
              <li>✓ &nbsp;Automatic lead follow-up emails</li>
              <li>✓ &nbsp;Trial activation &amp; expiry sequences</li>
              <li>✓ &nbsp;Real-time funnel analytics</li>
              <li>✓ &nbsp;No credit card · Cancel anytime</li>
            </ul>
          </div>

          <a href="${trialUrl}"
            style="display:inline-block;background:#f97316;color:#ffffff;font-size:16px;font-weight:700;
                   text-decoration:none;padding:16px 44px;border-radius:10px;letter-spacing:0.5px;margin-top:8px;">
            Start Free Trial →
          </a>

          <p style="margin:24px 0 0;color:#3f3f46;font-size:12px;line-height:1.6;">
            This is our last email to you — no hard feelings if it's not the right time.<br/>
            You can always come back at <a href="${trialUrl}" style="color:#52525b;">${trialUrl.replace('https://','')}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="margin:0;color:#3f3f46;font-size:11px;">
            AgentsPilot · <a href="mailto:support@agentspilot.com" style="color:#52525b;">support@agentspilot.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendLastChance(contactId: string): Promise<{ ok: boolean; reason?: string }> {
  // Get contact
  const { data: contact } = await supabase
    .from('contacts_current')
    .select('contact_id,first_name,last_name,email,stage,state')
    .eq('contact_id', contactId)
    .single()

  if (!contact) return { ok: false, reason: 'not found' }
  if (contact.stage !== 'lead' || contact.state !== 'cold')
    return { ok: false, reason: 'not a cold lead' }

  // Skip if last-chance already sent
  const { data: already } = await supabase
    .from('emails')
    .select('id')
    .eq('contact_id', contactId)
    .eq('template_name', 'lead_last_chance')
    .limit(1)
  if (already?.length) return { ok: false, reason: 'already sent' }

  const name    = [contact.first_name, contact.last_name].filter(Boolean).join(' ')
  const subject = `One last thing, ${contact.first_name} — your free trial is still waiting`
  const html    = lastChanceHtml(contact.first_name)

  // Send via Resend
  let status: 'sent' | 'queued' | 'failed' = 'queued'
  if (resendKey) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ from: fromAddress, to: contact.email, subject, html }),
      })
      status = r.ok ? 'sent' : 'failed'
      if (!r.ok) console.error('[last-chance]', await r.text())
    } catch (e) {
      status = 'failed'
    }
  }

  // Log email
  await supabase.from('emails').insert({
    contact_id:    contactId,
    to_email:      contact.email,
    to_name:       name,
    subject,
    body:          html,
    template_name: 'lead_last_chance',
    status,
  })

  // Timeline note
  await supabase.from('contact_stages').insert({
    contact_id:  contactId,
    stage:       'lead',
    state:       'cold',
    from_stage:  'lead',
    from_state:  'cold',
    changed_by:  'manual',
    notes:       'Last chance email sent manually',
  })

  return { ok: true }
}

// POST /api/leads/last-chance
// Body: { contact_id: string } or { all: true }
export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.all) {
    // Send to all cold leads that haven't received last-chance yet
    const { data: coldLeads } = await supabase
      .from('contacts_current')
      .select('contact_id')
      .eq('stage', 'lead')
      .eq('state', 'cold')

    let sent = 0, skipped = 0
    for (const lead of coldLeads ?? []) {
      const result = await sendLastChance(lead.contact_id)
      result.ok ? sent++ : skipped++
    }
    return NextResponse.json({ success: true, sent, skipped })
  }

  if (body.contact_id) {
    const result = await sendLastChance(body.contact_id)
    return NextResponse.json(result.ok
      ? { success: true }
      : { success: false, reason: result.reason },
      { status: result.ok ? 200 : 400 }
    )
  }

  return NextResponse.json({ error: 'contact_id or all required' }, { status: 400 })
}
