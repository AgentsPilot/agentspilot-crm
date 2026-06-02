'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, ArrowRight, Users } from 'lucide-react'

function LeadForm() {
  const searchParams = useSearchParams()
  const [form, setForm]       = useState({ first_name: '', last_name: '', email: '', company: '', country: '' })
  const [utms, setUtms]       = useState({ utm_source: '', utm_medium: '', utm_campaign: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    setUtms({
      utm_source:   searchParams.get('utm_source')   ?? 'direct',
      utm_medium:   searchParams.get('utm_medium')   ?? 'organic',
      utm_campaign: searchParams.get('utm_campaign') ?? '',
    })
  }, [searchParams])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.email.trim()) {
      setError('First name and email are required.')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name:   form.first_name.trim(),
        last_name:    form.last_name.trim() || null,
        email:        form.email.trim(),
        company:      form.company.trim() || null,
        country:      form.country.trim() || null,
        source:       'manual',
        utm_source:   utms.utm_source,
        utm_medium:   utms.utm_medium,
        utm_campaign: utms.utm_campaign || null,
        // No trial_started_at → creates lead/new (not trial)
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
        <h2 className="text-2xl font-bold mb-2">Thanks for your interest! 🎉</h2>
        <p className="text-zinc-400 text-sm mb-1">
          We've received your details — our team will be in touch shortly.
        </p>
        <button
          onClick={() => { setSuccess(false); setForm({ first_name: '', last_name: '', email: '', company: '', country: '' }) }}
          className="mt-6 text-orange-400 text-sm hover:text-orange-300 underline underline-offset-2"
        >
          Submit another
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
        <Users className="h-3 w-3" />
        Get in touch with our team
      </div>

      <h2 className="text-xl font-bold mb-1">Request a demo</h2>
      <p className="text-zinc-500 text-sm mb-6">Leave your details and we'll reach out within 24 hours.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">First name *</label>
            <input
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              placeholder="John"
              className="w-full px-3 py-2.5 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Last name</label>
            <input
              value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              placeholder="Smith"
              className="w-full px-3 py-2.5 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
            />
          </div>
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
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Company</label>
          <input
            value={form.company}
            onChange={e => set('company', e.target.value)}
            placeholder="Acme Corp"
            className="w-full px-3 py-2.5 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Country</label>
          <input
            value={form.country}
            onChange={e => set('country', e.target.value)}
            placeholder="United States"
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
            <>Request demo <ArrowRight className="h-4 w-4" /></>
          )}
        </button>

        <p className="text-center text-xs text-zinc-600">
          No spam · We'll only use this to follow up
        </p>
      </form>
    </>
  )
}

export default function LeadCapturePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="flex h-8 w-8 items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <polygon points="4,2 20,12 4,22" fill="#f97316" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-wide">
            AGENTS <span className="text-orange-500">PILOT</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-8">
          <Suspense fallback={<div className="text-zinc-500 text-sm">Loading...</div>}>
            <LeadForm />
          </Suspense>
        </div>

      </div>
    </div>
  )
}
