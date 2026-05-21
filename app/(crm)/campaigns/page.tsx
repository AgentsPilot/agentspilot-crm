'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { Plus, X, Loader2, Megaphone, TrendingUp, DollarSign, Users, Pencil, Eye, Copy, Check } from 'lucide-react'

type Campaign = {
  id: string
  name: string
  channel: string | null
  status: 'active' | 'paused' | 'draft' | 'ended'
  budget: number
  spent: number
  impressions: number
  clicks: number
  start_date: string | null
  end_date: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  goal: string | null
  notes: string | null
  created_at: string
}

type CampaignWithLeads = Campaign & { leads: number; cr: number; cpl: number; ctr: number; landingCr: number }

const statusVariant = { active: 'success', paused: 'warning', draft: 'neutral', ended: 'danger' } as const
const channelVariant: Record<string, 'indigo' | 'info' | 'danger' | 'success' | 'neutral'> = {
  Meta: 'indigo', Google: 'info', TikTok: 'danger',
  LinkedIn: 'success', Organic: 'success', Email: 'neutral', Other: 'neutral',
}

const emptyForm = {
  name: '', channel: 'Meta', status: 'draft' as Campaign['status'],
  budget: '', spent: '', impressions: '', clicks: '',
  start_date: '', end_date: '',
  utm_source: '', utm_medium: '', utm_campaign: '', goal: '', notes: '',
}

function FormField({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputCls = (err?: string) =>
  `px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${err ? 'border-red-400' : 'border-gray-200'}`

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithLeads[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })
  const [showForm, setShowForm] = useState(false)
  const [editCampaign, setEditCampaign] = useState<CampaignWithLeads | null>(null)
  const [viewCampaign, setViewCampaign] = useState<CampaignWithLeads | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const BASE_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/landing`
    : '/landing'

  function buildUtmUrl(c: Campaign) {
    const params = new URLSearchParams()
    if (c.utm_source) params.set('utm_source', c.utm_source)
    if (c.utm_medium) params.set('utm_medium', c.utm_medium)
    if (c.utm_campaign) params.set('utm_campaign', c.utm_campaign)
    return `${BASE_URL}?${params.toString()}`
  }

  function copyUrl(c: Campaign) {
    navigator.clipboard.writeText(buildUtmUrl(c))
    setCopiedId(c.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function fetchCampaigns() {
    setLoading(true)
    const [{ data: camps, error: campErr }, { data: contacts }] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('campaign_name, status'),
    ])
    if (campErr) { setLoading(false); return }
    const enriched = (camps ?? []).map(c => {
      const campLeads = (contacts ?? []).filter(u => u.campaign_name === c.name)
      const leads = campLeads.length
      const converted = campLeads.filter(u => u.status === 'converted').length
      const cr = leads > 0 ? Math.round((converted / leads) * 100 * 10) / 10 : 0
      const cpl = leads > 0 && c.spent > 0 ? Math.round((c.spent / leads) * 10) / 10 : 0
      const ctr = c.impressions > 0 ? Math.round((c.clicks / c.impressions) * 100 * 10) / 10 : 0
      const landingCr = c.clicks > 0 ? Math.round((leads / c.clicks) * 100 * 10) / 10 : 0
      return { ...c, leads, cr, cpl, ctr, landingCr }
    })
    setCampaigns(enriched)
    setLoading(false)
  }

  useEffect(() => { fetchCampaigns() }, [])

  function validate(f: typeof emptyForm) {
    const errors: Record<string, string> = {}
    if (!f.name.trim()) errors.name = 'Campaign name is required'
    if (!f.utm_source.trim()) errors.utm_source = 'Required'
    if (!f.utm_medium.trim()) errors.utm_medium = 'Required'
    if (!f.utm_campaign.trim()) errors.utm_campaign = 'Required'
    return errors
  }

  function openAdd() {
    setForm(emptyForm)
    setFieldErrors({})
    setFormError(null)
    setEditCampaign(null)
    setShowForm(true)
  }

  function openEdit(c: CampaignWithLeads) {
    setForm({
      name: c.name, channel: c.channel ?? 'Meta', status: c.status,
      budget: String(c.budget), spent: String(c.spent),
      impressions: String(c.impressions ?? 0), clicks: String(c.clicks ?? 0),
      start_date: c.start_date ?? '', end_date: c.end_date ?? '',
      utm_source: c.utm_source ?? '', utm_medium: c.utm_medium ?? '',
      utm_campaign: c.utm_campaign ?? '', goal: c.goal ?? '', notes: c.notes ?? '',
    })
    setFieldErrors({})
    setFormError(null)
    setEditCampaign(c)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditCampaign(null)
    setFormError(null)
    setFieldErrors({})
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault()
    const errors = validate(form)
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setFieldErrors({})
    setFormError(null)
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      channel: form.channel || null,
      status: form.status,
      budget: Number(form.budget) || 0,
      spent: Number(form.spent) || 0,
      impressions: Number(form.impressions) || 0,
      clicks: Number(form.clicks) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      utm_source: form.utm_source || null,
      utm_medium: form.utm_medium || null,
      utm_campaign: form.utm_campaign || null,
      goal: form.goal || null,
      notes: form.notes || null,
    }

    const { error } = editCampaign
      ? await supabase.from('campaigns').update(payload).eq('id', editCampaign.id)
      : await supabase.from('campaigns').insert([payload])

    setSaving(false)
    if (error) { setFormError(error.message); return }
    closeForm()
    fetchCampaigns()
  }

  async function updateStatus(id: string, status: Campaign['status']) {
    await supabase.from('campaigns').update({ status }).eq('id', id)
    fetchCampaigns()
  }

  async function deleteCampaign(id: string) {
    await supabase.from('campaigns').delete().eq('id', id)
    fetchCampaigns()
  }

  const filtered = campaigns.filter(c => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false
    if (dateFilter.from && c.start_date && c.start_date < dateFilter.from) return false
    if (dateFilter.to && c.start_date && c.start_date > dateFilter.to) return false
    return true
  })

  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0)
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)
  const avgCpl = totalLeads > 0 ? (totalSpent / totalLeads).toFixed(1) : '—'

  return (
    <div>
      <Header title="Campaigns" subtitle="Track acquisition campaigns and lead results" />
      <div className="p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active', value: campaigns.filter(c => c.status === 'active').length, icon: Megaphone, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Leads', value: totalLeads, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Total Spent', value: `$${totalSpent.toLocaleString()}`, icon: DollarSign, color: 'text-slate-900', bg: 'bg-slate-50' },
            { label: 'Avg CPL', value: `$${avgCpl}`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>
                  {loading ? <span className="animate-pulse bg-gray-100 rounded h-6 w-10 inline-block" /> : s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + Add */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap gap-2 items-center">
            {['All', 'active', 'paused', 'draft', 'ended'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-slate-600 hover:bg-gray-50'
                }`}>{s}</button>
            ))}
            <div className="flex items-center gap-1 text-xs text-slate-500 border border-gray-200 rounded-lg bg-white px-3 py-1.5 gap-2">
              <span className="text-slate-400">From</span>
              <input type="date" value={dateFilter.from} onChange={e => setDateFilter(f => ({ ...f, from: e.target.value }))}
                className="text-xs text-slate-700 focus:outline-none bg-transparent" />
              <span className="text-slate-400">To</span>
              <input type="date" value={dateFilter.to} onChange={e => setDateFilter(f => ({ ...f, to: e.target.value }))}
                className="text-xs text-slate-700 focus:outline-none bg-transparent" />
              {(dateFilter.from || dateFilter.to) && (
                <button onClick={() => setDateFilter({ from: '', to: '' })} className="text-slate-400 hover:text-red-400">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" /> New Campaign
          </button>
        </div>

        {/* Add/Edit Campaign Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeForm}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-slate-900">
                  {editCampaign ? 'Edit Campaign' : 'New Campaign'}
                </h3>
                <button onClick={closeForm}><X className="h-4 w-4 text-slate-400" /></button>
              </div>
              <form onSubmit={saveForm} className="p-6 space-y-4">
                {formError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex justify-between">
                    {formError}<button type="button" onClick={() => setFormError(null)}><X className="h-4 w-4" /></button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <FormField label="Campaign Name" required error={fieldErrors.name}>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. LinkedIn Outreach — May 2026"
                        className={inputCls(fieldErrors.name)} />
                    </FormField>
                  </div>
                  <FormField label="Channel">
                    <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} className={inputCls()}>
                      {['Meta', 'Google', 'TikTok', 'LinkedIn', 'Organic', 'Email', 'Other'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Status">
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Campaign['status'] }))} className={inputCls()}>
                      {['draft', 'active', 'paused', 'ended'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Budget ($)">
                    <input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className={inputCls()} placeholder="0" />
                  </FormField>
                  <FormField label="Spent ($)">
                    <input type="number" value={form.spent} onChange={e => setForm(f => ({ ...f, spent: e.target.value }))} className={inputCls()} placeholder="0" />
                  </FormField>
                  <FormField label="Impressions">
                    <input type="number" value={form.impressions} onChange={e => setForm(f => ({ ...f, impressions: e.target.value }))} className={inputCls()} placeholder="0" />
                  </FormField>
                  <FormField label="Clicks">
                    <input type="number" value={form.clicks} onChange={e => setForm(f => ({ ...f, clicks: e.target.value }))} className={inputCls()} placeholder="0" />
                  </FormField>
                  <FormField label="Start Date">
                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={inputCls()} />
                  </FormField>
                  <FormField label="End Date">
                    <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className={inputCls()} />
                  </FormField>
                  <div className="col-span-2">
                    <FormField label="Goal">
                      <input value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} placeholder="e.g. Generate 50 qualified leads" className={inputCls()} />
                    </FormField>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">UTM Parameters</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField label="utm_source" required error={fieldErrors.utm_source}>
                      <input value={form.utm_source} onChange={e => setForm(f => ({ ...f, utm_source: e.target.value }))} placeholder="e.g. linkedin" className={inputCls(fieldErrors.utm_source)} />
                    </FormField>
                    <FormField label="utm_medium" required error={fieldErrors.utm_medium}>
                      <input value={form.utm_medium} onChange={e => setForm(f => ({ ...f, utm_medium: e.target.value }))} placeholder="e.g. paid_social" className={inputCls(fieldErrors.utm_medium)} />
                    </FormField>
                    <FormField label="utm_campaign" required error={fieldErrors.utm_campaign}>
                      <input value={form.utm_campaign} onChange={e => setForm(f => ({ ...f, utm_campaign: e.target.value }))} placeholder="e.g. linkedin_may_2026" className={inputCls(fieldErrors.utm_campaign)} />
                    </FormField>
                  </div>
                </div>

                <FormField label="Notes">
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                    className={`${inputCls()} resize-none`} />
                </FormField>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeForm}
                    className="px-4 py-2 text-sm text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {saving ? 'Saving...' : editCampaign ? 'Save Changes' : 'Save Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Campaign Modal */}
        {viewCampaign && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewCampaign(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-slate-900">{viewCampaign.name}</h3>
                <button onClick={() => setViewCampaign(null)}><X className="h-4 w-4 text-slate-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Channel', value: viewCampaign.channel ?? '—' },
                    { label: 'Status', value: viewCampaign.status },
                    { label: 'Budget', value: `$${viewCampaign.budget.toLocaleString()}` },
                    { label: 'Spent', value: `$${viewCampaign.spent.toLocaleString()}` },
                    { label: 'Start Date', value: viewCampaign.start_date ?? '—' },
                    { label: 'End Date', value: viewCampaign.end_date ?? '—' },
                    { label: 'Impressions', value: viewCampaign.impressions > 0 ? viewCampaign.impressions.toLocaleString() : '—' },
                    { label: 'Clicks', value: viewCampaign.clicks > 0 ? viewCampaign.clicks.toLocaleString() : '—' },
                    { label: 'CTR%', value: viewCampaign.ctr > 0 ? `${viewCampaign.ctr}%` : '—' },
                    { label: 'Leads', value: viewCampaign.leads },
                    { label: 'Landing CR%', value: viewCampaign.landingCr > 0 ? `${viewCampaign.landingCr}%` : '—' },
                    { label: 'CPL', value: viewCampaign.cpl > 0 ? `$${viewCampaign.cpl}` : '—' },
                  ].map(r => (
                    <div key={r.label}>
                      <p className="text-xs text-slate-400">{r.label}</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{r.value}</p>
                    </div>
                  ))}
                </div>
                {viewCampaign.goal && (
                  <div>
                    <p className="text-xs text-slate-400">Goal</p>
                    <p className="text-sm text-slate-700 mt-0.5">{viewCampaign.goal}</p>
                  </div>
                )}
                {(viewCampaign.utm_source || viewCampaign.utm_medium || viewCampaign.utm_campaign) && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">UTM Parameters</p>
                    {viewCampaign.utm_source && <p className="text-xs text-slate-600"><span className="text-slate-400">source:</span> {viewCampaign.utm_source}</p>}
                    {viewCampaign.utm_medium && <p className="text-xs text-slate-600"><span className="text-slate-400">medium:</span> {viewCampaign.utm_medium}</p>}
                    {viewCampaign.utm_campaign && <p className="text-xs text-slate-600"><span className="text-slate-400">campaign:</span> {viewCampaign.utm_campaign}</p>}
                  </div>
                )}

                {/* UTM Tracking URL */}
                {viewCampaign.utm_source && (
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">📋 Tracking URL — paste this into LinkedIn</p>
                    <p className="text-xs text-indigo-700 break-all font-mono mb-2">{buildUtmUrl(viewCampaign)}</p>
                    <button onClick={() => copyUrl(viewCampaign)}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                      {copiedId === viewCampaign.id
                        ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copied!</>
                        : <><Copy className="h-3.5 w-3.5" /> Copy link</>}
                    </button>
                  </div>
                )}
                {viewCampaign.notes && (
                  <div>
                    <p className="text-xs text-slate-400">Notes</p>
                    <p className="text-sm text-slate-700 mt-0.5">{viewCampaign.notes}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setViewCampaign(null); openEdit(viewCampaign) }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
                    <Pencil className="h-3.5 w-3.5" /> Edit Campaign
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading campaigns...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-sm">
              {campaigns.length === 0 ? 'No campaigns yet — click New Campaign to add one.' : 'No campaigns match this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Campaign', 'Channel', 'Status', 'Impressions', 'Clicks', 'CTR%', 'Leads', 'Landing CR%', 'CPL', 'Start Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{c.name}</p>
                        {c.goal && <p className="text-xs text-slate-400 mt-0.5 max-w-48 truncate">{c.goal}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {c.channel && <Badge label={c.channel} variant={channelVariant[c.channel] ?? 'neutral'} />}
                      </td>
                      <td className="px-4 py-3">
                        <select value={c.status} onChange={e => updateStatus(c.id, e.target.value as Campaign['status'])}
                          className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            c.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            c.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                            c.status === 'ended' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                          {['active', 'paused', 'draft', 'ended'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.impressions > 0 ? c.impressions.toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{c.clicks > 0 ? c.clicks.toLocaleString() : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${c.ctr >= 3 ? 'text-emerald-600' : c.ctr >= 1 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {c.ctr > 0 ? `${c.ctr}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-indigo-600">{c.leads}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${c.landingCr >= 10 ? 'text-emerald-600' : c.landingCr >= 5 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {c.landingCr > 0 ? `${c.landingCr}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.cpl > 0 ? `$${c.cpl}` : '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{c.start_date ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewCampaign(c)} className="text-slate-300 hover:text-indigo-400 transition-colors" title="View">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(c)} className="text-slate-300 hover:text-amber-400 transition-colors" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => copyUrl(c)} className="text-slate-300 hover:text-emerald-400 transition-colors" title="Copy UTM link">
                            {copiedId === c.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                          </button>
                          <button onClick={() => deleteCampaign(c.id)} className="text-slate-300 hover:text-red-400 transition-colors" title="Delete">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-500">Totals</td>
                    <td className="px-4 py-2 text-xs font-bold text-slate-700">${totalBudget.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs font-bold text-slate-700">${totalSpent.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs font-bold text-indigo-600">{totalLeads}</td>
                    <td className="px-4 py-2 text-xs font-bold text-amber-600">
                      {totalLeads > 0 ? `${Math.round((campaigns.reduce((s, c) => s + c.leads * c.cr, 0) / totalLeads) * 10) / 10}%` : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs font-bold text-amber-600">${avgCpl}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
