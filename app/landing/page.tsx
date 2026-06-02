'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle2, Zap, BarChart2, Users, Target } from 'lucide-react'

function LandingForm() {
  const searchParams = useSearchParams()

  const [form, setForm] = useState({ full_name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Read UTM from URL
  const utm = {
    utm_source: searchParams.get('utm_source') ?? 'direct',
    utm_medium: searchParams.get('utm_medium') ?? null,
    utm_campaign: searchParams.get('utm_campaign') ?? null,
    utm_content: searchParams.get('utm_content') ?? null,
    utm_term: searchParams.get('utm_term') ?? null,
  }

  // Derive channel from utm_source
  function getChannel(source: string) {
    const map: Record<string, string> = {
      linkedin: 'LinkedIn', facebook: 'Meta', instagram: 'Meta',
      google: 'Google', tiktok: 'TikTok', email: 'Email',
      newsletter: 'Email', organic: 'Organic', direct: 'Organic',
    }
    return map[source.toLowerCase()] ?? 'Other'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim()) return
    setSaving(true)
    setError(null)

    // Post to /api/leads which writes contacts + contact_stages + task + email
    const nameParts = form.full_name.trim().split(' ')
    const res = await fetch('/api/leads', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name:   nameParts[0],
        last_name:    nameParts.slice(1).join(' ') || undefined,
        email:        form.email.trim().toLowerCase(),
        phone:        form.phone.trim() || undefined,
        channel:      getChannel(utm.utm_source),
        utm_source:   utm.utm_source,
        utm_medium:   utm.utm_medium   ?? undefined,
        utm_campaign: utm.utm_campaign ?? undefined,
        source:       'social',
      }),
    })

    if (!res.ok) {
      setSaving(false)
      const body = await res.json()
      if (body.error?.includes('duplicate') || body.error?.includes('unique')) {
        setError('This email is already registered. Try a different email.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      return
    }

    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">You're in!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Thanks <strong>{form.full_name.split(' ')[0]}</strong> — we'll be in touch within 24 hours.
          </p>
          <p className="text-xs text-slate-400">Keep an eye on your inbox at <strong>{form.email}</strong></p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900">

      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">AgentsPilot</span>
        </div>
        <span className="text-indigo-300 text-xs hidden md:block">AI-powered lead generation platform</span>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left — Hero */}
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-800/50 border border-indigo-700 rounded-full px-4 py-1.5 mb-6">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-indigo-200 text-xs font-medium">Now accepting early access</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
            Turn leads into <span className="text-indigo-300">customers</span> — on autopilot
          </h1>

          <p className="text-indigo-200 text-lg mb-8 leading-relaxed">
            AgentsPilot is the AI-powered CRM built for modern lead gen teams. Track every lead from first click to closed deal.
          </p>

          <div className="space-y-3 mb-8">
            {[
              { icon: BarChart2, text: 'Full UTM tracking — know exactly where every lead came from' },
              { icon: Users, text: 'Pipeline management — move deals through stages in one click' },
              { icon: Target, text: 'Automated follow-up tasks — never let a lead go cold' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 bg-indigo-800 rounded-lg flex items-center justify-center shrink-0">
                  <f.icon className="h-4 w-4 text-indigo-300" />
                </div>
                <p className="text-indigo-200 text-sm">{f.text}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-indigo-400">
            <span>✓ Free to start</span>
            <span>✓ No credit card</span>
            <span>✓ Setup in 5 minutes</span>
          </div>
        </div>

        {/* Right — Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Get early access</h2>
          <p className="text-sm text-slate-500 mb-6">Join 500+ teams already using AgentsPilot</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="e.g. John Smith"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Work Email <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@company.com"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 555 000 0000"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : 'Get Early Access →'}
            </button>

            <p className="text-xs text-slate-400 text-center">
              No spam. Unsubscribe anytime.
            </p>
          </form>

          {/* UTM debug — only visible in development */}
          {process.env.NODE_ENV === 'development' && utm.utm_source !== 'direct' && (
            <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="text-xs font-semibold text-indigo-500 mb-1">UTM Debug (dev only)</p>
              {Object.entries(utm).filter(([, v]) => v).map(([k, v]) => (
                <p key={k} className="text-xs text-indigo-400"><span className="text-indigo-600">{k}:</span> {v}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    }>
      <LandingForm />
    </Suspense>
  )
}
