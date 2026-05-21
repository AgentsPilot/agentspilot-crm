'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { Search, Filter, Plus, X, Loader2, Link, ChevronDown, ChevronUp } from 'lucide-react'

type User = {
  id: string
  full_name: string
  email: string
  phone: string | null
  country: string | null
  city: string | null
  language: string | null
  channel: string | null
  campaign_name: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  ad_id: string | null
  status: 'lead' | 'active' | 'converted' | 'inactive'
  funnel_level: 'Awareness' | 'Interest' | 'Consideration' | 'Intent' | 'Converted'
  lead_score: number
  created_at: string
  converted_at: string | null
  last_active_at: string
  notes: string | null
  tags: string[]
}

const statusVariant = { active: 'success', converted: 'indigo', lead: 'warning', inactive: 'neutral' } as const
const levelVariant = { Awareness: 'neutral', Interest: 'info', Consideration: 'warning', Intent: 'indigo', Converted: 'success' } as const

const emptyForm = {
  full_name: '', email: '', phone: '', country: '', city: '', language: 'EN',
  channel: 'Organic', campaign_name: '', utm_source: '', utm_medium: '',
  utm_campaign: '', utm_content: '', utm_term: '', ad_id: '',
  status: 'lead', funnel_level: 'Awareness', lead_score: 0, notes: '',
}

function parseUtmFromUrl(raw: string, setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>) {
  try {
    const url = new URL(raw.includes('://') ? raw : 'https://' + raw)
    const p = url.searchParams
    setForm(f => ({
      ...f,
      utm_source: p.get('utm_source') ?? f.utm_source,
      utm_medium: p.get('utm_medium') ?? f.utm_medium,
      utm_campaign: p.get('utm_campaign') ?? f.utm_campaign,
      utm_content: p.get('utm_content') ?? f.utm_content,
      utm_term: p.get('utm_term') ?? f.utm_term,
    }))
  } catch {}
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [utmUrl, setUtmUrl] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('users').insert([{
      ...form,
      lead_score: Number(form.lead_score),
      phone: form.phone || null,
      country: form.country || null,
      city: form.city || null,
      campaign_name: form.campaign_name || null,
      utm_source: form.utm_source || null,
      utm_medium: form.utm_medium || null,
      utm_campaign: form.utm_campaign || null,
      utm_content: form.utm_content || null,
      utm_term: form.utm_term || null,
      ad_id: form.ad_id || null,
      notes: form.notes || null,
    }]).select().single()
    if (error) { setSaving(false); setError(error.message); return }

    // Auto-create draft pipeline deal
    await supabase.from('pipeline_deals').insert([{
      contact_name: form.full_name,
      contact_email: form.email || null,
      channel: form.channel || null,
      campaign_name: form.campaign_name || null,
      stage: 'New Lead',
      priority: 'Medium',
      value: 0,
      is_draft: true,
      notes: `Auto-created from contact. Source: ${form.utm_source || form.channel || 'manual'}`,
    }])

    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
    setUtmUrl('')
    fetchUsers()
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (
      (!search || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) ||
        (u.campaign_name ?? '').toLowerCase().includes(q)) &&
      (channelFilter === 'All' || u.channel === channelFilter) &&
      (statusFilter === 'All' || u.status === statusFilter)
    )
  })

  const summary = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    converted: users.filter(u => u.status === 'converted').length,
    leads: users.filter(u => u.status === 'lead').length,
  }

  const field = (label: string, key: keyof typeof emptyForm, type = 'text', opts?: string[]) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {opts ? (
        <select value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700">
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
      )}
    </div>
  )

  return (
    <div>
      <Header title="Contacts" subtitle={loading ? 'Loading...' : `${summary.total} total contacts`} />
      <div className="p-6 space-y-6">

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Contacts', value: summary.total, color: 'text-white' },
            { label: 'Active', value: summary.active, color: 'text-emerald-400' },
            { label: 'Converted', value: summary.converted, color: 'text-orange-400' },
            { label: 'Leads', value: summary.leads, color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[#222] bg-[#1a1a1a] p-4">
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                {loading ? <span className="animate-pulse bg-zinc-800 rounded h-7 w-10 inline-block" /> : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters + Add */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input type="text" placeholder="Search name, email or campaign..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm border border-[#333] rounded-lg bg-[#1a1a1a] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <Filter className="h-4 w-4 text-zinc-500" />
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
            className="text-sm border border-[#333] rounded-lg px-3 py-2 bg-[#1a1a1a] text-zinc-300">
            {['All', 'Meta', 'Google', 'TikTok', 'LinkedIn', 'Organic', 'Email', 'Other'].map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-[#333] rounded-lg px-3 py-2 bg-[#1a1a1a] text-zinc-300">
            {['All', 'lead', 'active', 'converted', 'inactive'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
            <Plus className="h-4 w-4" /> Add Contact
          </button>
        </div>

        {/* Add User Form — white form as requested */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-900">Add New Contact</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={addUser} className="space-y-5">

              {/* Basic info */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Basic Info</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Full Name *</label>
                    <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
                  </div>
                  {field('Phone', 'phone')}
                  {field('Country', 'country')}
                  {field('City', 'city')}
                  {field('Language', 'language', 'text', ['EN', 'HE', 'ES', 'FR', 'DE', 'PT', 'AR', 'Other'])}
                </div>
              </div>

              {/* Acquisition */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Acquisition</p>

                {/* UTM URL Parser */}
                <div className="mb-3 flex gap-2">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" placeholder="Paste landing page URL to auto-fill UTM fields..."
                      value={utmUrl} onChange={e => setUtmUrl(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
                  </div>
                  <button type="button" onClick={() => parseUtmFromUrl(utmUrl, setForm)}
                    className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                    Parse
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {field('Channel', 'channel', 'text', ['Meta', 'Google', 'TikTok', 'LinkedIn', 'Organic', 'Email', 'Other'])}
                  {field('Campaign Name', 'campaign_name')}
                  {field('Ad ID', 'ad_id')}
                  <div />
                  {field('utm_source', 'utm_source')}
                  {field('utm_medium', 'utm_medium')}
                  {field('utm_campaign', 'utm_campaign')}
                  {field('utm_content', 'utm_content')}
                </div>
              </div>

              {/* Funnel */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Funnel</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {field('Status', 'status', 'text', ['lead', 'active', 'converted', 'inactive'])}
                  {field('Funnel Level', 'funnel_level', 'text', ['Awareness', 'Interest', 'Consideration', 'Intent', 'Converted'])}
                  {field('Lead Score (0–100)', 'lead_score', 'number')}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-slate-700" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-[#222] bg-[#1a1a1a] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading contacts...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-zinc-600">
              {users.length === 0
                ? <p>No contacts yet — click <strong className="text-zinc-400">Add Contact</strong> to add your first one.</p>
                : 'No contacts match your filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#111] border-b border-[#222]">
                  <tr>
                    {['Name', 'Status', 'Level', 'Channel', 'Campaign', 'UTM Source', 'Country', 'Date', 'Score', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {filtered.map(user => (
                    <>
                      <tr key={user.id} className="hover:bg-[#222] transition-colors cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === user.id ? null : user.id)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{user.full_name}</p>
                          <p className="text-xs text-zinc-500">{user.email}</p>
                        </td>
                        <td className="px-4 py-3"><Badge label={user.status} variant={statusVariant[user.status]} /></td>
                        <td className="px-4 py-3"><Badge label={user.funnel_level} variant={levelVariant[user.funnel_level]} /></td>
                        <td className="px-4 py-3 text-zinc-300">{user.channel ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-500 text-xs max-w-32 truncate">{user.campaign_name ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">{user.utm_source ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-500">{user.country ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold text-sm ${user.lead_score >= 70 ? 'text-emerald-400' : user.lead_score >= 40 ? 'text-amber-400' : 'text-zinc-600'}`}>
                            {user.lead_score}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {expandedRow === user.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </td>
                      </tr>
                      {expandedRow === user.id && (
                        <tr key={user.id + '-exp'} className="bg-[#111]">
                          <td colSpan={10} className="px-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                              {[
                                { label: 'Phone', value: user.phone },
                                { label: 'City', value: user.city },
                                { label: 'Language', value: user.language },
                                { label: 'Ad ID', value: user.ad_id },
                                { label: 'utm_medium', value: user.utm_medium },
                                { label: 'utm_campaign', value: user.utm_campaign },
                                { label: 'utm_content', value: user.utm_content },
                                { label: 'utm_term', value: user.utm_term },
                                { label: 'Converted At', value: user.converted_at ? new Date(user.converted_at).toLocaleDateString() : null },
                                { label: 'Last Active', value: new Date(user.last_active_at).toLocaleDateString() },
                              ].map(f => (
                                <div key={f.label}>
                                  <p className="text-zinc-600 font-medium">{f.label}</p>
                                  <p className="text-zinc-300 mt-0.5">{f.value ?? '—'}</p>
                                </div>
                              ))}
                              {user.notes && (
                                <div className="col-span-2 md:col-span-5">
                                  <p className="text-zinc-600 font-medium">Notes</p>
                                  <p className="text-zinc-300 mt-0.5">{user.notes}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-[#222] px-4 py-3 text-xs text-zinc-600">
            {loading ? 'Loading...' : `Showing ${filtered.length} of ${users.length} contacts`}
          </div>
        </div>

      </div>
    </div>
  )
}
