'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, ArrowRight, Zap, BarChart2, Users, GitBranch } from 'lucide-react'

const FEATURES = [
  { icon: Users,     title: 'Lifecycle Tracking',   desc: 'Follow every user from lead to paying customer' },
  { icon: GitBranch, title: 'Trial Automation',      desc: 'Auto-tasks and emails triggered at every stage' },
  { icon: BarChart2, title: 'Funnel Analytics',      desc: 'Real-time conversion rates across your SaaS funnel' },
  { icon: Zap,       title: 'Smart Alarms',          desc: 'Get alerted when trials expire or customers go at-risk' },
]

// ── Inner form ───────────────────────────────────────────────────────────────
function TrialForm() {
  const searchParams = useSearchParams()
  const [form, setForm]     = useState({ full_name: '', email: '', phone: '', company: '' })
  const [utms, setUtms]     = useState({ utm_source: '', utm_medium: '', utm_campaign: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    setUtms({
      utm_source:   searchParams.get('utm_source')   ?? 'landing_page',
      utm_medium:   searchParams.get('utm_medium')   ?? 'organic',
      utm_campaign: searchParams.get('utm_campaign') ?? 'trial_signup',
    })
  }, [searchParams])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }
    setLoading(true)
    setError('')

    // Calculate trial expiry: today + 14 days
    const trialExpiry = new Date()
    trialExpiry.setDate(trialExpiry.getDate() + 14)

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        ...utms,
        status: 'trial_inactive',
        trial_started_at: new Date().toISOString(),
        trial_expires_at: trialExpiry.toISOString(),
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-14 w-14 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your 14-day trial is ready! 🎉</h2>
        <p className="text-zinc-400 text-sm mb-1">
          We've started your free trial — our team will reach out within 24 hours to help you get set up.
        </p>
        <p className="text-zinc-600 text-xs">No credit card required during the trial.</p>
        <button
          onClick={() => { setSuccess(false); setForm({ full_name: '', email: '', phone: '', company: '' }) }}
          className="mt-6 text-orange-400 text-sm hover:text-orange-300 underline underline-offset-2"
        >
          Sign up another account
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
        <CheckCircle2 className="h-3 w-3" />
        14-day free trial · No credit card required
      </div>

      <h2 className="text-xl font-bold mb-1">Start your free trial</h2>
      <p className="text-zinc-500 text-sm mb-6">Get full access to AgentsPilot CRM for 14 days, free.</p>

      {process.env.NODE_ENV === 'development' && utms.utm_source !== 'landing_page' && (
        <div className="mb-4 text-xs bg-zinc-800 text-zinc-400 px-3 py-2 rounded-lg">
          📎 UTM: <span className="text-orange-400">{utms.utm_source}</span> / {utms.utm_medium} / {utms.utm_campaign}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full name *</label>
          <input
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            placeholder="John Smith"
            className="w-full px-3 py-2.5 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Work email *</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="john@company.com"
            className="w-full px-3 py-2.5 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Company name</label>
          <input
            value={form.company}
            onChange={e => set('company', e.target.value)}
            placeholder="Acme Agency"
            className="w-full px-3 py-2.5 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Phone</label>
          <input
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="+1 555 0100"
            className="w-full px-3 py-2.5 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>Start free trial <ArrowRight className="h-4 w-4" /></>
          )}
        </button>

        <p className="text-center text-xs text-zinc-600">
          14 days free · No credit card · Cancel anytime
        </p>
      </form>
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function TrialSignupPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      <nav className="border-b border-[#222] px-6 py-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
            <polygon points="4,2 20,12 4,22" fill="#f97316" />
          </svg>
        </div>
        <span className="text-sm font-bold tracking-wide">
          AGENTS <span className="text-orange-500">PILOT</span>
        </span>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-16 items-center">

        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap className="h-3 w-3" />
            Free 14-day trial — no card needed
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
            The CRM built for<br />
            <span className="text-orange-500">SaaS growth</span>
          </h1>

          <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
            Manage your entire user lifecycle — from lead capture to trial activation to paying customer — fully automated.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-sm text-zinc-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-8">
          <Suspense fallback={<div className="text-zinc-500 text-sm">Loading...</div>}>
            <TrialForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
