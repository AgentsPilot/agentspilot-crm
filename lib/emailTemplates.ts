/**
 * AgentsPilot Email Templates
 * ─────────────────────────────────────────────────────────────────────────────
 * All outbound HTML emails. Dark branded design, founder-to-founder tone.
 *
 * Social links use placeholder URLs — update when real pages exist.
 * Demo link uses [DEMO_LINK] env var or falls back to placeholder text.
 */

const SITE_URL    = 'https://agentspilot.com'
const LINKEDIN    = 'https://linkedin.com/company/agentspilot'
const TWITTER     = 'https://twitter.com/agentspilot'
const FACEBOOK    = 'https://facebook.com/agentspilot'

/** Shared outer shell — logo header + social footer */
function shell(content: string, label?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">

      <!-- ── LOGO ── -->
      <tr><td style="padding:24px 40px;text-align:center;border-bottom:1px solid #1f1f1f;">
        <span style="font-size:16px;font-weight:800;color:#fff;letter-spacing:3px;text-transform:uppercase;">AGENTS&nbsp;<span style="color:#f97316;">PILOT</span></span>
        ${label ? `<p style="margin:4px 0 0;color:#52525b;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">${label}</p>` : ''}
      </td></tr>

      <!-- ── CONTENT ── -->
      ${content}

      <!-- ── FOOTER ── -->
      <tr><td style="padding:20px 40px 24px;text-align:center;border-top:1px solid #1f1f1f;background:#0d0d0d;">
        <p style="margin:0 0 14px;line-height:1;">
          <!-- AgentsPilot logo / site -->
          <a href="${SITE_URL}" style="display:inline-block;vertical-align:middle;margin:0 8px;text-decoration:none;" title="agentspilot.com">
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="4,2 20,12 4,22" fill="#f97316"/></svg>
          </a>
          <!-- LinkedIn -->
          <a href="${LINKEDIN}" style="display:inline-block;vertical-align:middle;margin:0 8px;text-decoration:none;" title="LinkedIn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#52525b" xmlns="http://www.w3.org/2000/svg"><path d="M19 0H5C2.239 0 0 2.239 0 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5V5c0-2.761-2.238-5-5-5zM8 19H5V8h3v11zM6.5 6.732c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zM20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476V19z"/></svg>
          </a>
          <!-- Twitter / X -->
          <a href="${TWITTER}" style="display:inline-block;vertical-align:middle;margin:0 8px;text-decoration:none;" title="Twitter / X">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#52525b" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <!-- Facebook -->
          <a href="${FACEBOOK}" style="display:inline-block;vertical-align:middle;margin:0 8px;text-decoration:none;" title="Facebook">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#52525b" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
        </p>
        <p style="margin:0;color:#3f3f46;font-size:11px;line-height:1.6;">
          © ${new Date().getFullYear()} AgentsPilot · Reply to unsubscribe.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
}

/** Orange pill badge */
function badge(text: string) {
  return `<span style="background:#f97316;color:#fff;font-size:10px;font-weight:700;border-radius:4px;padding:3px 8px;letter-spacing:.5px;text-transform:uppercase;">${text}</span>`
}

/** Primary CTA button */
function cta(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#f97316;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;">${label}</a>`
}

/** Secondary ghost button */
function ctaSecondary(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:transparent;color:#f97316;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;border:1px solid #f97316;">${label}</a>`
}

/** Dark stat card row (3 cols) */
function statRow(stats: { label: string; value: string; color?: string }[]) {
  const cells = stats.map(s => `
    <td style="padding:16px 20px;text-align:center;${stats.indexOf(s) < stats.length - 1 ? 'border-right:1px solid #2a2a2a;' : ''}">
      <p style="margin:0;color:#71717a;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">${s.label}</p>
      <p style="margin:4px 0 0;color:${s.color ?? '#fff'};font-size:20px;font-weight:700;">${s.value}</p>
    </td>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;margin-bottom:24px;"><tr>${cells}</tr></table>`
}

/** Timeline row */
function timelineRow(day: string, text: string, color = '#f97316', last = false) {
  return `<tr><td style="padding:14px 20px;${last ? '' : 'border-bottom:1px solid #1f1f1f;'}">
    <span style="color:${color};font-weight:700;font-size:13px;min-width:44px;display:inline-block;">${day}</span>
    <span style="color:#e4e4e7;font-size:13px;margin-left:10px;line-height:1.5;">${text}</span>
  </td></tr>`
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD — L1. FIRST CONTACT (24h after lead created, manual or auto)
// ─────────────────────────────────────────────────────────────────────────────
export function leadFirstContactEmail(firstName: string, trialUrl: string): string {
  return shell(`
    <tr><td style="padding:36px 40px 8px;">
      <p style="margin:0 0 4px;color:#6366f1;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Lead · First Touch</p>
      <h2 style="margin:0 0 20px;color:#fff;font-size:24px;font-weight:800;line-height:1.3;">
        Hey ${firstName} — wanted to reach out personally.
      </h2>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        I saw you came across AgentsPilot and wanted to say hi before you got lost in your inbox.
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        We built AgentsPilot for founders who are doing sales themselves — managing leads in spreadsheets, forgetting follow-ups, losing deals that were almost closed.
      </p>
      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        If that sounds familiar, a 14-day free trial takes 2 minutes to start. No credit card, no sales call, no obligation.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;border:1px solid #2a2a4a;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        ${timelineRow('Add a lead', 'Contact goes straight into your CRM', '#6366f1')}
        ${timelineRow('Wait 24h',   'Follow-up email fires automatically',  '#6366f1')}
        ${timelineRow('7 days',     'No reply? CRM nudges them again',       '#6366f1')}
        ${timelineRow('Signed up?', 'Trial stage begins, activation task created', '#22c55e', true)}
      </table>

      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        Reply to this email if you have any questions — I read every one.
      </p>
    </td></tr>

    <tr><td style="padding:8px 40px 32px;text-align:center;">
      ${cta(trialUrl, 'Start my free trial →')}
      <p style="margin:20px 0 0;color:#52525b;font-size:12px;">No credit card · Cancel anytime · Takes 2 minutes</p>
    </td></tr>
  `, 'First Contact')
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD — L2. DAY 7 REMINDER (still no trial signup)
// ─────────────────────────────────────────────────────────────────────────────
export function leadReminder7dEmail(firstName: string, trialUrl: string): string {
  return shell(`
    <tr><td style="padding:36px 40px 8px;">
      <p style="margin:0 0 4px;color:#6366f1;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Lead · Day 7</p>
      <h2 style="margin:0 0 20px;color:#fff;font-size:24px;font-weight:800;line-height:1.3;">
        Still thinking it over, ${firstName}?
      </h2>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        I get it — you're busy, and adding another tool to your stack is a real decision.
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        So let me make it simple. Here's what most founders tell me after their first week:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        <tr><td style="padding:18px 24px;border-bottom:1px solid #1f1f1f;">
          <p style="margin:0 0 4px;color:#6366f1;font-size:13px;font-weight:700;">"I stopped losing deals."</p>
          <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5;">The 24h follow-up alone recovered 2 leads who would have gone cold.</p>
        </td></tr>
        <tr><td style="padding:18px 24px;border-bottom:1px solid #1f1f1f;">
          <p style="margin:0 0 4px;color:#6366f1;font-size:13px;font-weight:700;">"My pipeline actually moves now."</p>
          <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5;">Leads transition automatically. I see the dashboard update without doing anything.</p>
        </td></tr>
        <tr><td style="padding:18px 24px;">
          <p style="margin:0 0 4px;color:#6366f1;font-size:13px;font-weight:700;">"It took 10 minutes to set up."</p>
          <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5;">Add 3 contacts, enable one rule, check the dashboard tomorrow.</p>
        </td></tr>
      </table>

      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        Your free trial is still available. 14 days, full access, no credit card.
      </p>
    </td></tr>

    <tr><td style="padding:8px 40px 32px;text-align:center;">
      ${cta(trialUrl, 'Start my free trial →')}
      <p style="margin:16px 0 0;color:#71717a;font-size:13px;">Or just reply — I'm happy to answer any questions directly.</p>
    </td></tr>
  `, 'Day 7 · No Response')
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD — L3. DAY 21 FINAL REMINDER (last message before going cold)
// ─────────────────────────────────────────────────────────────────────────────
export function leadReminder21dEmail(firstName: string, trialUrl: string): string {
  return shell(`
    <tr><td style="padding:36px 40px 32px;">
      <p style="margin:0 0 4px;color:#71717a;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Lead · Day 21 · Last message</p>
      <h2 style="margin:0 0 24px;color:#fff;font-size:24px;font-weight:800;line-height:1.3;">
        Last message from me, ${firstName}. Promise.
      </h2>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        We don't want to fill your inbox. So this is the last email we'll send — unless you decide to start a trial.
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        If the timing isn't right, that's completely fine. No hard feelings.
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        If you're still curious about what AgentsPilot does — the 14-day trial is still there. Full access, no card required.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 6px;color:#71717a;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">What's included in the free trial</p>
          <p style="margin:0;color:#e4e4e7;font-size:14px;line-height:1.8;">
            ✓&nbsp; Full CRM — unlimited contacts<br/>
            ✓&nbsp; Lifecycle automations — follow-up, reminders, alerts<br/>
            ✓&nbsp; Dashboard — lead → trial → paid, live<br/>
            ✓&nbsp; 14 days, no credit card, cancel anytime
          </p>
        </td></tr>
      </table>

      <div style="text-align:center;">
        ${cta(trialUrl, 'Start my free trial →')}
        <p style="margin:20px 0 0;color:#52525b;font-size:12px;">
          After this, we'll stop emailing — but you can always come back.
        </p>
      </div>
    </td></tr>
  `, 'Day 21 · Final Nudge')
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD — L4. COLD (manual — sent when lead is marked cold after 30d)
// ─────────────────────────────────────────────────────────────────────────────
export function leadColdEmail(firstName: string, trialUrl: string): string {
  return shell(`
    <tr><td style="padding:36px 40px 32px;">
      <p style="margin:0 0 4px;color:#52525b;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Lead · Closing the loop</p>
      <h2 style="margin:0 0 24px;color:#fff;font-size:24px;font-weight:800;line-height:1.3;">
        Marking this one as closed, ${firstName}.
      </h2>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        You've been in my pipeline for a while and I haven't heard back — so I'm going to stop following up. No hard feelings at all.
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        If the timing wasn't right, or you ended up going in a different direction — that's completely fine. Building something real takes a lot of decisions.
      </p>
      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        If you ever change your mind, your spot is here. The trial link below still works — no setup required, you'd pick up where you left off.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 6px;color:#52525b;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">The door is always open</p>
          <p style="margin:0;color:#e4e4e7;font-size:14px;line-height:1.7;">
            ✓&nbsp; Free 14-day trial — full access<br/>
            ✓&nbsp; No credit card needed<br/>
            ✓&nbsp; No onboarding call, no pressure
          </p>
        </td></tr>
      </table>

      <div style="text-align:center;">
        ${ctaSecondary(trialUrl, 'Start a trial when you\'re ready')}
        <p style="margin:20px 0 0;color:#52525b;font-size:12px;">
          Wishing you the best with whatever you're building.
        </p>
      </div>
    </td></tr>
  `, 'Closing the Loop')
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DAY 0 — WELCOME (on signup)
// ─────────────────────────────────────────────────────────────────────────────
export function trialWelcomeEmail(
  firstName: string,
  trialExpiresDate: string,
  productUrl: string,
): string {
  const demoLink = process.env.DEMO_VIDEO_URL || '#'
  return shell(`
    <tr><td style="padding:36px 40px 8px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:28px;line-height:64px;">🚀</div>
      <h1 style="margin:0 0 8px;color:#fff;font-size:26px;font-weight:800;line-height:1.2;">Your 14-day trial just started, ${firstName}.</h1>
      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        I'm glad you're here. AgentsPilot was built for founders who are tired of managing leads in spreadsheets and missing follow-ups.<br/><br/>
        You have full access until <strong style="color:#e4e4e7;">${trialExpiresDate}</strong>. Let's make it count.
      </p>
      ${statRow([
        { label: 'Trial days',   value: '14',            color: '#f97316' },
        { label: 'Contacts',     value: 'Unlimited',     color: '#22c55e' },
        { label: 'Automations',  value: 'All included',  color: '#a78bfa' },
      ])}
    </td></tr>

    <tr><td style="padding:0 40px 8px;">
      <p style="margin:0 0 16px;color:#e4e4e7;font-size:15px;font-weight:600;">Start here — takes 10 minutes:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:18px 20px;margin-bottom:8px;">
          <p style="margin:0 0 5px;">${badge('Step 1')}</p>
          <p style="margin:4px 0 2px;color:#e4e4e7;font-size:14px;font-weight:600;">Add your first contact</p>
          <p style="margin:0;color:#71717a;font-size:13px;">Contacts → Add Contact. Name, email, channel. Done in 30 seconds.</p>
        </td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:18px 20px;">
          <p style="margin:0 0 5px;">${badge('Step 2')}</p>
          <p style="margin:4px 0 2px;color:#e4e4e7;font-size:14px;font-weight:600;">Turn on one automation</p>
          <p style="margin:0;color:#71717a;font-size:13px;">Settings → Automations → enable "24h lead follow-up". The system does the rest.</p>
        </td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:18px 20px;">
          <p style="margin:0 0 5px;">${badge('Step 3')}</p>
          <p style="margin:4px 0 2px;color:#e4e4e7;font-size:14px;font-weight:600;">Watch the dashboard</p>
          <p style="margin:0;color:#71717a;font-size:13px;">Lead → Trial → Paid. One live view, no manual updates needed.</p>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:28px 40px 32px;text-align:center;">
      ${cta(productUrl, 'Open AgentsPilot →')}
      <p style="margin:14px 0 0;">${ctaSecondary(demoLink, '▶ Watch 2-min demo')}</p>
      <p style="margin:20px 0 0;color:#52525b;font-size:12px;">Any questions? Reply to this email — I read every one.</p>
    </td></tr>
  `, 'Trial Started')
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DAY 1 — GET STARTED
// ─────────────────────────────────────────────────────────────────────────────
export function trialDay1Email(firstName: string, productUrl: string): string {
  const demoLink = process.env.DEMO_VIDEO_URL || '#'
  return shell(`
    <tr><td style="padding:36px 40px 8px;">
      <p style="margin:0 0 4px;color:#f97316;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Day 1 · Your trial</p>
      <h2 style="margin:0 0 20px;color:#fff;font-size:24px;font-weight:800;line-height:1.3;">
        Let's get you 10 minutes of real value, ${firstName}.
      </h2>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        I know what day 1 of a new tool feels like — you're curious, but everything is competing for your attention. So I'll keep this short.
      </p>
      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        Here's the one thing that will make the next 13 days worth it:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1a0a;border:1px solid #1a3a1a;border-radius:12px;padding:0;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 6px;color:#22c55e;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">The one action</p>
          <p style="margin:0 0 8px;color:#e4e4e7;font-size:16px;font-weight:700;">Add 3 leads and enable the follow-up automation.</p>
          <p style="margin:0;color:#a1a1aa;font-size:14px;line-height:1.6;">
            That's it. AgentsPilot will send the first follow-up, remind you at 7 days, and flag anyone who goes cold — all automatically. You just watch the dashboard.
          </p>
        </td></tr>
      </table>

      <p style="margin:0 0 16px;color:#e4e4e7;font-size:14px;font-weight:600;">How to do it in 3 steps:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
          <p style="margin:0 0 4px;">${badge('Step 1')}</p>
          <p style="margin:3px 0;color:#e4e4e7;font-size:14px;font-weight:600;">Contacts → Add Contact</p>
          <p style="margin:0;color:#71717a;font-size:13px;">Add name, email, channel (LinkedIn / Twitter / etc.). 30 seconds each.</p>
        </td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:16px 20px;">
          <p style="margin:0 0 4px;">${badge('Step 2')}</p>
          <p style="margin:3px 0;color:#e4e4e7;font-size:14px;font-weight:600;">Settings → Automations → enable "24h follow-up"</p>
          <p style="margin:0;color:#71717a;font-size:13px;">One toggle. It handles the follow-up sequence from there.</p>
        </td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:16px 20px;">
          <p style="margin:0 0 4px;">${badge('Step 3')}</p>
          <p style="margin:3px 0;color:#e4e4e7;font-size:14px;font-weight:600;">Check the Dashboard tomorrow</p>
          <p style="margin:0;color:#71717a;font-size:13px;">You'll see your pipeline move. Lead → Trial → Paid. No spreadsheet, no manual tracking.</p>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:28px 40px 32px;text-align:center;">
      ${cta(productUrl, 'Get started now →')}
      <p style="margin:14px 0 0;">${ctaSecondary(demoLink, '▶ Watch 2-min demo')}</p>
      <p style="margin:20px 0 0;color:#52525b;font-size:12px;">Reply if you get stuck — I respond personally.</p>
    </td></tr>
  `, 'Day 1')
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DAY 3 — USE CASE STORY
// ─────────────────────────────────────────────────────────────────────────────
export function trialDay3Email(firstName: string, productUrl: string): string {
  return shell(`
    <tr><td style="padding:36px 40px 8px;">
      <p style="margin:0 0 4px;color:#f97316;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Day 3 · Real use case</p>
      <h2 style="margin:0 0 20px;color:#fff;font-size:23px;font-weight:800;line-height:1.3;">
        How a solo founder closed 3 customers in 14 days.
      </h2>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        Hey ${firstName},
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        A founder I know — building a B2B SaaS, doing everything himself — told me he was spending 3 hours a week just tracking who to follow up with. Sound familiar?
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        Here's exactly what happened when he set up AgentsPilot:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        ${timelineRow('Day 0',  'Lead signs up from his LinkedIn post → lands in CRM automatically. Zero manual entry.')}
        ${timelineRow('Day 1',  'System sends 24h follow-up email. Founder is on a call — doesn\'t even know it happened.')}
        ${timelineRow('Day 7',  'Lead hasn\'t replied. CRM auto-flags "7-day no response" → second email fires + task created.')}
        ${timelineRow('Day 9',  'Lead clicks the trial link from email 2 → enters customer_trial stage automatically.')}
        ${timelineRow('Day 11', 'Trial expiry warning sent. Conversion task appears in the founder\'s dashboard.')}
        ${timelineRow('Day 14', '💰 Trial converts to paid. MRR updated, task closed. Founder spent 0 minutes on this lead.', '#22c55e', true)}
      </table>

      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        The entire flow above ran automatically. He closed 3 customers in the same 2-week window — and only touched the CRM to see the dashboard update.
      </p>
      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        Want me to walk you through replicating this exact setup for your leads? Reply and I'll book 15 minutes with you.
      </p>
    </td></tr>

    <tr><td style="padding:8px 40px 32px;text-align:center;">
      ${cta(productUrl, 'See my pipeline →')}
      <p style="margin:20px 0 0;color:#52525b;font-size:12px;">11 days left in your trial · Questions? Just reply.</p>
    </td></tr>
  `, 'Day 3')
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DAY 7 — MIDPOINT CHECK-IN
// ─────────────────────────────────────────────────────────────────────────────
export function trialDay7Email(firstName: string, productUrl: string): string {
  return shell(`
    <tr><td style="padding:36px 40px 8px;">
      <p style="margin:0 0 4px;color:#a78bfa;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Day 7 · Midpoint</p>
      <h2 style="margin:0 0 20px;color:#fff;font-size:24px;font-weight:800;line-height:1.3;">
        You're halfway through. Here's what I want you to know.
      </h2>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        Hey ${firstName},
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        7 days in. Whether you've been deep in AgentsPilot or barely had time to log in — I want to make sure the next 7 days are worth it.
      </p>

      <p style="margin:0 0 12px;color:#e4e4e7;font-size:14px;font-weight:600;">Quick check — have you done these?</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:14px 20px;margin-bottom:6px;">
          <span style="color:#22c55e;font-size:16px;margin-right:10px;">☑</span>
          <span style="color:#e4e4e7;font-size:14px;">Added your first contacts to the CRM</span>
        </td></tr>
        <tr><td style="height:6px;"></td></tr>
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:14px 20px;">
          <span style="color:#71717a;font-size:16px;margin-right:10px;">☐</span>
          <span style="color:#a1a1aa;font-size:14px;">Turned on at least one automation rule</span>
        </td></tr>
        <tr><td style="height:6px;"></td></tr>
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:14px 20px;">
          <span style="color:#71717a;font-size:16px;margin-right:10px;">☐</span>
          <span style="color:#a1a1aa;font-size:14px;">Watched the pipeline move in the Dashboard</span>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d18;border:1px solid #2a2a4a;border-radius:12px;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 6px;color:#a78bfa;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">🔥 Feature you should try this week</p>
          <p style="margin:0 0 8px;color:#e4e4e7;font-size:15px;font-weight:700;">Automation Rules — set it once, forget it.</p>
          <p style="margin:0;color:#a1a1aa;font-size:14px;line-height:1.6;">
            Go to Settings → Automations. Enable the rules for your stage (lead follow-up, trial activation, at-risk alerts). The system runs every hour and handles transitions, emails, and tasks automatically. Most founders enable all of them in under 5 minutes.
          </p>
        </td></tr>
      </table>

      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        If you haven't activated yet — reply to this email. I'll personally walk you through the setup. Seriously, 15 minutes is enough to get your full pipeline running.
      </p>
    </td></tr>

    <tr><td style="padding:8px 40px 32px;text-align:center;">
      ${cta(productUrl, 'Check my automations →')}
      <p style="margin:20px 0 0;color:#52525b;font-size:12px;">7 days left · Reply any time — I read everything.</p>
    </td></tr>
  `, 'Day 7 · Midpoint')
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXPIRY WARNING — 3 days left
// ─────────────────────────────────────────────────────────────────────────────
export function trialExpiryEmail(firstName: string, productUrl: string): string {
  return shell(`
    <tr><td style="padding:36px 40px 8px;text-align:center;">
      <div style="display:inline-block;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:10px 20px;margin-bottom:24px;">
        <span style="color:#ef4444;font-size:13px;font-weight:700;letter-spacing:.5px;">⏳ 3 days left in your trial</span>
      </div>
      <h2 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:800;line-height:1.3;text-align:left;">
        ${firstName}, your trial ends in 3 days.
      </h2>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;text-align:left;">
        I want to be straight with you — after your trial ends, here's what happens:
      </p>
    </td></tr>

    <tr><td style="padding:0 40px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        <tr><td style="padding:14px 20px;border-bottom:1px solid #1f1f1f;">
          <span style="color:#ef4444;font-size:16px;margin-right:10px;">✗</span>
          <span style="color:#a1a1aa;font-size:14px;">Access to contacts and pipeline is paused</span>
        </td></tr>
        <tr><td style="padding:14px 20px;border-bottom:1px solid #1f1f1f;">
          <span style="color:#ef4444;font-size:16px;margin-right:10px;">✗</span>
          <span style="color:#a1a1aa;font-size:14px;">Automation rules stop running</span>
        </td></tr>
        <tr><td style="padding:14px 20px;border-bottom:1px solid #1f1f1f;">
          <span style="color:#ef4444;font-size:16px;margin-right:10px;">✗</span>
          <span style="color:#a1a1aa;font-size:14px;">Lifecycle emails and tasks won't fire</span>
        </td></tr>
        <tr><td style="padding:14px 20px;">
          <span style="color:#22c55e;font-size:16px;margin-right:10px;">✓</span>
          <span style="color:#a1a1aa;font-size:14px;">Your data is safe — we keep it for 30 days</span>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1a0a;border:1px solid #1a3a1a;border-radius:12px;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 8px;color:#22c55e;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Upgrade now to keep everything</p>
          <p style="margin:0 0 4px;color:#e4e4e7;font-size:15px;font-weight:700;">Full access · All automations · Unlimited contacts</p>
          <p style="margin:0;color:#a1a1aa;font-size:13px;">Pricing starts at a flat monthly rate — reply if you want to talk through which plan fits your stage.</p>
        </td></tr>
      </table>

      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        If you got value from the trial and just need a bit more time — reply and I'll see what I can do. I'd rather have you using the product than not.
      </p>
    </td></tr>

    <tr><td style="padding:8px 40px 32px;text-align:center;">
      ${cta(productUrl, 'Upgrade now →')}
      <p style="margin:16px 0 0;color:#71717a;font-size:13px;">Or reply to this email — happy to talk through it.</p>
    </td></tr>
  `, '⏳ Trial Ending Soon')
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. EXPIRED — win-back (plain, honest, human)
// ─────────────────────────────────────────────────────────────────────────────
export function trialExpiredEmail(firstName: string, productUrl: string): string {
  return shell(`
    <tr><td style="padding:36px 40px 32px;">
      <p style="margin:0 0 4px;color:#71717a;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Trial ended</p>
      <h2 style="margin:0 0 24px;color:#fff;font-size:24px;font-weight:800;line-height:1.3;">
        Your trial ended, ${firstName}. No hard feelings.
      </h2>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        You gave AgentsPilot a try — and I hope you found something useful in those 14 days, even if the timing wasn't right.
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        If you're still thinking about it, your data is safe and your account is ready to go the moment you decide to come back. Nothing to set up again.
      </p>
      <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        And if something didn't work for you — I'd genuinely love to hear it. Not to pitch you again, just to make the product better. Reply to this email and tell me what was missing.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 4px;color:#71717a;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">If you come back</p>
          <p style="margin:0;color:#e4e4e7;font-size:14px;line-height:1.6;">Your contacts, pipeline, and automation settings are all waiting. Reactivate anytime and pick up exactly where you left off.</p>
        </td></tr>
      </table>

      <div style="text-align:center;">
        ${cta(productUrl, 'Come back anytime →')}
        <p style="margin:20px 0 0;color:#52525b;font-size:12px;">
          This is the last email we'll send unless you reactivate.<br/>Thanks for giving AgentsPilot a shot.
        </p>
      </div>
    </td></tr>
  `, 'Trial Ended')
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONVERSION — welcome to paid
// ─────────────────────────────────────────────────────────────────────────────
export function trialConvertedEmail(
  firstName: string,
  plan: string | undefined,
  mrr: number | undefined,
  productUrl: string,
): string {
  return shell(`
    <tr><td style="padding:36px 40px 8px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:50%;display:inline-block;margin-bottom:20px;font-size:28px;line-height:64px;">🎉</div>
      <h2 style="margin:0 0 8px;color:#fff;font-size:26px;font-weight:800;">You're in, ${firstName}.</h2>
      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        Your trial just became a subscription. That means a lot — thank you for trusting AgentsPilot with your sales pipeline.
      </p>
      ${statRow([
        { label: 'Plan',    value: plan ?? 'Pro',      color: '#f97316' },
        { label: 'Monthly', value: `$${mrr ?? 0}/mo`,  color: '#22c55e' },
        { label: 'Status',  value: 'Active',           color: '#a78bfa' },
      ])}
    </td></tr>

    <tr><td style="padding:0 40px 24px;">
      <p style="margin:0 0 12px;color:#e4e4e7;font-size:14px;font-weight:600;">What happens next:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:16px 20px;margin-bottom:6px;">
          <p style="margin:0 0 3px;color:#22c55e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">✓ Already done</p>
          <p style="margin:0;color:#e4e4e7;font-size:14px;">Full access is active — all automations, unlimited contacts, full lifecycle view.</p>
        </td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:16px 20px;margin-bottom:6px;">
          <p style="margin:0 0 3px;color:#f97316;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Within 24 hours</p>
          <p style="margin:0;color:#e4e4e7;font-size:14px;">I'll reach out personally to make sure your setup is dialled in and you're getting full value from day one.</p>
        </td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:16px 20px;">
          <p style="margin:0 0 3px;color:#a78bfa;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Anytime</p>
          <p style="margin:0;color:#e4e4e7;font-size:14px;">Reply to this email — you now have direct access to the team. We're fast.</p>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:28px 40px 32px;text-align:center;">
      ${cta(productUrl, 'Open AgentsPilot →')}
      <p style="margin:20px 0 0;color:#52525b;font-size:12px;">Questions? Reply here — we respond same day.</p>
    </td></tr>
  `, '🎉 Welcome to AgentsPilot')
}
