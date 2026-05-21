'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { Plus, X, Loader2, DollarSign, Users, TrendingUp, Zap } from 'lucide-react'

type Deal = {
  id: string
  contact_name: string
  contact_email: string | null
  company: string | null
  value: number
  channel: string | null
  campaign_name: string | null
  stage: Stage
  priority: 'High' | 'Medium' | 'Low'
  notes: string | null
  is_draft: boolean
  created_at: string
  updated_at: string
}

type Stage = 'New Lead' | 'Contacted' | 'Qualified' | 'Proposal Sent' | 'Won' | 'Lost'

const STAGES: Stage[] = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost']

const stageStyle: Record<Stage, { dot: string; headerBg: string; headerBorder: string }> = {
  'New Lead':      { dot: 'bg-sky-500',     headerBg: 'bg-sky-50',     headerBorder: 'border-sky-500/20' },
  'Contacted':     { dot: 'bg-indigo-500',  headerBg: 'bg-indigo-500/10',  headerBorder: 'border-indigo-500/20' },
  'Qualified':     { dot: 'bg-violet-500',  headerBg: 'bg-violet-500/10',  headerBorder: 'border-violet-500/20' },
  'Proposal Sent': { dot: 'bg-amber-500',   headerBg: 'bg-amber-50',   headerBorder: 'border-amber-500/20' },
  'Won':           { dot: 'bg-emerald-500', headerBg: 'bg-emerald-50', headerBorder: 'border-emerald-500/20' },
  'Lost':          { dot: 'bg-red-400',     headerBg: 'bg-red-50',     headerBorder: 'border-red-500/20' },
}

const priorityVariant = { High: 'danger', Medium: 'warning', Low: 'neutral' } as const
const channelVariant: Record<string, 'indigo' | 'info' | 'danger' | 'success' | 'neutral'> = {
  Meta: 'indigo', Google: 'info', TikTok: 'danger', Organic: 'success',
  Email: 'neutral', LinkedIn: 'info', Other: 'neutral',
}

const emptyForm = {
  contact_name: '', contact_email: '', company: '', value: '',
  channel: 'Organic', campaign_name: '', stage: 'New Lead' as Stage,
  priority: 'Medium' as 'High' | 'Medium' | 'Low', notes: '',
}

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)

  async function fetchDeals() {
    setLoading(true)
    const { data, error } = await supabase
      .from('pipeline_deals')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setDeals(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchDeals() }, [])

  async function addDeal(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('pipeline_deals').insert([{
      contact_name: form.contact_name,
      contact_email: form.contact_email || null,
      company: form.company || null,
      value: Number(form.value) || 0,
      channel: form.channel,
      campaign_name: form.campaign_name || null,
      stage: form.stage,
      priority: form.priority,
      notes: form.notes || null,
    }])
    setSaving(false)
    if (error) { setError(error.message); return }
    setShowForm(false)
    setForm(emptyForm)
    fetchDeals()
  }

  async function moveStage(deal: Deal, direction: 'forward' | 'back') {
    const idx = STAGES.indexOf(deal.stage)
    const nextIdx = direction === 'forward' ? idx + 1 : idx - 1
    if (nextIdx < 0 || nextIdx >= STAGES.length) return
    const newStage = STAGES[nextIdx]
    setMovingId(deal.id)
    await supabase
      .from('pipeline_deals')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', deal.id)
    setMovingId(null)
    fetchDeals()
  }

  async function deleteDeal(id: string) {
    await supabase.from('pipeline_deals').delete().eq('id', id)
    fetchDeals()
  }

  async function activateDeal(deal: Deal) {
    await supabase.from('pipeline_deals')
      .update({ is_draft: false, updated_at: new Date().toISOString() })
      .eq('id', deal.id)

    await supabase.from('tasks').insert([{
      title: `Follow up with ${deal.contact_name}`,
      contact_name: deal.contact_name,
      type: 'Follow-up',
      priority: 'High',
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      done: false,
      notes: `Auto-created when deal activated. Campaign: ${deal.campaign_name ?? '—'}`,
    }])

    fetchDeals()
  }

  const totalPipeline = deals
    .filter(d => !['Won', 'Lost'].includes(d.stage))
    .reduce((s, d) => s + d.value, 0)
  const totalWon = deals.filter(d => d.stage === 'Won').reduce((s, d) => s + d.value, 0)
  const winRate = deals.length > 0
    ? Math.round((deals.filter(d => d.stage === 'Won').length / deals.length) * 100)
    : 0

  const f = (key: keyof typeof emptyForm, label: string, opts?: string[]) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {opts ? (
        <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700">
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
      )}
    </div>
  )

  return (
    <div>
      <Header title="Pipeline" subtitle="Track every lead through your sales stages" />
      <div className="p-6 space-y-6">

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-500/20 px-4 py-3 text-sm text-red-600 flex justify-between">
            {error}
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Deals', value: deals.filter(d => !['Won','Lost'].includes(d.stage)).length, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'Pipeline Value', value: `$${totalPipeline.toLocaleString()}`, icon: DollarSign, color: 'text-orange-500', bg: 'bg-orange-50' },
            { label: 'Won Value', value: `$${totalWon.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>
                  {loading ? <span className="animate-pulse bg-gray-100 rounded h-6 w-12 inline-block" /> : s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Add Deal button */}
        <div className="flex justify-end">
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-slate-900 text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
            <Plus className="h-4 w-4" /> Add Deal
          </button>
        </div>

        {/* Add Deal Form — white */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-900">Add New Deal</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={addDeal} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Contact Name *</label>
                  <input required value={form.contact_name}
                    onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
                </div>
                {f('contact_email', 'Email')}
                {f('company', 'Company')}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Deal Value ($)</label>
                  <input type="number" value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
                </div>
                {f('channel', 'Channel', ['Meta', 'Google', 'TikTok', 'LinkedIn', 'Organic', 'Email', 'Other'])}
                {f('campaign_name', 'Campaign')}
                {f('stage', 'Stage', [...STAGES])}
                {f('priority', 'Priority', ['High', 'Medium', 'Low'])}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-slate-700" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-orange-500 text-slate-900 rounded-lg hover:bg-orange-600 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Deal'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Kanban Board */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading pipeline...
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {STAGES.map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage)
                const stageValue = stageDeals.reduce((s, d) => s + d.value, 0)
                const { dot, headerBg, headerBorder } = stageStyle[stage]
                return (
                  <div key={stage} className="w-64 flex flex-col gap-2">
                    {/* Column header */}
                    <div className={`rounded-lg border ${headerBorder} ${headerBg} p-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${dot}`} />
                          <span className="text-xs font-semibold text-slate-700">{stage}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{stageDeals.length}</span>
                      </div>
                      {stageValue > 0 && (
                        <p className="text-xs text-slate-500 mt-1">${stageValue.toLocaleString()}</p>
                      )}
                    </div>

                    {/* Cards */}
                    <div className="space-y-2">
                      {stageDeals.map(deal => {
                        const stageIdx = STAGES.indexOf(deal.stage)
                        const isDraft = deal.is_draft
                        return (
                          <div key={deal.id} className={`rounded-xl border p-4 transition-shadow ${
                            isDraft
                              ? 'border-dashed border-zinc-600 bg-white opacity-70'
                              : 'border-gray-200 bg-white hover:border-[#444]'
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className={`text-sm font-semibold truncate ${isDraft ? 'text-slate-500' : 'text-white'}`}>
                                    {deal.contact_name}
                                  </p>
                                  {isDraft && (
                                    <span className="text-xs bg-zinc-700 text-slate-500 px-1.5 py-0.5 rounded font-medium shrink-0">Draft</span>
                                  )}
                                </div>
                                {deal.company && <p className="text-xs text-slate-400 truncate">{deal.company}</p>}
                              </div>
                              <button onClick={() => deleteDeal(deal.id)} className="ml-1 text-slate-600 hover:text-red-600 transition-colors shrink-0">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {deal.value > 0 && (
                              <p className="text-sm font-bold text-orange-500 mb-2">${deal.value.toLocaleString()}</p>
                            )}

                            <div className="flex items-center gap-1.5 flex-wrap mb-3">
                              <Badge label={deal.priority} variant={priorityVariant[deal.priority]} />
                              {deal.channel && (
                                <Badge label={deal.channel} variant={channelVariant[deal.channel] ?? 'neutral'} />
                              )}
                            </div>

                            {deal.campaign_name && (
                              <p className="text-xs text-slate-400 truncate mb-2">{deal.campaign_name}</p>
                            )}

                            {/* Activate button for drafts */}
                            {isDraft ? (
                              <button onClick={() => activateDeal(deal)}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-orange-500 border border-orange-500/30 rounded-lg hover:bg-orange-50 transition-colors mt-2">
                                <Zap className="h-3.5 w-3.5" /> Activate → Create Task
                              </button>
                            ) : (
                            /* Move buttons */
                            <div className="flex gap-1 mt-2">
                              {stageIdx > 0 && (
                                <button onClick={() => moveStage(deal, 'back')} disabled={movingId === deal.id}
                                  className="flex-1 py-1 text-xs text-slate-500 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                                  ← Back
                                </button>
                              )}
                              {stageIdx < STAGES.length - 1 && (
                                <button onClick={() => moveStage(deal, 'forward')} disabled={movingId === deal.id}
                                  className="flex-1 py-1 text-xs font-medium text-orange-500 border border-orange-500/30 rounded hover:bg-orange-50 transition-colors">
                                  {movingId === deal.id ? '...' : 'Move →'}
                                </button>
                              )}
                            </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {stageDeals.length === 0 && (
                      <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center text-xs text-slate-600">
                        No deals
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

