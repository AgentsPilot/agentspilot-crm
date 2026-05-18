'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { Plus, X, Loader2, Megaphone, TrendingUp, DollarSign, Users } from 'lucide-react'

type Campaign = {
  id: string
  name: string
  channel: string | null
  status: 'active' | 'paused' | 'draft' | 'ended'
  budget: number
  spent: number
  start_date: string | null
  end_date: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  goal: string | null
  notes: string | null
  created_at: string
}

type CampaignWithLeads = Campaign & { leads: number; cr: number; cpl: number }

const statusVariant = { active: 'success', paused: 'warning', draft: 'neutral', ended: 'danger' } as const
const channelVariant: Record<string, 'indigo' | 'info' | 'danger' | 'success' | 'neutral'> = {
  Meta: 'indigo', Google: 'info', TikTok: 'danger',
  LinkedIn: 'success', Organic: 'success', Email: 'neutral', Other: 'neutral',
}

const emptyForm = {
  name: '', channel: 'Meta', status: 'draft', budget: '', spent: '',
  start_date: '', end_date: '', utm_source: '', utm_medium: '',
  utm_campaign: '', goal: '', notes: '',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithLeads[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')

  async function fetchCampaigns() {
    setLoading(true)
    const [{ data: camps, error: campErr }, { data: contacts }] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('campaign_name, status'),
    ])
    if (campErr) { setError(campErr.message); setLoading(false); return }

    // Join: count leads per campaign_name
    const enriched = (camps ?? []).map(c => {
      const campLeads = (contacts ?? []).filter(u => u.campaign_name === c.name)
      const leads = campLeads.length
      const converted = campLeads.filter(u => u.status === 'converted').length
      const cr = leads > 0 ? Math.round((converted / leads) * 100 * 10) / 10 : 0
      const cpl = leads > 0 && c.spent > 0 ? Math.round((c.spent / leads) * 10) / 10 : 0
      return { ...c, leads, cr, cpl }
    })
    setCampaigns(enriched)
    setLoading(false)
  }

  useEffect(() => { fetchCampaigns() }, [])

  async function addCampaign(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('campaigns').insert([{
      name: form.name,
      channel: form.channel || null,
      status: form.status,
      budget: Number(form.budget) || 0,
      spent: Number(form.spent) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      utm_source: form.utm_source || null,
      utm_medium: form.utm_medium || null,
      utm_campaign: form.utm_campaign || null,
      goal: form.goal || null,
      notes: form.notes || null,
    }])
    setSaving(false)
    if (error) { setError(error.message); return }
    setShowForm(false)
    setForm(emptyForm)
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

  const filtered = campaigns.filter(c => statusFilter === 'All' || c.status === statusFilter)
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0)
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)
  const avgCpl = totalLeads > 0 ? (totalSpent / totalLeads).toFixed(1) : '—'

  const inp = (key: keyof typeof emptyForm, label: string, type = 'text', opts?: string[]) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {opts ? (
        <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      )}
    </div>
  )

  return (
    <div>
      <Header title="Campaigns" subtitle="Track acquisition campaigns and lead results" />
      <div className="p-6 space-y-6">

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex justify-between">
            {error}<button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

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
          <div className="flex gap-2">
            {['All', 'active', 'paused', 'draft', 'ended'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-slate-600 hover:bg-gray-50'
                }`}>{s}</button>
            ))}
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" /> New Campaign
          </button>
        </div>

        {/* Add Campaign Form */}
        {showForm && (
          <div className="rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-900">New Campaign</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={addCampaign} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Campaign Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. May Meta — Strategy Call"
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {inp('channel', 'Channel', 'text', ['Meta', 'Google', 'TikTok', 'LinkedIn', 'Organic', 'Email', 'Other'])}
                {inp('status', 'Status', 'text', ['draft', 'active', 'paused', 'ended'])}
                {inp('budget', 'Budget ($)', 'number')}
                {inp('spent', 'Spent ($)', 'number')}
                {inp('start_date', 'Start Date', 'date')}
                {inp('end_date', 'End Date', 'date')}
                {inp('goal', 'Goal', 'text')}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">UTM Parameters</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {inp('utm_source', 'utm_source')}
                  {inp('utm_medium', 'utm_medium')}
                  {inp('utm_campaign', 'utm_campaign')}
                </div>
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
                  {saving ? 'Saving...' : 'Save Campaign'}
                </button>
              </div>
            </form>
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
              {campaigns.length === 0
                ? 'No campaigns yet — click New Campaign to add one.'
                : 'No campaigns match this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Campaign', 'Channel', 'Status', 'Budget', 'Spent', 'Leads', 'CR%', 'CPL', 'UTM Campaign', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{c.name}</p>
                        {c.goal && <p className="text-xs text-slate-400 mt-0.5">{c.goal}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {c.channel && <Badge label={c.channel} variant={channelVariant[c.channel] ?? 'neutral'} />}
                      </td>
                      <td className="px-4 py-3">
                        <select value={c.status}
                          onChange={e => updateStatus(c.id, e.target.value as Campaign['status'])}
                          className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            c.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            c.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                            c.status === 'ended' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                          {['active', 'paused', 'draft', 'ended'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-700">${c.budget.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">${c.spent.toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium text-indigo-600">{c.leads}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${c.cr >= 10 ? 'text-emerald-600' : c.cr >= 5 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {c.cr > 0 ? `${c.cr}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.cpl > 0 ? `$${c.cpl}` : '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{c.utm_campaign ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteCampaign(c.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
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
                      {totalLeads > 0 ? `${Math.round((campaigns.reduce((s,c) => s + c.leads * c.cr, 0) / totalLeads) * 10) / 10}%` : '—'}
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
