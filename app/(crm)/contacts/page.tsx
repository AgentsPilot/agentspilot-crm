'use client'
// v4 — stage-first layout: 3 stage cards → state chips → stage-aware table
import React, { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import {
  Search, Plus, X, Loader2, ExternalLink,
  ChevronDown, ChevronUp,
  Users, Zap, CheckCircle2, Link, Snowflake,
} from 'lucide-react'
import NextLink from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────

type StageId = 'lead' | 'customer_trial' | 'customer_paid'

type Contact = {
  contact_id:       string
  first_name:       string
  last_name:        string | null
  email:            string | null
  phone:            string | null
  company:          string | null
  country:          string | null
  timezone:         string | null
  channel:          string | null
  utm_source:       string | null
  utm_medium:       string | null
  utm_campaign:        string | null
  acquisition_type:    string | null
  lead_score:          number | null
  funnel_level:        string | null
  tags:                string[]
  notes:               string | null
  payment_failed:      boolean
  manual_at_risk_flag: boolean
  activated_at:        string | null
  converted_at:        string | null
  customer_source:     string | null
  stage:               StageId
  state:            string
  plan:             string | null
  mrr:              number | null
  trial_started_at: string | null
  trial_expires_at: string | null
  created_at:       string
  // computed
  full_name: string
}

// ── Stage meta ─────────────────────────────────────────────────────────────

const STAGE_META: Record<StageId, {
  label: string; sublabel: string
  color: string; bg: string; border: string; activeBorder: string
  dot: string; icon: React.ElementType
}> = {
  lead: {
    label: 'Leads', sublabel: 'Social / manual capture',
    color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
    activeBorder: 'border-amber-400 ring-2 ring-amber-300',
    dot: 'bg-amber-400', icon: Users,
  },
  customer_trial: {
    label: 'Trial', sublabel: '14-day free trial',
    color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
    activeBorder: 'border-blue-400 ring-2 ring-blue-300',
    dot: 'bg-blue-500', icon: Zap,
  },
  customer_paid: {
    label: 'Paid', sublabel: 'Paying customers',
    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',
    activeBorder: 'border-emerald-400 ring-2 ring-emerald-300',
    dot: 'bg-emerald-500', icon: CheckCircle2,
  },
}

// States per stage + their badge colours
const STAGE_STATES: Record<StageId, string[]> = {
  lead:           ['new', 'contacted', 'reminded_7d', 'reminded_21d', 'cold'],
  customer_trial: ['active', 'inactive', 'expiring', 'expired'],
  customer_paid:  ['active', 'at_risk', 'churned'],
}

const STATE_STYLE: Record<string, { bg: string; text: string }> = {
  new:          { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  contacted:    { bg: 'bg-sky-100',     text: 'text-sky-700'     },
  reminded_7d:  { bg: 'bg-amber-100',   text: 'text-amber-600'   },
  reminded_21d: { bg: 'bg-orange-100',  text: 'text-orange-700'  },
  cold:         { bg: 'bg-slate-100',   text: 'text-slate-500'   },
  active:       { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  inactive:     { bg: 'bg-orange-100',  text: 'text-orange-700'  },
  expiring:     { bg: 'bg-red-100',     text: 'text-red-600'     },
  expired:      { bg: 'bg-red-100',     text: 'text-red-600'     },
  at_risk:      { bg: 'bg-yellow-100',  text: 'text-yellow-700'  },
  churned:      { bg: 'bg-slate-100',   text: 'text-slate-500'   },
}

function StateChip({ state, count, active, onClick }: {
  state: string; count: number; active: boolean; onClick: () => void
}) {
  const s = STATE_STYLE[state] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <button
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
        active
          ? `${s.bg} ${s.text} border-current opacity-100 ring-1 ring-offset-1 ring-current`
          : `${s.bg} ${s.text} border-transparent opacity-80 hover:opacity-100`,
      ].join(' ')}
    >
      {state} <span className="font-bold">{count}</span>
    </button>
  )
}

// ── Lead email sequence cell ──────────────────────────────────────────────
// Derived purely from state — no email table lookup needed.
// State machine: new → contacted → reminded_7d → reminded_21d → cold

const SEQ_STEPS = [
  { key: 'mail_1d',  label: '1d',  color: 'bg-sky-100 text-sky-700 border-sky-200',         sent: (s: string) => ['contacted','reminded_7d','reminded_21d','cold'].includes(s) },
  { key: 'mail_7d',  label: '7d',  color: 'bg-amber-100 text-amber-700 border-amber-200',   sent: (s: string) => ['reminded_7d','reminded_21d','cold'].includes(s) },
  { key: 'mail_21d', label: '21d', color: 'bg-orange-100 text-orange-700 border-orange-200',sent: (s: string) => ['reminded_21d','cold'].includes(s) },
]

function LeadSequenceCell({ state }: { state: string }) {
  const isCold = state === 'cold'
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {SEQ_STEPS.map(step => (
        <span key={step.key} className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded border font-medium ${
          step.sent(state) ? step.color : 'bg-gray-50 text-gray-300 border-gray-200'
        }`}>
          ✉ {step.label}
        </span>
      ))}
      {isCold && (
        <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded border font-semibold bg-slate-100 text-slate-500 border-slate-200">
          <Snowflake className="h-2.5 w-2.5" /> cold
        </span>
      )}
    </div>
  )
}

// ── Lead status badge ─────────────────────────────────────────────────────
// Single plain-English summary of where the lead is in the sequence

const LEAD_STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  new:          { label: 'Mail sent',      bg: 'bg-sky-50',    text: 'text-sky-700',    dot: 'bg-sky-400'    },
  contacted:    { label: 'Follow up · 1d', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
  reminded_7d:  { label: 'Follow up · 7d', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  reminded_21d: { label: 'Follow up · 21d',bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  cold:         { label: 'Cold',           bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
}

function LeadStatusBadge({ state }: { state: string }) {
  const s = LEAD_STATUS[state] ?? { label: state, bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-transparent ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Stage-aware column definitions ────────────────────────────────────────

type ColDef = { header: string; render: (c: Contact) => React.ReactNode }

function TrialDaysLeft({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-slate-300">—</span>
  const d = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
  if (d <= 0) return <span className="text-xs font-semibold text-red-600">Expired</span>
  return <span className={`text-xs font-semibold ${d <= 3 ? 'text-red-600' : d <= 7 ? 'text-amber-600' : 'text-slate-600'}`}>{d}d left</span>
}

function DaysInTrial({ startedAt }: { startedAt: string | null }) {
  if (!startedAt) return <span className="text-slate-300">—</span>
  const d = Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000)
  return <span className={`text-xs ${d > 10 ? 'text-orange-600 font-semibold' : 'text-slate-500'}`}>{d}d in trial</span>
}

const COLS_LEAD: ColDef[] = [
  { header: 'Name',      render: c => <NameCell c={c} /> },
  { header: 'Email',     render: c => <EmailCell c={c} /> },
  { header: 'Status',    render: c => <LeadStatusBadge state={c.state} /> },
  { header: 'Score',     render: c => <LeadScoreCell score={c.lead_score} /> },
  { header: 'Sequence',  render: c => <LeadSequenceCell state={c.state} /> },
  { header: 'Company',   render: c => <span className="text-xs text-slate-600">{c.company ?? '—'}</span> },
  { header: 'Location',  render: c => <LocationCell c={c} /> },
  { header: 'Source',    render: c => <SourceCell c={c} /> },
  { header: 'Lead date', render: c => <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span> },
]

const COLS_TRIAL: ColDef[] = [
  { header: 'Name',       render: c => <NameCell c={c} /> },
  { header: 'Email',      render: c => <EmailCell c={c} /> },
  { header: 'State',      render: c => <StatePill state={c.state} /> },
  { header: 'Trial ends', render: c => <TrialDaysLeft expiresAt={c.trial_expires_at} /> },
  { header: 'In trial',   render: c => <DaysInTrial startedAt={c.trial_started_at} /> },
  { header: 'Company',    render: c => <span className="text-xs text-slate-600">{c.company ?? '—'}</span> },
  { header: 'Location',   render: c => <LocationCell c={c} /> },
  { header: 'Source',     render: c => <SourceCell c={c} /> },
  { header: 'Started',    render: c => <span className="text-xs text-slate-400">{c.trial_started_at ? new Date(c.trial_started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span> },
]

const COLS_PAID: ColDef[] = [
  { header: 'Name',     render: c => <NameCell c={c} /> },
  { header: 'Email',    render: c => <EmailCell c={c} /> },
  { header: 'State',    render: c => <StatePill state={c.state} /> },
  { header: 'Plan',     render: c => <span className="text-xs text-slate-600 capitalize">{c.plan ?? '—'}</span> },
  { header: 'MRR',      render: c => <span className={`text-xs font-semibold ${(c.mrr ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{(c.mrr ?? 0) > 0 ? `$${c.mrr}` : '—'}</span> },
  { header: 'Company',  render: c => <span className="text-xs text-slate-600">{c.company ?? '—'}</span> },
  { header: 'Location', render: c => <LocationCell c={c} /> },
  { header: 'Source',   render: c => <SourceCell c={c} /> },
  { header: 'Since',    render: c => <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span> },
]

const COLS_ALL: ColDef[] = [
  { header: 'Name',    render: c => <NameCell c={c} /> },
  { header: 'Email',   render: c => <EmailCell c={c} /> },
  { header: 'Stage',   render: c => {
    const m = STAGE_META[c.stage]
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.color}`}>{m.label}</span>
  }},
  { header: 'State',   render: c => <StatePill state={c.state} /> },
  { header: 'Company', render: c => <span className="text-xs text-slate-500">{c.company ?? '—'}</span> },
  { header: 'Channel', render: c => <span className="text-xs text-slate-500">{c.channel ?? '—'}</span> },
  { header: 'MRR',     render: c => <span className={`text-xs font-semibold ${(c.mrr ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{(c.mrr ?? 0) > 0 ? `$${c.mrr}` : '—'}</span> },
  { header: 'Date',    render: c => <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span> },
]

// ── Small helpers ──────────────────────────────────────────────────────────

function NameCell({ c }: { c: Contact }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-900 truncate">{c.full_name || '—'}</p>
      {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
    </div>
  )
}

function EmailCell({ c }: { c: Contact }) {
  return c.email
    ? <span className="text-xs text-slate-500 truncate max-w-[200px] block">{c.email}</span>
    : <span className="text-xs text-slate-300">—</span>
}

function LocationCell({ c }: { c: Contact }) {
  const parts = [c.country, c.timezone].filter(Boolean)
  if (!parts.length) return <span className="text-slate-300 text-xs">—</span>
  return (
    <div>
      {c.country && <p className="text-xs text-slate-600">{c.country}</p>}
      {c.timezone && <p className="text-xs text-slate-400">{c.timezone}</p>}
    </div>
  )
}

function SourceCell({ c }: { c: Contact }) {
  const acq = c.acquisition_type
  const src = c.channel || c.utm_source
  return (
    <div className="space-y-0.5">
      {acq && (
        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${
          acq === 'lead_nurtured' ? 'bg-amber-50 text-amber-700' :
          acq === 'direct_trial'  ? 'bg-sky-50 text-sky-700' :
                                    'bg-emerald-50 text-emerald-700'
        }`}>
          {acq === 'lead_nurtured' ? '🌱' : acq === 'direct_trial' ? '⚡' : '💳'}
          {acq === 'lead_nurtured' ? 'Nurtured' : acq === 'direct_trial' ? 'Direct' : 'Paid direct'}
        </span>
      )}
      {src && <p className="text-xs text-slate-400 capitalize">{src}</p>}
    </div>
  )
}

function StatePill({ state }: { state: string }) {
  const s = STATE_STYLE[state] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>{state}</span>
}

function LeadScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-300 text-xs">—</span>
  const color = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-500'
  const bar   = score >= 70 ? 'bg-emerald-400'  : score >= 40 ? 'bg-amber-400'   : 'bg-red-400'
  return (
    <div className="w-16">
      <div className="flex justify-between text-xs mb-0.5">
        <span className={`font-semibold ${color}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

// ── Form ───────────────────────────────────────────────────────────────────

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '', company: '',
  country: '', timezone: 'UTC',
  channel: 'Organic', utm_source: '', utm_medium: '', utm_campaign: '',
}

const inputCls = 'px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700 w-full'

// ── Component ──────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const [contacts,     setContacts]     = useState<Contact[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [search,       setSearch]       = useState('')
  const [stageFilter,  setStageFilter]  = useState<StageId | 'all'>('all')
  const [stateFilter,  setStateFilter]  = useState<string | null>(null)
  const [showForm,     setShowForm]     = useState(false)
  const [utmUrl,       setUtmUrl]       = useState('')
  const [form,         setForm]         = useState(emptyForm)
  const [saving,       setSaving]       = useState(false)
  const [expandedId,   setExpandedId]   = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email,phone,company,country,timezone,channel,utm_source,utm_medium,utm_campaign,acquisition_type,lead_score,funnel_level,tags,notes,payment_failed,manual_at_risk_flag,activated_at,converted_at,customer_source,stage,state,plan,mrr,trial_started_at,trial_expires_at,created_at')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else {
      const contacts = (data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        full_name: [r.first_name, r.last_name].filter(Boolean).join(' '),
      })) as Contact[]
      setContacts(contacts)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  // ── Add contact ───────────────────────────────────────────────────────────
  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'manual' }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Save failed'); setSaving(false); return }
      setSaving(false); setShowForm(false); setForm(emptyForm); setUtmUrl('')
      fetchContacts()
    } catch (err) { setError(String(err)); setSaving(false) }
  }

  // ── Counts per stage / state ──────────────────────────────────────────────
  function stageCt(s: StageId) { return contacts.filter(c => c.stage === s).length }
  function stateCt(s: StageId, st: string) { return contacts.filter(c => c.stage === s && c.state === st).length }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      c.full_name.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q)
    const matchStage = stageFilter === 'all' || c.stage === stageFilter
    const matchState = !stateFilter || c.state === stateFilter
    return matchSearch && matchStage && matchState
  })

  const cols = stageFilter === 'lead' ? COLS_LEAD
    : stageFilter === 'customer_trial' ? COLS_TRIAL
    : stageFilter === 'customer_paid'  ? COLS_PAID
    : COLS_ALL

  function selectStage(s: StageId) {
    if (stageFilter === s) { setStageFilter('all'); setStateFilter(null) }
    else { setStageFilter(s); setStateFilter(null) }
  }

  function selectState(state: string) {
    setStateFilter(prev => prev === state ? null : state)
  }

  function parseUtm(raw: string) {
    try {
      const url = new URL(raw.includes('://') ? raw : 'https://' + raw)
      const p = url.searchParams
      setForm(f => ({
        ...f,
        utm_source:   p.get('utm_source')   ?? f.utm_source,
        utm_medium:   p.get('utm_medium')   ?? f.utm_medium,
        utm_campaign: p.get('utm_campaign') ?? f.utm_campaign,
      }))
    } catch {}
  }

  const STAGES: StageId[] = ['lead', 'customer_trial', 'customer_paid']

  return (
    <div>
      <Header
        title="Contacts"
        subtitle={loading ? 'Loading…' : `${contacts.length} contacts`}
      />
      <div className="p-6 space-y-5">

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
            {error} <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STAGE CARDS — big, prominent, coloured per stage
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STAGES.map(sid => {
            const meta     = STAGE_META[sid]
            const Icon     = meta.icon
            const count    = stageCt(sid)
            const isActive = stageFilter === sid
            return (
              <div
                key={sid}
                onClick={() => selectStage(sid)}
                className={[
                  'rounded-2xl border-2 p-5 cursor-pointer transition-all select-none',
                  isActive
                    ? `${meta.bg} ${meta.activeBorder} shadow-md`
                    : `bg-white ${meta.border} hover:shadow-sm hover:${meta.activeBorder}`,
                ].join(' ')}
              >
                {/* Stage header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${meta.bg} border ${meta.border}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <span className={`text-3xl font-black ${meta.color}`}>{loading ? '…' : count}</span>
                </div>

                <p className={`text-base font-bold ${meta.color} mb-0.5`}>{meta.label}</p>
                <p className="text-xs text-slate-400 mb-4">{meta.sublabel}</p>

                {/* ── STATE CHIPS — visually lighter than stage card ──── */}
                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-opacity-30"
                  style={{ borderColor: 'currentColor' }}
                  onClick={e => e.stopPropagation()}
                >
                  {STAGE_STATES[sid].map(st => {
                    const ct = stateCt(sid, st)
                    return (
                      <StateChip
                        key={st}
                        state={st}
                        count={ct}
                        active={stateFilter === st && stageFilter === sid}
                        onClick={() => { setStageFilter(sid); selectState(st) }}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, email, company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Active filter pills */}
          {stageFilter !== 'all' && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${STAGE_META[stageFilter].bg} ${STAGE_META[stageFilter].color} ${STAGE_META[stageFilter].border}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${STAGE_META[stageFilter].dot}`} />
              {STAGE_META[stageFilter].label}
              {stateFilter && <span className="opacity-60">· {stateFilter}</span>}
              <button onClick={() => { setStageFilter('all'); setStateFilter(null) }}>
                <X className="h-3 w-3 ml-1" />
              </button>
            </div>
          )}

          <span className="text-xs text-slate-400 ml-auto">{filtered.length} shown</span>

          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Contact
          </button>
        </div>

        {/* ── Add Contact form ────────────────────────────────────────────── */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-900">Add New Lead</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={addContact} className="space-y-5">

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Basic Info</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {([
                    { label: 'First Name *', key: 'first_name', required: true },
                    { label: 'Last Name',    key: 'last_name'                  },
                    { label: 'Email *',      key: 'email',       type: 'email', required: true },
                    { label: 'Phone',        key: 'phone'                      },
                    { label: 'Company',      key: 'company'                    },
                    { label: 'Country',      key: 'country'                    },
                  ] as Array<{ label: string; key: keyof typeof emptyForm; type?: string; required?: boolean }>).map(f => (
                    <div key={f.key} className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">{f.label}</label>
                      <input
                        required={f.required}
                        type={f.type ?? 'text'}
                        value={form[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Acquisition</p>
                {/* URL parser */}
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text" placeholder="Paste landing page URL to auto-fill UTMs…"
                      value={utmUrl} onChange={e => setUtmUrl(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <button type="button" onClick={() => parseUtm(utmUrl)}
                    className="px-4 py-2 text-sm font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-800">Parse</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {([
                    { label: 'Channel', key: 'channel', opts: ['Meta','Google','TikTok','LinkedIn','Organic','Email','Other'] },
                    { label: 'UTM Source',   key: 'utm_source'   },
                    { label: 'UTM Medium',   key: 'utm_medium'   },
                    { label: 'UTM Campaign', key: 'utm_campaign' },
                  ] as Array<{ label: string; key: keyof typeof emptyForm; opts?: string[] }>).map(f => (
                    <div key={f.key} className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">{f.label}</label>
                      {f.opts ? (
                        <select value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} className={inputCls}>
                          {f.opts.map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} className={inputCls} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving…' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STAGE-AWARE TABLE
        ══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              {stageFilter !== 'all' ? (
                <>
                  <span className={`h-2 w-2 rounded-full ${STAGE_META[stageFilter].dot}`} />
                  {STAGE_META[stageFilter].label}
                  {stateFilter && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ml-1 font-medium ${STATE_STYLE[stateFilter]?.bg ?? 'bg-gray-100'} ${STATE_STYLE[stateFilter]?.text ?? 'text-gray-600'}`}>
                      {stateFilter}
                    </span>
                  )}
                </>
              ) : 'All Contacts'}
              <span className="text-slate-400 font-normal text-xs ml-1">({filtered.length})</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-sm">
              {contacts.length === 0 ? 'No contacts yet — click Add Contact' : 'No contacts match your filters'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    {cols.map(col => (
                      <th key={col.header} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                        {col.header}
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const isExp = expandedId === c.contact_id
                    const stageMeta = STAGE_META[c.stage]
                    return (
                      <React.Fragment key={c.contact_id}>
                        <tr
                          className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setExpandedId(isExp ? null : c.contact_id)}
                        >
                          {cols.map(col => (
                            <td key={col.header} className="px-4 py-3">{col.render(c)}</td>
                          ))}
                          <td className="px-4 py-3">
                            {isExp ? <ChevronUp className="h-4 w-4 text-slate-300" /> : <ChevronDown className="h-4 w-4 text-slate-300" />}
                          </td>
                        </tr>

                        {/* ── Expanded row — stage-aware actions ──────────── */}
                        {isExp && (
                          <tr className={stageMeta.bg}>
                            <td colSpan={cols.length + 1} className="px-6 py-4">

                              {/* Info grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs mb-4">
                                {c.stage === 'lead' && [
                                  { label: 'Phone',        value: c.phone },
                                  { label: 'Company',      value: c.company },
                                  { label: 'Country',      value: c.country },
                                  { label: 'Channel',      value: c.channel },
                                  { label: 'UTM Source',   value: c.utm_source },
                                  { label: 'UTM Medium',   value: c.utm_medium },
                                  { label: 'UTM Campaign', value: c.utm_campaign },
                                  { label: 'Lead since',   value: new Date(c.created_at).toLocaleDateString() },
                                ].map(f => (
                                  <div key={f.label}>
                                    <p className="text-slate-400 font-medium">{f.label}</p>
                                    <p className="text-slate-700 mt-0.5">{f.value ?? '—'}</p>
                                  </div>
                                ))}

                                {c.stage === 'customer_trial' && [
                                  { label: 'Trial started', value: c.trial_started_at ? new Date(c.trial_started_at).toLocaleDateString() : '—' },
                                  { label: 'Trial expires', value: c.trial_expires_at ? new Date(c.trial_expires_at).toLocaleDateString() : '—' },
                                  { label: 'Channel',       value: c.channel },
                                  { label: 'Company',       value: c.company },
                                  { label: 'UTM Campaign',  value: c.utm_campaign },
                                  { label: 'Country',       value: c.country },
                                ].map(f => (
                                  <div key={f.label}>
                                    <p className="text-slate-400 font-medium">{f.label}</p>
                                    <p className="text-slate-700 mt-0.5">{f.value ?? '—'}</p>
                                  </div>
                                ))}

                                {c.stage === 'customer_paid' && [
                                  { label: 'Plan',        value: c.plan },
                                  { label: 'MRR',         value: c.mrr ? `$${c.mrr}` : null },
                                  { label: 'Company',     value: c.company },
                                  { label: 'Channel',     value: c.channel },
                                  { label: 'Country',     value: c.country },
                                  { label: 'Customer since', value: new Date(c.created_at).toLocaleDateString() },
                                ].map(f => (
                                  <div key={f.label}>
                                    <p className="text-slate-400 font-medium">{f.label}</p>
                                    <p className="text-slate-700 mt-0.5">{f.value ?? '—'}</p>
                                  </div>
                                ))}
                              </div>

                              {/* ── Footer row ─────────────────────────── */}
                              <div className="flex items-center justify-between pt-3 border-t border-white/40">
                                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                  <Zap className="h-3 w-3 text-slate-300" />
                                  Emails &amp; stage transitions handled automatically by lifecycle cron
                                </p>
                                <NextLink
                                  href={`/contacts/${c.contact_id}`}
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                                >
                                  <ExternalLink className="h-3 w-3" /> Full Profile
                                </NextLink>
                              </div>

                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-gray-100 px-5 py-2.5 text-xs text-slate-400">
            {filtered.length} of {contacts.length} contacts
          </div>
        </div>

      </div>
    </div>
  )
}
