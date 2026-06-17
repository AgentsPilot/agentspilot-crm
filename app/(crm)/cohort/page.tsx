'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { CohortCrChart, CplLineChart, type WeeklyRow } from '@/components/charts/Charts'
import { supabase } from '@/lib/supabase'
import { TrendingUp, TrendingDown, AlertTriangle, Target, Zap, Users, CheckCircle2, ArrowRight, X, Search } from 'lucide-react'
import Link from 'next/link'

function delta(arr: number[], i: number) {
  if (i === 0) return null
  return ((arr[i] - arr[i - 1]) / arr[i - 1]) * 100
}

// ── ISO week helpers ───────────────────────────────────────────────────────────
function getISOWeek(dateStr: string): string {
  const d    = new Date(dateStr)
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day  = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo    = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function weekLabel(isoWeek: string): string {
  const [year, w] = isoWeek.split('-W')
  const jan4      = new Date(Date.UTC(Number(year), 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7
  const weekStart = new Date(jan4)
  weekStart.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (Number(w) - 1) * 7)
  return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

type WeekEntry = {
  isoWeek:     string
  label:       string
  leads:       number
  conversions: number
  byChannel:   Record<string, number>
  posts:       number   // published posts that week
}

type ContactRow = {
  contact_id: string
  channel:    string | null
  utm_source: string | null
  created_at: string
}

type PanelContact = {
  contact_id: string
  first_name: string
  last_name:  string | null
  email:      string
  channel:    string | null
  stage:      string
  created_at: string
  days_since: number
  isStuck:    boolean  // in "lead" stage for 14+ days
}

type ConvertedRow = {
  contact_id: string
  changed_at: string
}

// ── Weekly goal stored in localStorage ────────────────────────────────────────
const GOAL_KEY = 'cohort_weekly_lead_goal'

export default function CohortPage() {
  const [kpiRows,      setKpiRows]    = useState<WeeklyRow[]>([])
  const [weekData,     setWeekData]   = useState<WeekEntry[]>([])
  const [channels,     setChannels]   = useState<string[]>([])
  const [avgLagDays,   setAvgLag]     = useState<number | null>(null)
  const [loading,      setLoading]    = useState(true)
  const [weeklyGoal,   setGoal]       = useState(5)
  const [editGoal,     setEditGoal]   = useState(false)
  const [goalInput,    setGoalInput]  = useState('5')
  // Panel state
  const [panelWeek,     setPanelWeek]     = useState<WeekEntry | null>(null)
  const [panelContacts, setPanelContacts] = useState<PanelContact[]>([])
  const [panelLoading,  setPanelLoading]  = useState(false)
  const [panelSearch,   setPanelSearch]   = useState('')
  const [panelFilter,   setPanelFilter]   = useState<'all' | 'stuck'>('all')
  // Table channel filter
  const [channelFilter, setChannelFilter] = useState('All')

  useEffect(() => {
    const saved = localStorage.getItem(GOAL_KEY)
    if (saved) { setGoal(Number(saved)); setGoalInput(saved) }

    Promise.all([
      supabase.from('weekly_performance').select('*').order('sort_order', { ascending: true }),
      supabase.from('contacts').select('contact_id, channel, utm_source, created_at').order('created_at', { ascending: true }),
      supabase.from('contacts_current').select('contact_id, stage').eq('stage', 'customer_paid'),
      supabase.from('contact_stages')
        .select('contact_id, changed_at')
        .eq('stage', 'customer_paid')
        .order('changed_at', { ascending: true }),
      supabase.from('social_posts')
        .select('scheduled_date')
        .eq('status', 'published')
        .not('scheduled_date', 'is', null),
    ]).then(([{ data: kpi }, { data: contacts }, { data: converted }, { data: convStages }, { data: posts }]) => {
      setKpiRows(kpi ?? [])

      const convertedIds = new Set((converted ?? []).map((c: { contact_id: string }) => c.contact_id))

      // ── Posts published per week ──────────────────────────────────────────
      const postsByWeek: Record<string, number> = {}
      for (const p of (posts ?? []) as { scheduled_date: string }[]) {
        const iso = getISOWeek(p.scheduled_date)
        postsByWeek[iso] = (postsByWeek[iso] ?? 0) + 1
      }

      // ── Build weekly cohort data ──────────────────────────────────────────
      const weekMap: Record<string, WeekEntry> = {}
      const contactCreatedAt: Record<string, string> = {}

      for (const c of (contacts ?? []) as ContactRow[]) {
        if (!c.created_at) continue
        contactCreatedAt[c.contact_id] = c.created_at
        const iso = getISOWeek(c.created_at)
        if (!weekMap[iso]) weekMap[iso] = { isoWeek: iso, label: weekLabel(iso), leads: 0, conversions: 0, byChannel: {}, posts: postsByWeek[iso] ?? 0 }
        const ch = c.channel ?? c.utm_source ?? 'Direct'
        weekMap[iso].byChannel[ch] = (weekMap[iso].byChannel[ch] ?? 0) + 1
        weekMap[iso].leads++
        if (convertedIds.has(c.contact_id)) weekMap[iso].conversions++
      }

      // Fill posts for weeks that have posts but no leads yet
      for (const [iso, count] of Object.entries(postsByWeek)) {
        if (!weekMap[iso]) weekMap[iso] = { isoWeek: iso, label: weekLabel(iso), leads: 0, conversions: 0, byChannel: {}, posts: count }
        else weekMap[iso].posts = count
      }

      // ── Conversion lag ────────────────────────────────────────────────────
      const lagDays: number[] = []
      for (const cs of (convStages ?? []) as ConvertedRow[]) {
        const leadDate = contactCreatedAt[cs.contact_id]
        if (leadDate && cs.changed_at) {
          const diff = (new Date(cs.changed_at).getTime() - new Date(leadDate).getTime()) / 86400000
          if (diff >= 0) lagDays.push(diff)
        }
      }
      if (lagDays.length > 0) setAvgLag(Math.round(lagDays.reduce((a, b) => a + b, 0) / lagDays.length))

      const sorted = Object.values(weekMap).sort((a, b) => a.isoWeek.localeCompare(b.isoWeek))
      const allCh  = [...new Set(sorted.flatMap(w => Object.keys(w.byChannel)))]
      setWeekData(sorted)
      setChannels(allCh)
      setLoading(false)
    })
  }, [])

  function saveGoal() {
    const n = Math.max(1, Number(goalInput) || 5)
    setGoal(n)
    setGoalInput(String(n))
    localStorage.setItem(GOAL_KEY, String(n))
    setEditGoal(false)
  }

  const last            = kpiRows[kpiRows.length - 1]
  const totalLeads      = weekData.reduce((s, w) => s + w.leads,       0)
  const totalConv       = weekData.reduce((s, w) => s + w.conversions, 0)
  const overallCr       = totalLeads > 0 ? ((totalConv / totalLeads) * 100).toFixed(1) : '0'
  const lastWeek        = weekData[weekData.length - 1]
  const prevWeek        = weekData[weekData.length - 2]
  const thisWeekLeads   = lastWeek?.leads ?? 0
  const goalPct         = Math.min(Math.round((thisWeekLeads / weeklyGoal) * 100), 100)

  // ── Trend: CR declining 2+ weeks in a row? ────────────────────────────────
  const crTrend = weekData.slice(-3).map(w =>
    w.leads > 0 ? (w.conversions / w.leads) * 100 : 0
  )
  const crDeclining = crTrend.length >= 2 && crTrend.every((v, i) => i === 0 || v <= crTrend[i - 1])

  // ── Best channel this week ────────────────────────────────────────────────
  const thisWeekChannels = lastWeek?.byChannel ?? {}
  const bestChannel      = Object.entries(thisWeekChannels).sort((a, b) => b[1] - a[1])[0]

  // ── Channel leaderboard (all time) ───────────────────────────────────────
  const channelTotals = channels.map(ch => ({
    channel:    ch,
    leads:      weekData.reduce((s, w) => s + (w.byChannel[ch] ?? 0), 0),
    conversions: weekData.reduce((s, w) => {
      // approximate: conv * (channel leads / total leads) per week
      const wLeads = w.leads > 0 ? (w.byChannel[ch] ?? 0) / w.leads : 0
      return s + Math.round(w.conversions * wLeads)
    }, 0),
  })).sort((a, b) => b.leads - a.leads)

  // ── Action items ──────────────────────────────────────────────────────────
  const actions: { icon: React.ElementType; color: string; bg: string; text: string; link?: string }[] = []

  if (thisWeekLeads === 0)
    actions.push({ icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', text: 'No leads this week — check that your UTM links are live in posts', link: '/social' })
  else if (thisWeekLeads < weeklyGoal)
    actions.push({ icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', text: `${thisWeekLeads}/${weeklyGoal} leads so far — publish more posts to hit your goal`, link: '/social' })
  else
    actions.push({ icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', text: `Weekly goal hit! ${thisWeekLeads} leads this week ✓` })

  if (crDeclining && crTrend.length >= 2)
    actions.push({ icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', text: 'CR has been declining — review your follow-up emails and landing page', link: '/posts-library' })

  if (bestChannel)
    actions.push({ icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', text: `${bestChannel[0]} is your top channel this week (${bestChannel[1]} leads) — post more there`, link: '/social' })

  if (avgLagDays !== null)
    actions.push({ icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50', text: `Avg. ${avgLagDays} days from lead to conversion — follow up with leads from ${avgLagDays} days ago`, link: '/tasks' })

  if (prevWeek && prevWeek.leads > 0 && prevWeek.conversions === 0)
    actions.push({ icon: Users, color: 'text-orange-500', bg: 'bg-orange-50', text: `${prevWeek.leads} leads from last week (${prevWeek.label}) haven't converted yet — send nurture content`, link: '/posts-library' })

  const crArr = weekData.map(w => w.leads > 0 ? (w.conversions / w.leads) * 100 : 0)

  async function openPanel(week: WeekEntry) {
    setPanelWeek(week)
    setPanelSearch('')
    setPanelFilter('all')
    setPanelLoading(true)
    setPanelContacts([])
    // Find contact_ids for this week from weekData (re-derive from contacts)
    // Fetch contacts created in this ISO week
    const [year, w] = week.isoWeek.split('-W')
    const jan4      = new Date(Date.UTC(Number(year), 0, 4))
    const dayOfWeek = jan4.getUTCDay() || 7
    const weekStart = new Date(jan4)
    weekStart.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (Number(w) - 1) * 7)
    const weekEnd   = new Date(weekStart)
    weekEnd.setUTCDate(weekStart.getUTCDate() + 7)

    const { data: contacts } = await supabase
      .from('contacts')
      .select('contact_id, first_name, last_name, email, channel, utm_source, created_at')
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString())
      .order('created_at', { ascending: false })

    if (!contacts) { setPanelLoading(false); return }

    const ids = contacts.map(c => c.contact_id)
    const { data: stages } = ids.length > 0
      ? await supabase.from('contacts_current').select('contact_id, stage').in('contact_id', ids)
      : { data: [] }

    const stageMap: Record<string, string> = {}
    for (const s of (stages ?? [])) stageMap[s.contact_id] = s.stage

    const now = Date.now()
    const result: PanelContact[] = contacts.map(c => {
      const stage     = stageMap[c.contact_id] ?? 'lead'
      const days      = Math.floor((now - new Date(c.created_at).getTime()) / 86400000)
      return {
        contact_id: c.contact_id,
        first_name: c.first_name,
        last_name:  c.last_name,
        email:      c.email,
        channel:    c.channel ?? c.utm_source ?? 'Direct',
        stage,
        created_at: c.created_at,
        days_since: days,
        isStuck:    stage === 'lead' && days >= 14,
      }
    })

    setPanelContacts(result)
    setPanelLoading(false)
  }

  const stageColor: Record<string, string> = {
    lead:            'bg-slate-100 text-slate-600',
    qualified:       'bg-indigo-100 text-indigo-700',
    proposal_sent:   'bg-amber-100 text-amber-700',
    customer_trial:  'bg-blue-100 text-blue-700',
    customer_paid:   'bg-emerald-100 text-emerald-700',
    churned:         'bg-red-100 text-red-600',
  }

  const stuckCount = panelContacts.filter(c => c.isStuck).length

  const filteredPanelContacts = panelContacts.filter(c => {
    const q       = panelSearch.toLowerCase()
    const matchQ  = !q || c.first_name.toLowerCase().includes(q) || (c.last_name ?? '').toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    const matchF  = panelFilter === 'all' || c.isStuck
    return matchQ && matchF
  })

  return (
    <div>
      <Header title="Cohort Program" subtitle="Weekly lead performance, channel breakdown & actions" />

      {/* ── Lead panel ──────────────────────────────────────────────────────── */}
      {panelWeek && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setPanelWeek(null)}>
          <div className="fixed inset-0 bg-black/30" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Leads — week of {panelWeek.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{panelWeek.leads} leads · {panelWeek.conversions} converted</p>
              </div>
              <button onClick={() => setPanelWeek(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search + filter */}
            <div className="px-4 py-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={panelSearch}
                  onChange={e => setPanelSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPanelFilter('all')}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${panelFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-slate-500 hover:bg-gray-200'}`}>
                  All ({panelContacts.length})
                </button>
                <button onClick={() => setPanelFilter('stuck')}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${panelFilter === 'stuck' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                  ⚠ Stuck 14d+ ({stuckCount})
                </button>
              </div>
            </div>

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto">
              {panelLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : filteredPanelContacts.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-slate-400">
                  {panelSearch ? 'No contacts match your search' : 'No contacts this week'}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredPanelContacts.map(c => (
                    <Link key={c.contact_id} href={`/contacts/${c.contact_id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-orange-50/40 transition-colors group">
                      {/* Avatar */}
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 text-xs font-bold text-orange-600">
                        {c.first_name[0]}{c.last_name?.[0] ?? ''}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {c.first_name} {c.last_name ?? ''}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{c.email}</p>
                      </div>
                      {/* Meta */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1">
                          {c.isStuck && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-600">⚠ stuck</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColor[c.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                            {c.stage.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">{c.days_since}d ago · {c.channel}</span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-orange-400 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{filteredPanelContacts.length} contacts shown</span>
                <Link href="/contacts" className="text-xs font-medium text-orange-600 hover:text-orange-700">
                  View all contacts →
                </Link>
              </div>
              <Link href="/posts-library"
                className="flex items-center justify-center gap-2 w-full py-2 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors">
                📚 Send nurture content to these leads →
              </Link>
            </div>
          </div>
        </div>
      )}
      <div className="p-6 space-y-6">

        {/* ── KPI Summary ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Leads',    value: loading ? '…' : String(totalLeads),     desc: 'All time',            color: 'text-sky-600' },
            { label: 'Conversions',    value: loading ? '…' : String(totalConv),      desc: 'Paid customers',      color: 'text-emerald-600' },
            { label: 'Overall CR',     value: loading ? '…' : `${overallCr}%`,        desc: 'Lead → paid',         color: 'text-indigo-600' },
            { label: 'Avg Conv. Lag',  value: loading ? '…' : avgLagDays !== null ? `${avgLagDays}d` : '—', desc: 'Days lead → paid', color: 'text-violet-600' },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{k.label}</p>
              <p className={`text-3xl font-bold mt-1 ${k.color}`}>
                {loading ? <span className="animate-pulse bg-gray-100 rounded h-8 w-16 inline-block" /> : k.value}
              </p>
              <p className="text-xs text-slate-400 mt-1">{k.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Weekly Goal + Action Panel ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Goal tracker */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">This Week's Goal</p>
                <p className="text-xs text-slate-400 mt-0.5">Week starting {lastWeek?.label ?? '—'}</p>
              </div>
              {editGoal ? (
                <div className="flex items-center gap-2">
                  <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)}
                    className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  <button onClick={saveGoal} className="text-xs font-medium text-orange-600 hover:text-orange-700">Save</button>
                </div>
              ) : (
                <button onClick={() => setEditGoal(true)} className="text-xs text-slate-400 hover:text-orange-500 transition-colors">
                  Edit goal
                </button>
              )}
            </div>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-4xl font-bold text-orange-500">{thisWeekLeads}</span>
              <span className="text-lg text-slate-400 mb-1">/ {weeklyGoal} leads</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${goalPct >= 100 ? 'bg-emerald-500' : goalPct >= 60 ? 'bg-orange-500' : 'bg-amber-400'}`}
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">{goalPct}% of weekly goal</p>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900 mb-3">This Week's Actions</p>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-8 animate-pulse bg-gray-100 rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map((a, i) => (
                  <div key={i} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${a.bg}`}>
                    <a.icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${a.color}`} />
                    <p className={`text-xs flex-1 ${a.color}`}>{a.text}</p>
                    {a.link && (
                      <Link href={a.link} className={`shrink-0 text-xs font-medium ${a.color} hover:opacity-70`}>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Channel Leaderboard ──────────────────────────────────────────── */}
        {!loading && channelTotals.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-slate-900">Channel Leaderboard</h2>
              <p className="text-xs text-slate-500 mt-0.5">All-time performance by acquisition channel</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['#', 'Channel', 'Total Leads', 'Conversions', 'CR %', 'Share of Leads'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {channelTotals.map((ch, i) => {
                    const cr    = ch.leads > 0 ? ((ch.conversions / ch.leads) * 100).toFixed(1) : '0'
                    const share = totalLeads > 0 ? ((ch.leads / totalLeads) * 100).toFixed(0) : '0'
                    return (
                      <tr key={ch.channel} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 text-xs font-bold">#{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{ch.channel}</td>
                        <td className="px-4 py-3 font-bold text-orange-500">{ch.leads}</td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">{ch.conversions}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${Number(cr) >= 10 ? 'text-emerald-600' : Number(cr) >= 5 ? 'text-indigo-600' : 'text-amber-500'}`}>
                            {cr}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-24">
                              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${share}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── KPI trend charts ─────────────────────────────────────────────── */}
        {!loading && kpiRows.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">CR Rate Trend</h2>
              <p className="text-xs text-slate-500 mb-4">Weekly conversion rate</p>
              <CohortCrChart data={kpiRows} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">CPL Trend</h2>
              <p className="text-xs text-slate-500 mb-4">Cost per lead by week</p>
              <CplLineChart data={kpiRows} />
            </div>
          </div>
        )}

        {/* ── Weekly Cohort Breakdown Table ────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Weekly Cohort Breakdown</h2>
              <p className="text-xs text-slate-500 mt-0.5">Click any row to see the leads. Real data from contacts.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {['All', ...channels].map(ch => (
                <button key={ch} onClick={() => setChannelFilter(ch)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    channelFilter === ch
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-slate-500 hover:bg-gray-200'
                  }`}>
                  {ch}
                </button>
              ))}
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">🔄 Live</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">Week</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Posts</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Leads</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Conv.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">CR%</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">vs Goal</th>
                  {(channelFilter === 'All' ? channels : [channelFilter]).map(ch => (
                    <th key={ch} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{ch}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 5 + channels.length }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><span className="animate-pulse bg-gray-100 rounded h-4 w-12 inline-block" /></td>
                      ))}</tr>
                    ))
                  : weekData.length === 0
                  ? (
                    <tr><td colSpan={5 + channels.length} className="px-4 py-12 text-center text-slate-400 text-sm">
                      No contacts yet — leads will appear here as they come in
                    </td></tr>
                  )
                  : weekData
                      .filter(row => channelFilter === 'All' || (row.byChannel[channelFilter] ?? 0) > 0)
                      .map((row, i) => {
                      const displayLeads = channelFilter === 'All' ? row.leads : (row.byChannel[channelFilter] ?? 0)
                      const cr       = row.leads > 0 ? ((row.conversions / row.leads) * 100).toFixed(1) : '0'
                      const crChange = delta(crArr, i)
                      const vsGoal   = displayLeads - weeklyGoal
                      const isLast   = i === weekData.filter(r => channelFilter === 'All' || (r.byChannel[channelFilter] ?? 0) > 0).length - 1
                      return (
                        <tr key={row.isoWeek}
                          onClick={() => openPanel(row)}
                          className={`cursor-pointer hover:bg-orange-50/40 transition-colors ${isLast ? 'bg-orange-50/30' : ''}`}>
                          <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                            {row.label}
                            {isLast && <span className="ml-1.5 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">current</span>}
                          </td>
                          <td className="px-4 py-3">
                            {row.posts > 0
                              ? <span className="font-semibold text-indigo-600">{row.posts}</span>
                              : <span className="text-slate-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-3 font-bold text-orange-500">{displayLeads}</td>
                          <td className="px-4 py-3 text-slate-700">{row.conversions}</td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${Number(cr) >= 10 ? 'text-emerald-600' : Number(cr) >= 5 ? 'text-indigo-600' : 'text-amber-600'}`}>
                              {cr}%
                            </span>
                            {crChange !== null && (
                              <span className={`ml-1 text-xs ${crChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {crChange > 0 ? '↑' : '↓'}{Math.abs(crChange).toFixed(1)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${vsGoal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {vsGoal >= 0 ? `+${vsGoal}` : vsGoal}
                            </span>
                          </td>
                          {(channelFilter === 'All' ? channels : [channelFilter]).map(ch => (
                            <td key={ch} className="px-4 py-3 text-slate-500">{row.byChannel[ch] ?? 0}</td>
                          ))}
                        </tr>
                      )
                    })
                }
              </tbody>
              {weekData.length > 1 && (
                <tfoot className="bg-gray-50 border-t border-gray-100">
                  <tr>
                    <td className="px-4 py-2 text-xs font-semibold text-slate-500">Total</td>
                    <td className="px-4 py-2 text-xs font-bold text-indigo-600">{weekData.reduce((s, w) => s + w.posts, 0)}</td>
                    <td className="px-4 py-2 text-xs font-bold text-orange-500">{totalLeads}</td>
                    <td className="px-4 py-2 text-xs font-bold text-slate-700">{totalConv}</td>
                    <td className="px-4 py-2 text-xs font-bold text-indigo-600">{overallCr}%</td>
                    <td className="px-4 py-2" />
                    {(channelFilter === 'All' ? channels : [channelFilter]).map(ch => (
                      <td key={ch} className="px-4 py-2 text-xs font-bold text-slate-600">
                        {weekData.reduce((s, w) => s + (w.byChannel[ch] ?? 0), 0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
