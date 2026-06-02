'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import {
  Clock, AlertTriangle, CheckCircle2, Loader2, RotateCcw,
  Play, Tag, BarChart2, ArrowRight, Circle,
  ChevronDown, ChevronUp,
} from 'lucide-react'

type ContactState = {
  contact_id:  string
  first_name:  string
  last_name:   string | null
  email:       string | null
  stage:       string
  state:       string
  lead_score:  number | null
  tags:        string[]
  notes:       string | null
  changed_at:  string | null
}

type StageRow = {
  id:         string
  stage:      string
  state:      string
  from_stage: string | null
  from_state: string | null
  changed_by: string
  notes:      string | null
  changed_at: string
}

type StepDef = {
  id:          string
  label:       string
  from:        string
  to:          string
  tagAdded:    string | null
  scoreDelta:  number | null
  description: string
  emoji:       string
}

const STEPS: StepDef[] = [
  {
    id:          'new_lead_followup',
    label:       'Step 1 — First Contact',
    from:        'new',
    to:          'contacted',
    tagAdded:    'contacted',
    scoreDelta:  null,
    description: '24-hour follow-up fires. Lead Follow-up task → In Progress. State: new → contacted.',
    emoji:       '📨',
  },
  {
    id:          'lead_reminder_7d',
    label:       'Step 2 — 7-Day Reminder',
    from:        'contacted',
    to:          'reminded_7d',
    tagAdded:    'reminder-7d-sent',
    scoreDelta:  -10,
    description: 'No response after 7 days. Reminder email sent. Score −10. State: contacted → reminded_7d.',
    emoji:       '📬',
  },
  {
    id:          'lead_reminder_21d',
    label:       'Step 3 — 21-Day Final Reminder',
    from:        'reminded_7d',
    to:          'reminded_21d',
    tagAdded:    'reminder-21d-sent',
    scoreDelta:  -15,
    description: 'Still no response at 21 days. Final reminder sent. Score −15. State: reminded_7d → reminded_21d.',
    emoji:       '⏰',
  },
  {
    id:          'lead_cold_30d',
    label:       'Step 4 — Mark Cold',
    from:        'reminded_21d',
    to:          'cold',
    tagAdded:    'cold',
    scoreDelta:  -25,
    description: 'No trial signup after 30-day sequence. Lead marked cold. Score −25. State: reminded_21d → cold.',
    emoji:       '🧊',
  },
]

function ScoreBar({ score, prev }: { score: number | null; prev: number | null }) {
  if (score === null) return <span className="text-slate-400 text-sm">Not set</span>
  const color = score >= 70 ? 'bg-emerald-400' : score >= 40 ? 'bg-amber-400' : 'bg-red-400'
  const text  = score >= 70 ? 'text-emerald-700' : score >= 40 ? 'text-amber-700' : 'text-red-600'
  const delta = prev !== null && prev !== score ? score - prev : null
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-2xl font-bold ${text}`}>{score}</span>
        {delta !== null && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${delta < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <p className={`text-xs mt-1 ${text}`}>
        {score >= 70 ? '🔥 Hot' : score >= 40 ? '🌡 Warm' : '❄️ Cold'}
      </p>
    </div>
  )
}

function StatePill({ state }: { state: string }) {
  const map: Record<string, string> = {
    new:          'bg-blue-100 text-blue-700',
    contacted:    'bg-indigo-100 text-indigo-700',
    reminded_7d:  'bg-amber-100 text-amber-700',
    reminded_21d: 'bg-orange-100 text-orange-700',
    cold:         'bg-slate-200 text-slate-600',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[state] ?? 'bg-gray-100 text-gray-600'}`}>
      {state}
    </span>
  )
}

export default function E2EDemoPage() {
  const [contacts, setContacts]       = useState<ContactState[]>([])
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [contact, setContact]         = useState<ContactState | null>(null)
  const [prevContact, setPrevContact] = useState<ContactState | null>(null)
  const [timeline, setTimeline]       = useState<StageRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [running, setRunning]         = useState<string | null>(null)
  const [resetting, setResetting]     = useState(false)
  const [lastResult, setLastResult]   = useState<{ rule: string; message: string; ok: boolean } | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)

  useEffect(() => {
    supabase
      .from('contacts_current')
      .select('contact_id, first_name, last_name, email, stage, state, lead_score, tags, notes, changed_at')
      .eq('stage', 'lead')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as ContactState[]
        setContacts(rows)
        if (rows.length) setSelectedId(rows[0].contact_id)
        setLoading(false)
      })
  }, [])

  const loadContact = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('contacts_current')
      .select('contact_id, first_name, last_name, email, stage, state, lead_score, tags, notes, changed_at')
      .eq('contact_id', id)
      .single()
    if (data) {
      setContact(prev => { setPrevContact(prev); return data as ContactState })
    }
    const { data: stages } = await supabase
      .from('contact_stages')
      .select('id, stage, state, from_stage, from_state, changed_by, notes, changed_at')
      .eq('contact_id', id)
      .order('changed_at', { ascending: false })
      .limit(20)
    setTimeline((stages ?? []) as StageRow[])
  }, [])

  useEffect(() => { if (selectedId) loadContact(selectedId) }, [selectedId, loadContact])

  async function runStep(ruleId: string) {
    if (!selectedId) return
    setRunning(ruleId)
    setLastResult(null)
    try {
      const res  = await fetch(`/api/cron/lifecycle?demo=true&rule=${ruleId}&contact_id=${selectedId}`)
      const json = await res.json()
      const processed = json.results?.[ruleId] ?? 0
      setLastResult({
        rule:    ruleId,
        message: processed > 0 ? 'Rule fired — contact updated.' : 'Rule skipped (contact may already be past this state).',
        ok:      processed > 0,
      })
      await loadContact(selectedId)
    } catch (e) {
      setLastResult({ rule: ruleId, message: String(e), ok: false })
    } finally {
      setRunning(null)
    }
  }

  async function resetContact() {
    if (!selectedId) return
    setResetting(true)
    setLastResult(null)
    try {
      const res  = await fetch('/api/e2e/reset', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contact_id: selectedId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Reset failed')
      setLastResult({ rule: 'reset', message: 'Contact reset to state: new, score: 50.', ok: true })
      await loadContact(selectedId)
    } catch (e) {
      setLastResult({ rule: 'reset', message: String(e), ok: false })
    } finally {
      setResetting(false)
    }
  }

  function currentStepIndex(): number {
    if (!contact) return -1
    const s = contact.state
    if (s === 'new')          return 0
    if (s === 'contacted')    return 1
    if (s === 'reminded_7d')  return 2
    if (s === 'reminded_21d') return 3
    if (s === 'cold')         return 4
    return -1
  }

  const stepIdx = currentStepIndex()

  if (loading) {
    return (
      <div>
        <Header title="E2E Demo" subtitle="Walk through the full automated lead lifecycle" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin h-6 w-6 text-orange-500" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="E2E Demo" subtitle="Walk through the full automated lead lifecycle — demo mode bypasses time checks" />
      <div className="p-6 space-y-6">
        <p className="text-sm text-slate-500">
          Walk through every stage of the automated lead journey. Each button fires a single
          lifecycle rule and shows how state, score and tags update in real time.
        </p>

        {/* Contact picker */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
            Select Lead
          </label>
          {contacts.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No leads found. Create one first via Add Contact.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contacts.map(c => (
                <button
                  key={c.contact_id}
                  onClick={() => setSelectedId(c.contact_id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    selectedId === c.contact_id
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-slate-700 border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                  <span className="ml-1.5 opacity-60 text-xs">{c.state}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {contact && (
          <>
            {/* State / Score / Tags cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Current State</p>
                <StatePill state={contact.state} />
                <p className="text-xs text-slate-400 mt-2">Stage: <span className="font-medium text-slate-600">{contact.stage}</span></p>
                {contact.changed_at && (
                  <p className="text-xs text-slate-400 mt-0.5">Since: {new Date(contact.changed_at).toLocaleDateString()}</p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Lead Score</p>
                <ScoreBar score={contact.lead_score} prev={prevContact?.lead_score ?? null} />
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Tags</p>
                {contact.tags?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-full text-xs font-medium">
                        <Tag className="h-2.5 w-2.5" />{t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No tags yet — run steps to add them</p>
                )}
              </div>
            </div>

            {/* Result banner */}
            {lastResult && (
              <div className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm font-medium border ${
                lastResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {lastResult.ok
                  ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  : <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                <span><strong>{lastResult.rule}:</strong> {lastResult.message}</span>
              </div>
            )}

            {/* Steps */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-orange-500" /> Lifecycle Steps
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Run each step in order. Demo mode bypasses time checks — no waiting required.
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {STEPS.map((step, i) => {
                  const isDone    = stepIdx > i
                  const isCurrent = stepIdx === i
                  return (
                    <div
                      key={step.id}
                      className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                        isCurrent ? 'bg-orange-50/60' : isDone ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : isCurrent ? (
                          <div className="h-5 w-5 rounded-full border-2 border-orange-400 bg-orange-100 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                          </div>
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{step.emoji} {step.label}</span>
                          <span className="text-xs text-slate-400">
                            {step.from} <ArrowRight className="inline h-3 w-3" /> {step.to}
                          </span>
                          {step.scoreDelta && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                              Score {step.scoreDelta}
                            </span>
                          )}
                          {step.tagAdded && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium flex items-center gap-1">
                              <Tag className="h-2.5 w-2.5" />{step.tagAdded}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                      </div>
                      <button
                        onClick={() => runStep(step.id)}
                        disabled={!!running || resetting || isDone}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isDone
                            ? 'bg-emerald-50 text-emerald-600 cursor-default'
                            : isCurrent
                            ? 'bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50'
                            : 'bg-gray-100 text-slate-400 hover:bg-gray-200 disabled:opacity-40'
                        }`}
                      >
                        {running === step.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isDone ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {isDone ? 'Done' : running === step.id ? 'Running…' : 'Run'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {stepIdx >= 4
                    ? '🧊 Sequence complete — lead is cold. Reset to run again.'
                    : `Step ${Math.min(stepIdx + 1, 4)} of 4`}
                </p>
                <button
                  onClick={resetContact}
                  disabled={!!running || resetting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {resetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  Reset to New
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowTimeline(v => !v)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Stage History
                  <span className="ml-1 text-xs font-normal text-slate-400">({timeline.length} entries)</span>
                </h2>
                {showTimeline ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {showTimeline && (
                <div className="border-t border-gray-100">
                  {timeline.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-slate-400 italic">No stage transitions yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {timeline.map((row, i) => (
                        <div key={row.id ?? i} className="px-5 py-3 flex items-start gap-3">
                          <div className="mt-1 h-2 w-2 rounded-full bg-orange-300 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-700 capitalize">{row.stage}</span>
                              {row.from_state && (
                                <>
                                  <span className="text-xs text-slate-400">·</span>
                                  <span className="text-xs text-slate-500">
                                    {row.from_state} <ArrowRight className="inline h-2.5 w-2.5" /> {row.state}
                                  </span>
                                </>
                              )}
                              <span className="text-xs text-slate-400 ml-auto">
                                {new Date(row.changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            {row.notes && <p className="text-xs text-slate-500 mt-0.5 italic">{row.notes}</p>}
                            <p className="text-xs text-slate-300 mt-0.5">by {row.changed_by}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
