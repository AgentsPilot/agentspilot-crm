'use client'
// v5 — stage-aware table columns + days-in-stage + forward transitions
import React, { useEffect, useState, useCallback, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import {
  Users, CheckCircle2, X, Loader2, ChevronRight,
  UserCheck, Zap, ArrowRight,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

type StageId = 'lead' | 'customer_trial' | 'customer_paid'

type Contact = {
  contact_id:          string
  first_name:          string
  last_name:           string | null
  email:               string | null
  company:             string | null
  channel:             string | null
  utm_source:          string | null
  lead_score:          number | null
  payment_failed:      boolean
  manual_at_risk_flag: boolean
  stage:               StageId
  state:               string
  from_stage:          string | null
  plan:                string | null
  mrr:                 number | null
  trial_started_at:    string | null
  trial_expires_at:    string | null
  created_at:          string
  changed_at:          string | null
  full_name:           string  // computed
}

// ── Stage meta ─────────────────────────────────────────────────────────────

const STAGE_META: Record<StageId, {
  label: string; sublabel: string; color: string; bg: string
  border: string; dot: string; icon: React.ElementType
}> = {
  lead: {
    label: 'Leads', sublabel: 'Social / manual capture',
    color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
    dot: 'bg-amber-400', icon: Users,
  },
  customer_trial: {
    label: 'Trial', sublabel: '14-day free trial',
    color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
    dot: 'bg-blue-500', icon: Zap,
  },
  customer_paid: {
    label: 'Paid', sublabel: 'Active paying customers',
    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',
    dot: 'bg-emerald-500', icon: CheckCircle2,
  },
}

const FUNNEL: StageId[] = ['lead', 'customer_trial', 'customer_paid']

// Forward transitions only (Lead→Trial, Trial→Paid)
const FORWARD: Partial<Record<StageId, StageId>> = {
  lead:            'customer_trial',
  customer_trial:  'customer_paid',
}

const STATE_COLOR: Record<string, string> = {
  new:       'bg-amber-100 text-amber-700',
  contacted: 'bg-sky-100 text-sky-700',
  cold:      'bg-slate-100 text-slate-500',
  active:    'bg-emerald-100 text-emerald-700',
  inactive:  'bg-orange-100 text-orange-700',
  expiring:  'bg-red-100 text-red-600',
  expired:   'bg-red-100 text-red-600',
  at_risk:   'bg-yellow-100 text-yellow-700',
  churned:   'bg-slate-100 text-slate-500',
}

// ── Utils ──────────────────────────────────────────────────────────────────

function daysLeft(expiresAt: string | null) {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
}

function daysInStage(changedAt: string | null, createdAt: string) {
  const from = changedAt ?? createdAt
  return Math.floor((Date.now() - new Date(from).getTime()) / 86400000)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Stage-aware column definitions ────────────────────────────────────────

type ColDef = {
  header: string
  render: (c: Contact) => React.ReactNode
}

const COLS: Record<StageId | 'all', ColDef[]> = {
  lead: [
    { header: 'Name',       render: c => <NameCell c={c} /> },
    { header: 'State',      render: c => <StateChip state={c.state} /> },
    { header: 'Score',      render: c => c.lead_score !== null
        ? <span className={`text-xs font-semibold ${c.lead_score >= 70 ? 'text-emerald-600' : c.lead_score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{c.lead_score}</span>
        : <span className="text-slate-300 text-xs">—</span>
    },
    { header: 'Company',    render: c => <span className="text-xs text-slate-600">{c.company ?? '—'}</span> },
    { header: 'Channel',    render: c => <span className="text-xs text-slate-500">{c.channel ?? c.utm_source ?? '—'}</span> },
    { header: 'Days in stage', render: c => <DaysChip days={daysInStage(c.changed_at, c.created_at)} warn={14} /> },
    { header: 'Since',      render: c => <span className="text-xs text-slate-400">{fmtDate(c.created_at)}</span> },
  ],
  customer_trial: [
    { header: 'Name',       render: c => <NameCell c={c} /> },
    { header: 'Source',     render: c => (c.from_stage ?? null) === 'lead'
        ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-100">🌱 Converted lead</span>
        : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium border border-sky-100">⚡ Direct signup</span>
    },
    { header: 'State',      render: c => <StateChip state={c.state} /> },
    { header: 'Trial ends', render: c => <TrialEndCell expiresAt={c.trial_expires_at} /> },
    { header: 'Channel',    render: c => <span className="text-xs text-slate-500">{c.channel ?? '—'}</span> },
    { header: 'Days in stage', render: c => <DaysChip days={daysInStage(c.changed_at, c.created_at)} warn={10} /> },
    { header: 'Since',      render: c => <span className="text-xs text-slate-400">{fmtDate(c.created_at)}</span> },
  ],
  customer_paid: [
    { header: 'Name',       render: c => <NameCell c={c} /> },
    { header: 'State',      render: c => <StateChip state={c.state} /> },
    { header: 'Plan',       render: c => <span className="text-xs text-slate-600 capitalize">{c.plan ?? '—'}</span> },
    { header: 'MRR',        render: c => <span className={`text-xs font-semibold ${(c.mrr ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{(c.mrr ?? 0) > 0 ? `$${c.mrr}` : '—'}</span> },
    { header: 'Channel',    render: c => <span className="text-xs text-slate-500">{c.channel ?? '—'}</span> },
    { header: 'Days in stage', render: c => <DaysChip days={daysInStage(c.changed_at, c.created_at)} warn={60} /> },
    { header: 'Since',      render: c => <span className="text-xs text-slate-400">{fmtDate(c.created_at)}</span> },
  ],
  all: [
    { header: 'Name',    render: c => <NameCell c={c} /> },
    { header: 'Stage',   render: c => {
      const m = STAGE_META[c.stage]
      return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.color}`}><span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{m.label}</span>
    }},
    { header: 'State',   render: c => <StateChip state={c.state} /> },
    { header: 'Trial ends', render: c => <TrialEndCell expiresAt={c.trial_expires_at} /> },
    { header: 'MRR',     render: c => <span className={`text-xs font-semibold ${(c.mrr ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{(c.mrr ?? 0) > 0 ? `$${c.mrr}` : '—'}</span> },
    { header: 'Since',   render: c => <span className="text-xs text-slate-400">{fmtDate(c.created_at)}</span> },
  ],
}

// ── Small render helpers ──────────────────────────────────────────────────

function NameCell({ c }: { c: Contact }) {
  return (
    <div>
      <div className="font-medium text-slate-900 text-sm">{c.full_name}</div>
      {c.email && <div className="text-xs text-slate-400 truncate max-w-[160px]">{c.email}</div>}
    </div>
  )
}

function StateChip({ state }: { state: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATE_COLOR[state] ?? 'bg-gray-100 text-gray-600'}`}>
      {state}
    </span>
  )
}

function TrialEndCell({ expiresAt }: { expiresAt: string | null }) {
  const dl = daysLeft(expiresAt)
  if (dl === null) return <span className="text-xs text-slate-300">—</span>
  if (dl <= 0)  return <span className="text-xs font-semibold text-red-600">Expired</span>
  return (
    <span className={`text-xs font-semibold ${dl <= 3 ? 'text-red-600' : dl <= 7 ? 'text-amber-600' : 'text-slate-500'}`}>
      {dl}d left
    </span>
  )
}

function DaysChip({ days, warn }: { days: number; warn: number }) {
  const hot = days >= warn
  return (
    <span className={`text-xs font-medium ${hot ? 'text-orange-600' : 'text-slate-400'}`}>
      {days}d {hot ? '⚠' : ''}
    </span>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function LifecycleFunnelPage() {
  const router = useRouter()
  const [contacts, setContacts]       = useState<Contact[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState<StageId | null>(null)
  const [movingId, setMovingId]       = useState<string | null>(null)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const tableRef = React.useRef<HTMLDivElement>(null)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contacts_current')
      .select(`
        contact_id, first_name, last_name, email, company, channel, utm_source,
        lead_score, payment_failed, manual_at_risk_flag,
        stage, state, from_stage, plan, mrr, trial_started_at, trial_expires_at,
        created_at, changed_at
      `)
      .order('created_at', { ascending: false })

    if (error) { setError(error.message) }
    else {
      setContacts((data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        full_name: [r.first_name, r.last_name].filter(Boolean).join(' '),
      })) as Contact[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  // ── Derived data ──────────────────────────────────────────────────────────

  const stageCounts = Object.fromEntries(
    FUNNEL.map(s => [s, contacts.filter(c => c.stage === s).length])
  ) as Record<StageId, number>

  const totalMRR = contacts
    .filter(c => c.stage === 'customer_paid')
    .reduce((s, c) => s + (c.mrr ?? 0), 0)

  const expiringSoon = contacts.filter(c => {
    const dl = daysLeft(c.trial_expires_at)
    return c.stage === 'customer_trial' && dl !== null && dl <= 3 && dl >= 0
  })
  const atRisk        = contacts.filter(c => c.stage === 'customer_paid' && (c.state === 'at_risk' || c.manual_at_risk_flag))
  const paymentFailed = contacts.filter(c => c.payment_failed)
  const inactive      = contacts.filter(c => c.stage === 'customer_trial' && c.state === 'inactive')

  function stateBreakdown(stage: StageId) {
    const group: Record<string, number> = {}
    contacts.filter(c => c.stage === stage).forEach(c => {
      group[c.state] = (group[c.state] ?? 0) + 1
    })
    return Object.entries(group).sort((a, b) => b[1] - a[1])
  }

  // ── Move forward one stage ────────────────────────────────────────────────

  async function moveForward(contact: Contact) {
    const toStage = FORWARD[contact.stage]
    if (!toStage) return
    setMovingId(contact.contact_id)
    const defaultState: Record<StageId, string> = {
      lead: 'new', customer_trial: 'active', customer_paid: 'active',
    }
    const extra: Record<string, unknown> = {}
    if (toStage === 'customer_trial' && !contact.trial_started_at) {
      const exp = new Date(); exp.setDate(exp.getDate() + 14)
      extra.trial_started_at = new Date().toISOString()
      extra.trial_expires_at = exp.toISOString()
    }
    await supabase.from('contact_stages').insert({
      contact_id: contact.contact_id,
      stage:      toStage,
      state:      defaultState[toStage],
      from_stage: contact.stage,
      from_state: contact.state,
      changed_by: 'manual',
      ...extra,
    })
    setMovingId(null)
    fetchContacts()
  }

  const tableContacts = activeStage
    ? contacts.filter(c => c.stage === activeStage)
    : contacts

  const cols = activeStage ? COLS[activeStage] : COLS.all

  function selectStage(s: StageId) {
    setActiveStage(prev => prev === s ? null : s)
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <Header title="Lifecycle Pipeline" subtitle="Lead → Trial → Paid" />
      <div className="p-6 space-y-6">

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex justify-between">
            {error} <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* ── Alert strip ──────────────────────────────────────────────────── */}
        {!loading && (atRisk.length > 0 || expiringSoon.length > 0 || inactive.length > 0 || paymentFailed.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { count: atRisk.length,        stage: 'customer_paid'   as StageId, title: 'At-Risk',          sub: 'Need check-in',         cls: 'border-red-200 bg-red-50 hover:bg-red-100',       num: 'text-red-500'    },
              { count: paymentFailed.length,  stage: 'customer_paid'   as StageId, title: 'Payment Failed',  sub: 'Stripe charge failed',  cls: 'border-red-300 bg-red-50 hover:bg-red-100',       num: 'text-red-600'    },
              { count: expiringSoon.length,   stage: 'customer_trial'  as StageId, title: 'Trials Expiring', sub: 'Within 3 days',         cls: 'border-amber-200 bg-amber-50 hover:bg-amber-100', num: 'text-amber-500'  },
              { count: inactive.length,       stage: 'customer_trial'  as StageId, title: 'Inactive Trials', sub: "Haven't activated",     cls: 'border-orange-200 bg-orange-50 hover:bg-orange-100', num: 'text-orange-500' },
            ].map(a => (
              <button key={a.title}
                onClick={() => selectStage(a.stage)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${a.count > 0 ? a.cls : 'border-gray-100 bg-gray-50 opacity-40 cursor-default'}`}
              >
                <span className={`text-2xl font-bold ${a.num}`}>{a.count}</span>
                <div>
                  <p className={`text-sm font-semibold ${a.num.replace('500','700')}`}>{a.title}</p>
                  <p className={`text-xs ${a.num.replace('500','400')}`}>{a.sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── KPI strip ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'MRR',           value: `$${totalMRR.toLocaleString()}`, color: 'text-emerald-600', dot: 'bg-emerald-400' },
            { label: 'Paying',        value: stageCounts.customer_paid,        color: 'text-emerald-600', dot: 'bg-emerald-400' },
            { label: 'Active trials', value: contacts.filter(c => c.stage === 'customer_trial' && c.state === 'active').length, color: 'text-blue-600', dot: 'bg-blue-400' },
            { label: 'Leads',         value: stageCounts.lead,                 color: 'text-amber-600',   dot: 'bg-amber-400' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
              <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
              <span className="text-xs text-slate-500">{s.label}</span>
              <span className={`text-sm font-bold ${s.color}`}>{loading ? '—' : s.value}</span>
            </div>
          ))}
        </div>

        {/* ── 3-Stage Funnel ───────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Conversion Funnel</p>

          <div className="flex flex-col gap-0">
            {FUNNEL.map((stageId, idx) => {
              const meta      = STAGE_META[stageId]
              const Icon      = meta.icon
              const count     = stageCounts[stageId]
              const baseCount = stageCounts.lead || 1
              const pct       = Math.round((count / baseCount) * 100)
              const isActive  = activeStage === stageId
              const prev      = idx > 0 ? stageCounts[FUNNEL[idx - 1]] : null
              const conv      = prev != null && prev > 0 ? Math.round((count / prev) * 100) : null
              const convColor = conv == null ? 'text-slate-300' : conv >= 50 ? 'text-emerald-600' : conv >= 20 ? 'text-amber-500' : 'text-red-500'
              const breakdown = stateBreakdown(stageId)

              return (
                <div key={stageId}>
                  {/* Connector */}
                  {idx > 0 && (
                    <div className="flex items-center gap-2 px-4 py-1">
                      <div className="flex flex-col items-center w-5 shrink-0">
                        <div className="w-px h-2 bg-gray-300" />
                        <div className="w-0 h-0" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid #d1d5db' }} />
                      </div>
                      <span className={`text-xs font-semibold ${convColor}`}>
                        {conv != null ? `${conv}% convert` : 'no data yet'}
                      </span>
                      {conv != null && <span className="text-xs text-slate-400 ml-auto">{100 - conv}% exit</span>}
                    </div>
                  )}

                  {/* Stage card */}
                  <button
                    onClick={() => selectStage(stageId)}
                    className={[
                      'w-full flex flex-col gap-2 px-4 py-3.5 rounded-xl border-2 transition-all text-left',
                      isActive
                        ? `${meta.bg} ${meta.border} ring-2 ring-offset-1 ring-orange-400 shadow-sm`
                        : 'bg-white border-orange-100 hover:border-orange-300 hover:shadow-sm',
                    ].join(' ')}
                  >
                    {/* Row 1: icon + label + count */}
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-slate-800">{meta.label}</span>
                        <span className="text-xs text-slate-400 ml-2">{meta.sublabel}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 shrink-0">
                        <span className={`text-2xl font-bold ${meta.color}`}>{loading ? '…' : count}</span>
                        {idx > 0 && <span className="text-xs text-slate-400">{pct}%</span>}
                      </div>
                    </div>

                    {/* Row 2: progress bar */}
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${meta.dot}`}
                        style={{ width: `${loading ? 0 : pct}%` }} />
                    </div>

                    {/* Row 3: state breakdown chips */}
                    {!loading && breakdown.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {breakdown.map(([state, n]) => (
                          <span key={state} className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATE_COLOR[state] ?? 'bg-gray-100 text-gray-600'}`}>
                            {state} · {n}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Stage-aware contact table ─────────────────────────────────────── */}
        <div ref={tableRef} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              {activeStage ? (
                <>
                  <span className={`h-2 w-2 rounded-full ${STAGE_META[activeStage].dot}`} />
                  {STAGE_META[activeStage].label}
                  <span className="text-slate-400 font-normal">({tableContacts.length})</span>
                </>
              ) : (
                <>All Contacts <span className="text-slate-400 font-normal">({contacts.length})</span></>
              )}
            </h3>
            {activeStage && (
              <button onClick={() => setActiveStage(null)}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <X className="h-3 w-3" /> Show all
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {cols.map(col => (
                      <th key={col.header} className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5 whitespace-nowrap">
                        {col.header}
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {tableContacts.length === 0 ? (
                    <tr>
                      <td colSpan={cols.length + 1} className="text-center py-12 text-slate-400 text-sm">
                        No contacts in this stage yet
                      </td>
                    </tr>
                  ) : tableContacts.map(c => {
                    const isExpanded  = expandedId === c.contact_id
                    const nextStage   = FORWARD[c.stage]
                    const nextMeta    = nextStage ? STAGE_META[nextStage] : null

                    return (
                      <Fragment key={c.contact_id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : c.contact_id)}
                          className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          {cols.map(col => (
                            <td key={col.header} className="px-4 py-3">
                              {col.render(c)}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <ChevronRight className={`h-4 w-4 text-slate-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {isExpanded && (
                          <tr className="bg-orange-50">
                            <td colSpan={cols.length + 1} className="px-6 py-4">
                              <div className="flex flex-wrap items-center gap-3">

                                {/* Forward move button */}
                                {nextMeta && (
                                  <button
                                    disabled={movingId === c.contact_id}
                                    onClick={e => { e.stopPropagation(); moveForward(c) }}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${nextMeta.bg} ${nextMeta.color} ${nextMeta.border} hover:opacity-80 disabled:opacity-40`}
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                    {movingId === c.contact_id ? 'Moving…' : `Move to ${nextMeta.label}`}
                                  </button>
                                )}

                                {/* Full profile */}
                                <button
                                  onClick={e => { e.stopPropagation(); router.push(`/contacts/${c.contact_id}`) }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors ml-auto"
                                >
                                  <UserCheck className="h-3 w-3" /> Full Profile
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
