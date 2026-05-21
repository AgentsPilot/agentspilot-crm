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

const stageStyle: Record<Stage, { header: string; bg: string; border: string }> = {
  'New Lead':      { header: 'bg-sky-500',     bg: 'bg-sky-50',     border: 'border-sky-200' },
  'Contacted':     { header: 'bg-indigo-500',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  'Qualified':     { header: 'bg-violet-500',  bg: 'bg-violet-50',  border: 'border-violet-200' },
  'Proposal Sent': { header: 'bg-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  'Won':           { header: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'Lost':          { header: 'bg-red-400',     bg: 'bg-red-50',     border: 'border-red-200' },
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
    // Mark deal as active
    await supabase.from('pipeline_deals')
      .update({ is_draft: false, updated_at: new Date().toISOString() })
      .eq('id', deal.id)

    // Auto-create a follow-up task
    await supabase.from('tasks').insert([{
      title: `Follow up with ${deal.contact_name}`,
      contact_name: deal.contact_name,
      type: 'Follow-up',
      priority: 'High',
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
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
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      )}
    </div>
  )

  return (
    <div>
      <Header title="Pipeline" subtitle="Track every lead through your sales stages" />
      <div className="p-6 space-y-6">

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex justify-between">
            {error}
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Deals', value: deals.filter(d => !['Won','Lost'].includes(d.stage)).length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Pipeline Value', value: `$${totalPipeline.toLocaleString()}`, icon: DollarSign, color: 'text-slate-900', bg: 'bg-slate-50' },
            { label: 'Won Value', value: `$${totalWon.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>
                  {loading ? <span className="animate-pulse bg-gray-200 rounded h-6 w-12 inline-block" /> : s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Add Deal button */}
        <div className="flex justify-end">
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" /> Add Deal
          </button>
        </div>

        {/* Add Deal Form */}
        {showForm && (
          <div className="rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">
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
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {f('contact_email', 'Email')}
                {f('company', 'Company')}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Deal Value ($)</label>
                  <input type="number" value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {f('channel', 'Channel', ['Meta', 'Google', 'TikTok', 'LinkedIn', 'Organic', 'Email', 'Other'])}
                {f('campaign_name', 'Campaign')}
                {f('stage', 'Stage', [...STAGES])}
                {f('priority', 'Priority', ['High', 'Medium', 'Low'])}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Deal'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Kanban Board */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading pipeline...
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {STAGES.map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage)
                const stageValue = stageDeals.reduce((s, d) => s + d.value, 0)
                const { header, bg, border } = stageStyle[stage]
                return (
                  <div key={stage} className="w-64 flex flex-col gap-2">
                    {/* Column header */}
                    <div className={`rounded-lg border ${border} ${bg} p-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${header}`} />
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
                          <div key={deal.id} className={`rounded-xl border p-4 shadow-sm transition-shadow ${
                            isDraft
                              ? 'border-dashed border-slate-300 bg-slate-50 opacity-75'
                              : 'border-gray-200 bg-white hover:shadow-md'
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className={`text-sm font-semibold truncate ${isDraft ? 'text-slate-500' : 'text-slate-900'}`}>
                                    {deal.contact_name}
                                  </p>
                                  {isDraft && (
                                    <span className="text-xs bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-medium shrink-0">Draft</span>
                                  )}
                                </div>
                                {deal.company && <p className="text-xs text-slate-400 truncate">{deal.company}</p>}
                              </div>
                              <button onClick={() => deleteDeal(deal.id)} className="ml-1 text-slate-200 hover:text-red-400 transition-colors shrink-0">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {deal.value > 0 && (
                              <p className="text-sm font-bold text-slate-800 mb-2">${deal.value.toLocaleString()}</p>
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
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors mt-2">
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
                                  className="flex-1 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors">
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
                      <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center text-xs text-slate-300">
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
