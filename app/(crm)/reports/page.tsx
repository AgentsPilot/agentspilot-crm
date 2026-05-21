'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { Loader2, ChevronDown } from 'lucide-react'

type Contact = {
  id: string
  full_name: string | null
  email: string | null
  utm_source: string | null
  channel: string | null
  campaign_name: string | null
  status: string | null
  funnel_level: string | null
  lead_score: number | null
  country: string | null
  created_at: string
}

type Deal = {
  id: string
  stage: string
  value: number
  channel: string | null
  campaign_name: string | null
}

type Campaign = {
  id: string
  name: string
  channel: string | null
  status: string
  budget: number | null
  spend: number | null
}

type Task = {
  id: string
  type: string
  done: boolean
  due_date: string | null
}

const FUNNEL_LEVELS = ['Awareness', 'Interest', 'Consideration', 'Intent', 'Converted']
const STAGES = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost']

const channelColor: Record<string, string> = {
  Meta: '#6366f1', Google: '#0ea5e9', TikTok: '#f43f5e',
  LinkedIn: '#3b82f6', Organic: '#10b981', Email: '#f59e0b',
  facebook: '#6366f1', google: '#0ea5e9', tiktok: '#f43f5e',
  email: '#f59e0b', Other: '#94a3b8',
}

const stageColor: Record<string, string> = {
  'New Lead': '#0ea5e9', 'Contacted': '#6366f1', 'Qualified': '#8b5cf6',
  'Proposal Sent': '#f59e0b', 'Won': '#10b981', 'Lost': '#f87171',
}

const funnelColor: Record<string, string> = {
  Awareness: '#94a3b8', Interest: '#6366f1', Consideration: '#8b5cf6',
  Intent: '#f59e0b', Converted: '#10b981',
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
    </div>
  )
}

// Build ISO week key: "2026-W20"
function weekKey(dateStr: string) {
  const d = new Date(dateStr)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - jan4.getDay() + 1) // Monday
  const dayDiff = Math.floor((d.getTime() - startOfWeek1.getTime()) / 86400000)
  const week = Math.floor(dayDiff / 7) + 1
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function shortWeek(key: string) {
  // "2026-W20" → "W20"
  return key.split('-')[1]
}

export default function ReportsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<string>('__all__')

  useEffect(() => {
    async function load() {
      const [c, d, ca, t] = await Promise.all([
        supabase.from('users').select('id,full_name,email,utm_source,channel,campaign_name,status,funnel_level,lead_score,country,created_at'),
        supabase.from('pipeline_deals').select('id,stage,value,channel,campaign_name'),
        supabase.from('campaigns').select('id,name,channel,status,budget,spend'),
        supabase.from('tasks').select('id,type,done,due_date'),
      ])
      setContacts(c.data ?? [])
      setDeals(d.data ?? [])
      setCampaigns(ca.data ?? [])
      setTasks(t.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // ── Channel breakdown ──────────────────────────────────────────────────────
  const channelMap: Record<string, { leads: number; won: number; wonValue: number; spend: number }> = {}
  contacts.forEach(c => {
    const ch = c.channel ?? c.utm_source ?? 'Other'
    if (!channelMap[ch]) channelMap[ch] = { leads: 0, won: 0, wonValue: 0, spend: 0 }
    channelMap[ch].leads++
    if (c.status === 'converted') channelMap[ch].won++
  })
  deals.filter(d => d.stage === 'Won').forEach(d => {
    const ch = d.channel ?? 'Other'
    if (!channelMap[ch]) channelMap[ch] = { leads: 0, won: 0, wonValue: 0, spend: 0 }
    channelMap[ch].wonValue += d.value
  })
  campaigns.forEach(c => {
    const ch = c.channel ?? 'Other'
    if (!channelMap[ch]) channelMap[ch] = { leads: 0, won: 0, wonValue: 0, spend: 0 }
    channelMap[ch].spend += c.spend ?? 0
  })
  const channelRows = Object.entries(channelMap)
    .map(([ch, v]) => ({
      ch,
      leads: v.leads,
      cr: pct(v.won, v.leads),
      cpl: v.spend > 0 && v.leads > 0 ? Math.round(v.spend / v.leads) : 0,
      wonValue: v.wonValue,
      spend: v.spend,
    }))
    .sort((a, b) => b.leads - a.leads)
  const maxLeads = Math.max(...channelRows.map(r => r.leads), 1)

  // ── Funnel breakdown ───────────────────────────────────────────────────────
  const funnelRows = FUNNEL_LEVELS.map(level => ({
    level,
    count: contacts.filter(c => c.funnel_level === level).length,
  }))
  const maxFunnel = Math.max(...funnelRows.map(r => r.count), 1)

  // ── Pipeline stages ────────────────────────────────────────────────────────
  const stageRows = STAGES.map(stage => ({
    stage,
    count: deals.filter(d => d.stage === stage).length,
    value: deals.filter(d => d.stage === stage).reduce((s, d) => s + d.value, 0),
  }))

  // ── Campaign performance + ROI ─────────────────────────────────────────────
  const campRows = campaigns.map(c => {
    const campContacts = contacts.filter(x => x.campaign_name === c.name)
    const leads = campContacts.length
    const converted = campContacts.filter(x => x.status === 'converted').length
    const wonDeals = deals.filter(d => d.campaign_name === c.name && d.stage === 'Won')
    const wonValue = wonDeals.reduce((s, d) => s + d.value, 0)
    const spend = c.spend ?? 0
    const budget = c.budget ?? 0
    const roi = spend > 0 ? Math.round(((wonValue - spend) / spend) * 100) : null
    return {
      name: c.name,
      channel: c.channel ?? '—',
      status: c.status,
      leads,
      cr: pct(converted, leads),
      cpl: spend > 0 && leads > 0 ? Math.round(spend / leads) : 0,
      wonValue,
      spend,
      budget,
      budgetPct: budget > 0 ? pct(spend, budget) : 0,
      roi,
    }
  }).sort((a, b) => b.leads - a.leads)

  // ── Campaign ROI ranking ───────────────────────────────────────────────────
  const roiRows = [...campRows]
    .filter(r => r.spend > 0 || r.wonValue > 0)
    .sort((a, b) => (b.roi ?? -Infinity) - (a.roi ?? -Infinity))

  // ── Leads over time (last 10 weeks) ───────────────────────────────────────
  const now = new Date()
  const weeks: string[] = []
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weeks.push(weekKey(d.toISOString()))
  }
  const weekMap: Record<string, number> = {}
  weeks.forEach(w => { weekMap[w] = 0 })
  contacts.forEach(c => {
    const wk = weekKey(c.created_at)
    if (wk in weekMap) weekMap[wk]++
  })
  const weekData = weeks.map(w => ({ week: w, count: weekMap[w] }))
  const maxWeekCount = Math.max(...weekData.map(w => w.count), 1)

  // ── Funnel by campaign ─────────────────────────────────────────────────────
  const campFunnelRows = campaigns.map(c => {
    const campDeals = deals.filter(d => d.campaign_name === c.name)
    const stageBreakdown = STAGES.map(stage => ({
      stage,
      count: campDeals.filter(d => d.stage === stage).length,
    }))
    const total = campDeals.length
    return { name: c.name, stageBreakdown, total }
  }).filter(r => r.total > 0)

  // ── Task completion ────────────────────────────────────────────────────────
  const taskTypeMap: Record<string, { done: number; total: number }> = {}
  tasks.forEach(t => {
    if (!taskTypeMap[t.type]) taskTypeMap[t.type] = { done: 0, total: 0 }
    taskTypeMap[t.type].total++
    if (t.done) taskTypeMap[t.type].done++
  })
  const taskRows = Object.entries(taskTypeMap)
    .map(([type, v]) => ({ type, ...v, cr: pct(v.done, v.total) }))
    .sort((a, b) => b.total - a.total)

  // ── Lead score distribution ────────────────────────────────────────────────
  const scoreBuckets = [
    { label: '0–24', min: 0, max: 24 },
    { label: '25–49', min: 25, max: 49 },
    { label: '50–74', min: 50, max: 74 },
    { label: '75–100', min: 75, max: 100 },
  ].map(b => ({
    ...b,
    count: contacts.filter(c => (c.lead_score ?? 0) >= b.min && (c.lead_score ?? 0) <= b.max).length,
  }))
  const maxScore = Math.max(...scoreBuckets.map(b => b.count), 1)

  // ── Top countries ──────────────────────────────────────────────────────────
  const countryMap: Record<string, number> = {}
  contacts.forEach(c => { if (c.country) countryMap[c.country] = (countryMap[c.country] ?? 0) + 1 })
  const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxCountry = Math.max(...topCountries.map(([, n]) => n), 1)

  // ── Summary KPIs ───────────────────────────────────────────────────────────
  const totalLeads = contacts.length
  const totalConverted = contacts.filter(c => c.status === 'converted').length
  const totalWonValue = deals.filter(d => d.stage === 'Won').reduce((s, d) => s + d.value, 0)
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0)
  const overallCR = pct(totalConverted, totalLeads)
  const overallCPL = totalSpend > 0 && totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0
  const avgLeadScore = contacts.length > 0
    ? Math.round(contacts.reduce((s, c) => s + (c.lead_score ?? 0), 0) / contacts.length)
    : 0
  const overallROI = totalSpend > 0 ? Math.round(((totalWonValue - totalSpend) / totalSpend) * 100) : null

  const summaryKpis = [
    { label: 'Total Leads', value: totalLeads, color: 'text-sky-600' },
    { label: 'Conversion Rate', value: `${overallCR}%`, color: 'text-violet-600' },
    { label: 'Won Revenue', value: `$${totalWonValue.toLocaleString()}`, color: 'text-emerald-600' },
    { label: 'Total Spend', value: `$${totalSpend.toLocaleString()}`, color: 'text-amber-600' },
    { label: 'Avg CPL', value: overallCPL > 0 ? `$${overallCPL}` : '—', color: 'text-orange-500' },
    { label: 'Overall ROI', value: overallROI !== null ? `${overallROI > 0 ? '+' : ''}${overallROI}%` : '—', color: overallROI !== null && overallROI >= 0 ? 'text-emerald-600' : 'text-red-500' },
  ]

  // ── Deep-dive contacts ─────────────────────────────────────────────────────
  const deepDiveContacts = selectedCampaign === '__all__'
    ? contacts
    : contacts.filter(c => c.campaign_name === selectedCampaign)

  const campaignNames = Array.from(new Set(contacts.map(c => c.campaign_name).filter(Boolean))) as string[]

  return (
    <div>
      <Header title="Reports" subtitle="Performance analytics across all CRM data" />
      <div className="p-6 space-y-6">

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {summaryKpis.map(k => (
            <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>
                {loading ? <span className="animate-pulse bg-gray-100 rounded h-7 w-14 inline-block" /> : k.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── NEW: Leads Over Time ─────────────────────────────────────────── */}
        <Card>
          <SectionTitle title="Leads Over Time" sub="New leads per week — last 10 weeks" />
          {loading ? <LoadingRow /> : (
            <div className="flex items-end gap-2 h-36">
              {weekData.map(w => (
                <div key={w.week} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-xs font-semibold text-slate-700">{w.count > 0 ? w.count : ''}</span>
                  <div className="w-full bg-gray-100 rounded-t-md overflow-hidden flex flex-col justify-end" style={{ height: '96px' }}>
                    <div
                      className="w-full bg-orange-400 rounded-t-md transition-all"
                      style={{ height: `${Math.max((w.count / maxWeekCount) * 100, w.count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 truncate w-full text-center">{shortWeek(w.week)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── NEW: Campaign ROI Ranking ────────────────────────────────────── */}
        <Card>
          <SectionTitle title="Campaign ROI Ranking" sub="Return on investment per campaign — Won Revenue vs Spend" />
          {loading ? <LoadingRow /> : roiRows.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No spend data yet — add budget & spend to campaigns to see ROI.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['#', 'Campaign', 'Channel', 'Spend', 'Won Revenue', 'ROI %', 'Leads', 'CR%', 'CPL'].map(h => (
                      <th key={h} className="pb-2 text-left text-xs font-medium text-slate-500 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {roiRows.map((r, i) => {
                    const roiColor = r.roi === null ? 'text-slate-400' : r.roi >= 100 ? 'text-emerald-600' : r.roi >= 0 ? 'text-amber-600' : 'text-red-500'
                    const roiBg = r.roi === null ? '' : r.roi >= 100 ? 'bg-emerald-50' : r.roi >= 0 ? 'bg-amber-50' : 'bg-red-50'
                    return (
                      <tr key={r.name} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4 text-xs font-bold text-slate-400">#{i + 1}</td>
                        <td className="py-3 pr-4 text-xs font-medium text-slate-900 max-w-40 truncate">{r.name}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: channelColor[r.channel] ?? '#94a3b8' }} />
                            <span className="text-xs text-slate-500">{r.channel}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-700">{r.spend > 0 ? `$${r.spend.toLocaleString()}` : '—'}</td>
                        <td className="py-3 pr-4 text-xs font-semibold text-emerald-600">{r.wonValue > 0 ? `$${r.wonValue.toLocaleString()}` : '—'}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roiColor} ${roiBg}`}>
                            {r.roi !== null ? `${r.roi >= 0 ? '+' : ''}${r.roi}%` : '—'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-700">{r.leads}</td>
                        <td className="py-3 pr-4 text-xs font-semibold" style={{ color: r.cr >= 20 ? '#10b981' : r.cr >= 10 ? '#f97316' : '#f59e0b' }}>{r.cr}%</td>
                        <td className="py-3 pr-4 text-xs text-slate-700">{r.cpl > 0 ? `$${r.cpl}` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── NEW: Funnel by Campaign ──────────────────────────────────────── */}
        <Card>
          <SectionTitle title="Pipeline Funnel by Campaign" sub="Where each campaign's deals currently sit in the pipeline" />
          {loading ? <LoadingRow /> : campFunnelRows.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No pipeline deals linked to campaigns yet.</p>
          ) : (
            <div className="space-y-4">
              {campFunnelRows.map(row => (
                <div key={row.name} className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-slate-700 truncate max-w-xs">{row.name}</p>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">{row.total} deal{row.total !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex gap-0.5 h-4 rounded-full overflow-hidden">
                    {row.stageBreakdown.filter(s => s.count > 0).map(s => (
                      <div
                        key={s.stage}
                        title={`${s.stage}: ${s.count}`}
                        className="h-full transition-all"
                        style={{
                          width: `${(s.count / row.total) * 100}%`,
                          backgroundColor: stageColor[s.stage],
                          minWidth: '4px',
                        }}
                      />
                    ))}
                    {row.total === 0 && <div className="h-full w-full bg-gray-100 rounded-full" />}
                  </div>
                  <div className="flex gap-3 flex-wrap mt-1">
                    {row.stageBreakdown.filter(s => s.count > 0).map(s => (
                      <div key={s.stage} className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: stageColor[s.stage] }} />
                        <span className="text-xs text-slate-500">{s.stage} <span className="font-semibold text-slate-700">{s.count}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── NEW: Campaign Deep-Dive ──────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle title="Campaign Deep-Dive" sub="All contacts generated by a specific campaign" />
            <div className="relative shrink-0">
              <select
                value={selectedCampaign}
                onChange={e => setSelectedCampaign(e.target.value)}
                className="pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
              >
                <option value="__all__">All campaigns</option>
                {campaignNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {loading ? <LoadingRow /> : deepDiveContacts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No contacts for this campaign yet.</p>
          ) : (
            <>
              {/* Mini KPIs for selected campaign */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Contacts', value: deepDiveContacts.length, color: 'text-sky-600' },
                  { label: 'Converted', value: deepDiveContacts.filter(c => c.status === 'converted').length, color: 'text-emerald-600' },
                  { label: 'Conversion Rate', value: `${pct(deepDiveContacts.filter(c => c.status === 'converted').length, deepDiveContacts.length)}%`, color: 'text-violet-600' },
                  { label: 'Avg Lead Score', value: deepDiveContacts.length > 0 ? Math.round(deepDiveContacts.reduce((s, c) => s + (c.lead_score ?? 0), 0) / deepDiveContacts.length) : 0, color: 'text-orange-500' },
                ].map(k => (
                  <div key={k.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
                    <p className="text-xs text-slate-500">{k.label}</p>
                    <p className={`text-xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Name', 'Email', 'Status', 'Funnel Level', 'Lead Score', 'Channel', 'Date'].map(h => (
                        <th key={h} className="pb-2 text-left text-xs font-medium text-slate-500 pr-4 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {deepDiveContacts.slice(0, 50).map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 pr-4 text-xs font-medium text-slate-900">{c.full_name ?? '—'}</td>
                        <td className="py-2.5 pr-4 text-xs text-slate-500">{c.email ?? '—'}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                            c.status === 'active' ? 'bg-sky-100 text-sky-700' :
                            c.status === 'lead' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{c.status ?? 'lead'}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-slate-500">{c.funnel_level ?? '—'}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`text-xs font-bold ${(c.lead_score ?? 0) >= 70 ? 'text-emerald-600' : (c.lead_score ?? 0) >= 40 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {c.lead_score ?? 0}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-slate-500">{c.channel ?? c.utm_source ?? '—'}</td>
                        <td className="py-2.5 pr-4 text-xs text-slate-400 whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {deepDiveContacts.length > 50 && (
                  <p className="text-xs text-slate-400 text-center pt-3">Showing first 50 of {deepDiveContacts.length} contacts</p>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Existing sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Leads by Channel */}
          <Card>
            <SectionTitle title="Leads by Channel" sub="Source attribution from UTM data" />
            {loading ? <LoadingRow /> : (
              <div className="space-y-3">
                {channelRows.map(r => (
                  <div key={r.ch} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-20 shrink-0">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: channelColor[r.ch] ?? '#94a3b8' }} />
                      <span className="text-xs text-slate-700 truncate">{r.ch}</span>
                    </div>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.max((r.leads / maxLeads) * 100, 4)}%`, backgroundColor: channelColor[r.ch] ?? '#94a3b8', opacity: 0.75 }} />
                    </div>
                    <span className="w-6 text-xs font-semibold text-slate-700 text-right">{r.leads}</span>
                    <span className="w-10 text-xs text-slate-400 text-right">{pct(r.leads, totalLeads)}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Funnel Breakdown */}
          <Card>
            <SectionTitle title="Lead Funnel" sub="Contacts by funnel stage" />
            {loading ? <LoadingRow /> : (
              <div className="space-y-3">
                {funnelRows.map((r, i) => (
                  <div key={r.level} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-slate-500 shrink-0">{r.level}</div>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.max((r.count / maxFunnel) * 100, r.count > 0 ? 4 : 0)}%`, backgroundColor: funnelColor[r.level] }} />
                    </div>
                    <span className="w-6 text-xs font-semibold text-slate-700 text-right">{r.count}</span>
                    {i > 0 && funnelRows[i - 1].count > 0 && (
                      <span className="w-12 text-xs text-slate-400 text-right">
                        {pct(r.count, funnelRows[i - 1].count)}% CR
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Pipeline Stages */}
        <Card>
          <SectionTitle title="Pipeline Stages" sub="Deal distribution and value by stage" />
          {loading ? <LoadingRow /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {stageRows.map(r => (
                <div key={r.stage} className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
                  <div className="h-2 w-2 rounded-full mx-auto mb-2" style={{ backgroundColor: stageColor[r.stage] }} />
                  <p className="text-xs text-slate-500 mb-1">{r.stage}</p>
                  <p className="text-2xl font-bold" style={{ color: stageColor[r.stage] }}>{r.count}</p>
                  {r.value > 0 && <p className="text-xs text-slate-400 mt-1">${r.value.toLocaleString()}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Campaign Performance Table */}
        <Card>
          <SectionTitle title="Campaign Performance" sub="Leads, conversions, spend and ROI per campaign" />
          {loading ? <LoadingRow /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Campaign', 'Channel', 'Status', 'Leads', 'CR%', 'CPL', 'Won $', 'Spend', 'Budget'].map(h => (
                      <th key={h} className="pb-2 text-left text-xs font-medium text-slate-500 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campRows.map(r => (
                    <tr key={r.name} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 text-xs font-medium text-slate-900 max-w-40 truncate">{r.name}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: channelColor[r.channel] ?? '#94a3b8' }} />
                          <span className="text-xs text-slate-500">{r.channel}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          r.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>{r.status}</span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-700">{r.leads}</td>
                      <td className="py-3 pr-4 text-xs font-semibold" style={{ color: r.cr >= 20 ? '#10b981' : r.cr >= 10 ? '#f97316' : '#f59e0b' }}>{r.cr}%</td>
                      <td className="py-3 pr-4 text-xs text-slate-700">{r.cpl > 0 ? `$${r.cpl}` : '—'}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-emerald-600">{r.wonValue > 0 ? `$${r.wonValue.toLocaleString()}` : '—'}</td>
                      <td className="py-3 pr-4 text-xs text-slate-700">${r.spend.toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${r.budgetPct >= 90 ? 'bg-red-400' : r.budgetPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(r.budgetPct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-400">{r.budgetPct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={3} className="py-2.5 text-xs font-semibold text-slate-500">Totals</td>
                    <td className="py-2.5 text-xs font-bold text-slate-900">{totalLeads}</td>
                    <td className="py-2.5 text-xs font-bold text-violet-600">{overallCR}%</td>
                    <td className="py-2.5 text-xs font-bold text-slate-900">{overallCPL > 0 ? `$${overallCPL}` : '—'}</td>
                    <td className="py-2.5 text-xs font-bold text-emerald-600">${totalWonValue.toLocaleString()}</td>
                    <td className="py-2.5 text-xs font-bold text-slate-900">${totalSpend.toLocaleString()}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Lead Score Distribution */}
          <Card>
            <SectionTitle title="Lead Score Distribution" sub="Contacts by score bucket" />
            {loading ? <LoadingRow /> : (
              <div className="space-y-3">
                {scoreBuckets.map(b => (
                  <div key={b.label} className="flex items-center gap-3">
                    <div className="w-14 text-xs text-slate-500 shrink-0">{b.label}</div>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full opacity-80" style={{ width: `${Math.max((b.count / maxScore) * 100, b.count > 0 ? 4 : 0)}%` }} />
                    </div>
                    <span className="w-5 text-xs font-semibold text-slate-700 text-right">{b.count}</span>
                  </div>
                ))}
                <p className="text-xs text-slate-400 mt-2">Avg score: <span className="font-semibold text-orange-500">{avgLeadScore}</span></p>
              </div>
            )}
          </Card>

          {/* Top Countries */}
          <Card>
            <SectionTitle title="Top Countries" sub="Leads by geography" />
            {loading ? <LoadingRow /> : topCountries.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No data</p>
            ) : (
              <div className="space-y-3">
                {topCountries.map(([country, count]) => (
                  <div key={country} className="flex items-center gap-3">
                    <div className="w-8 text-xs font-medium text-slate-700 shrink-0">{country}</div>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-400 rounded-full opacity-75" style={{ width: `${Math.max((count / maxCountry) * 100, 4)}%` }} />
                    </div>
                    <span className="w-5 text-xs font-semibold text-slate-700 text-right">{count}</span>
                    <span className="w-8 text-xs text-slate-400 text-right">{pct(count, totalLeads)}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Task Completion by Type */}
          <Card>
            <SectionTitle title="Task Completion" sub="Done vs total by task type" />
            {loading ? <LoadingRow /> : (
              <div className="space-y-3">
                {taskRows.map(r => (
                  <div key={r.type} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-slate-500 shrink-0">{r.type}</div>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full opacity-80" style={{ width: `${Math.max(r.cr, r.total > 0 ? 4 : 0)}%` }} />
                    </div>
                    <span className="w-14 text-xs text-slate-500 text-right">{r.done}/{r.total}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  )
}
