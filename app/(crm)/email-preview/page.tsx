'use client'

import { useState } from 'react'
import {
  leadFirstContactEmail,
  leadReminder7dEmail,
  leadReminder21dEmail,
  leadColdEmail,
  trialWelcomeEmail,
  trialDay1Email,
  trialDay3Email,
  trialDay7Email,
  trialExpiryEmail,
  trialExpiredEmail,
  trialConvertedEmail,
} from '@/lib/emailTemplates'

const PRODUCT_URL = 'https://app.agentspilot.com'
const TRIAL_URL   = 'https://agentspilot-marketing.vercel.app/signup'

// ── Email definitions ──────────────────────────────────────────────────────

type EmailDef = {
  id:         string
  label:      string
  badge:      string
  badgeColor: string
  trigger:    string
  html:       string
  section:    'lead' | 'trial' | 'paid'
}

const EMAILS: EmailDef[] = [
  // ── Lead ────────────────────────────────────────────────────────────────
  {
    id: 'lead-first',
    label: 'First Contact',
    badge: 'Lead',
    badgeColor: '#6366f1',
    trigger: 'Day 1',
    section: 'lead',
    html: leadFirstContactEmail('Sarah', TRIAL_URL),
  },
  {
    id: 'lead-7d',
    label: 'Day 7 — Still thinking?',
    badge: 'Lead',
    badgeColor: '#6366f1',
    trigger: '+7 days',
    section: 'lead',
    html: leadReminder7dEmail('Sarah', TRIAL_URL),
  },
  {
    id: 'lead-21d',
    label: 'Day 21 — Final nudge',
    badge: 'Lead',
    badgeColor: '#94a3b8',
    trigger: '+21 days',
    section: 'lead',
    html: leadReminder21dEmail('Sarah', TRIAL_URL),
  },
  {
    id: 'lead-cold',
    label: 'Cold — Closing the loop',
    badge: 'Lead',
    badgeColor: '#3f3f46',
    trigger: 'Day 30 · Manual',
    section: 'lead',
    html: leadColdEmail('Sarah', TRIAL_URL),
  },
  // ── Trial ───────────────────────────────────────────────────────────────
  {
    id: 'day0',
    label: 'Day 0 — Welcome',
    badge: 'Trial',
    badgeColor: '#f97316',
    trigger: 'Signup',
    section: 'trial',
    html: trialWelcomeEmail('Sarah', 'June 15, 2026', PRODUCT_URL),
  },
  {
    id: 'day1',
    label: 'Day 1 — Get started',
    badge: 'Trial',
    badgeColor: '#f97316',
    trigger: '+1 day',
    section: 'trial',
    html: trialDay1Email('Sarah', PRODUCT_URL),
  },
  {
    id: 'day3',
    label: 'Day 3 — Use case story',
    badge: 'Trial',
    badgeColor: '#f97316',
    trigger: '+3 days',
    section: 'trial',
    html: trialDay3Email('Sarah', PRODUCT_URL),
  },
  {
    id: 'day7',
    label: 'Day 7 — Midpoint',
    badge: 'Trial',
    badgeColor: '#a78bfa',
    trigger: '+7 days',
    section: 'trial',
    html: trialDay7Email('Sarah', PRODUCT_URL),
  },
  {
    id: 'expiry',
    label: 'Day 11 — Expiry warning',
    badge: 'Trial',
    badgeColor: '#ef4444',
    trigger: '3 days left',
    section: 'trial',
    html: trialExpiryEmail('Sarah', PRODUCT_URL),
  },
  {
    id: 'expired',
    label: 'Day 14 — Trial ended',
    badge: 'Trial',
    badgeColor: '#71717a',
    trigger: 'Expired',
    section: 'trial',
    html: trialExpiredEmail('Sarah', PRODUCT_URL),
  },
  // ── Paid ────────────────────────────────────────────────────────────────
  {
    id: 'converted',
    label: 'Conversion — Welcome to paid',
    badge: 'Paid',
    badgeColor: '#22c55e',
    trigger: 'Payment',
    section: 'paid',
    html: trialConvertedEmail('Sarah', 'Pro', 99, PRODUCT_URL),
  },
]

// ── Section config ─────────────────────────────────────────────────────────

const SECTIONS: { id: 'lead' | 'trial' | 'paid'; label: string; desc: string; accent: string; border: string }[] = [
  { id: 'lead',  label: 'Lead',        desc: 'Outreach sequence · 4 emails',        accent: '#6366f1', border: '#2a2a4a' },
  { id: 'trial', label: 'Trial',       desc: 'Trial nurture sequence · 6 emails',   accent: '#f97316', border: '#3a2a1a' },
  { id: 'paid',  label: 'Paid',        desc: 'Conversion confirmation · 1 email',   accent: '#22c55e', border: '#1a3a2a' },
]

// ── Page ───────────────────────────────────────────────────────────────────

export default function EmailPreviewPage() {
  const [active, setActive] = useState(EMAILS[0].id)
  const current = EMAILS.find(e => e.id === active)!

  // Flat index across all emails for the number badge
  const globalIndex = (id: string) => EMAILS.findIndex(e => e.id === id) + 1

  return (
    <div className="flex h-full min-h-screen bg-[#0a0a0a]">

      {/* ── Left sidebar ── */}
      <aside className="w-72 shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h1 className="text-white font-bold text-sm tracking-wide">Email Preview</h1>
          <p className="text-zinc-500 text-xs mt-0.5">11 emails across 3 lifecycle stages</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map(sec => {
            const emails = EMAILS.filter(e => e.section === sec.id)
            return (
              <div key={sec.id} className="mb-1">
                {/* Section header */}
                <div className="px-5 py-2 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: sec.accent }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: sec.accent }}>
                    {sec.label}
                  </span>
                  <span className="text-zinc-600 text-xs ml-1">{sec.desc}</span>
                </div>

                {/* Email items */}
                {emails.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setActive(e.id)}
                    className={`w-full text-left px-5 py-2.5 flex items-start gap-3 transition-colors ${
                      active === e.id ? 'bg-zinc-800/60' : 'hover:bg-zinc-900'
                    }`}
                  >
                    <span className="text-zinc-600 text-xs font-mono mt-0.5 w-4 shrink-0">
                      {globalIndex(e.id)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{ background: e.badgeColor + '22', color: e.badgeColor }}
                        >
                          {e.badge}
                        </span>
                        <span className="text-zinc-500 text-xs">{e.trigger}</span>
                      </div>
                      <p className={`text-sm truncate ${active === e.id ? 'text-white' : 'text-zinc-400'}`}>
                        {e.label}
                      </p>
                    </div>
                  </button>
                ))}

                {/* Section divider */}
                <div className="mx-5 mt-1 mb-2 border-t border-zinc-800/60" />
              </div>
            )
          })}
        </nav>
      </aside>

      {/* ── Right preview pane ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between bg-[#0d0d0d]">
          <div className="flex items-center gap-3">
            <div
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: current.badgeColor + '22', color: current.badgeColor }}
            >
              {current.badge}
            </div>
            <span className="text-white font-semibold text-sm">{current.label}</span>
            <span className="text-zinc-600 text-xs">Trigger: {current.trigger}</span>
          </div>
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg px-3 py-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"/>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"/>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"/>
            <span className="text-zinc-400 text-xs ml-2">email preview</span>
          </div>
        </div>

        {/* Email iframe */}
        <div className="flex-1 bg-zinc-950 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            <iframe
              key={current.id}
              srcDoc={current.html}
              className="w-full rounded-xl border border-zinc-800"
              style={{ height: '900px' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </main>

    </div>
  )
}
