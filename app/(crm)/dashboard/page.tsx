'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import {
  DollarSign, TrendingUp, AlertTriangle, Zap,
  CheckSquare, Loader2, Users, ArrowRight,
  ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Contact = {
  contact_id:       string
  first_name:       string
  last_name:        string | null
  email:            string | null
  company:          string | null
  stage:            'lead' | 'customer_trial' | 'customer_paid'
  state:            string
  mrr:              number | null
  plan:             string | null
  trial_started_at: string | null
  trial_expires_at: string | null
  activated_at:     string | null
  converted_at:     string | null
  created_at:       string
}

type StageRow  = { contact_id: string; stage: string }
type Campaign  = { id: string; name: string | null; channel: string | null; status: string; budget: number | null; spent: number | null }
type SocialPost = { id: string; campaign_id: string | null; status: string }

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) + '%' : '—' }
function pctNum(n: number, d: number) { return d ? Math.round((n / d) * 100) : 0 }
function todayStr() { return new Date().toISOString().split('T')[0] }
function name(c: Pick<Contact, 'first_name' | 'last_name' | 'email'>) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || '—'
}
function daysAgo(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}
function addedSince(contacts: Contact[], days: number) {
  const cut = Date.now() - days * 86400000
  return contacts.filter(c => new Date(c.created_at).getTime() >= cut).length
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [contacts,  setContacts]  = useState<Contact[]>([])
  const [history,   setHistory]   = useState<StageRow[]>([])
  const [tasks,     setTasks]     = useState<{ id: string; due_date: string | null; status: string }[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [posts,     setPosts]     = useState<SocialPost[]>([])
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState<'lead' | 'customer_trial' | 'customer_paid' | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: h }, { data: t }, { data: ca }, { data: p }] = await Promise.all([
        supabase.from('contacts_current')
          .select('contact_id,first_name,last_name,email,company,stage,state,mrr,plan,trial_started_at,trial_expires_at,activated_at,converted_at,created_at'),
        supabase.from('contact_stages').select('contact_id,stage'),
        supabase.from('tasks').select('id,due_date,status'),
        supabase.from('campaigns').select('id,name,channel,status,budget,spent').order('created_at', { ascending: false }),
        supabase.from('social_posts').select('id,campaign_id,status'),
      ])
      setContacts((c ?? []) as Contact[])
      setHistory((h ?? []) as StageRow[])
      setTasks(t ?? [])
      setCampaigns((ca ?? []) as Campaign[])
      setPosts((p ?? []) as SocialPost[])
      setLoading(false)
    }
    load()
  }, [])

  // ── Derived ────────────────────────────────────────────────────────────────

  const leads  = contacts.filter(c => c.stage === 'lead')
  const trials = contacts.filter(c => c.stage === 'customer_trial')
  const paid   = contacts.filter(c => c.stage === 'customer_paid')

  // Active (non-terminal) counts
  const activeLeads   = leads.filter(c => c.state !== 'cold').length
  const coldLeads     = leads.filter(c => c.state === 'cold').length
  const trialActive   = trials.filter(c => c.state === 'active').length
  const trialInactive = trials.filter(c => c.state === 'inactive').length
  const trialExpiring = trials.filter(c => c.state === 'expiring').length
  const trialExpired  = trials.filter(c => c.state === 'expired').length
  const paidActive    = paid.filter(c => c.state === 'active').length
  const paidAtRisk    = paid.filter(c => c.state === 'at_risk').length
  const paidChurned   = paid.filter(c => c.state === 'churned').length

  // Ever-reached (for conversion rates)
  const everLead  = new Set(history.filter(h => h.stage === 'lead').map(h => h.contact_id)).size
  const everTrial = new Set(history.filter(h => h.stage === 'customer_trial').map(h => h.contact_id)).size
  const everPaid  = new Set(history.filter(h => h.stage === 'customer_paid').map(h => h.contact_id)).size

  // Conversion rates
  const leadToTrial  = pctNum(everTrial, everLead)
  const trialToPaid  = pctNum(everPaid, everTrial)

  // MRR
  const totalMRR = paid.reduce((s, c) => s + (c.mrr ?? 0), 0)
  const avgMRR   = paid.length ? Math.round(totalMRR / paid.length) : 0

  // Tasks
  const tasksDue = tasks.filter(t => t.due_date === todayStr() && t.status !== 'done').length
  const overdue  = tasks.filter(t => !!t.due_date && t.due_date < todayStr() && t.status !== 'done').length

  // Expiring trials (≤3 days)
  const expiringSoon = trials
    .filter(c => c.trial_expires_at)
    .map(c => ({ ...c, daysLeft: Math.ceil((new Date(c.trial_expires_at!).getTime() - Date.now()) / 86400000) }))
    .filter(c => c.daysLeft <= 3 && c.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  // Recent conversions
  const recentConversions = [...paid]
    .sort((a, b) => new Date(b.converted_at ?? b.created_at).getTime() - new Date(a.converted_at ?? a.created_at).getTime())
    .slice(0, 6)

  // Weekly adds
  const leadsThisWeek = addedSince(leads, 7)
  const trialsThisWeek = trials.filter(c => c.trial_started_at && daysAgo(c.trial_started_at) <= 7).length
  const paidThisWeek   = paid.filter(c => c.converted_at && daysAgo(c.converted_at) <= 7).length

  // Posts per campaign
  const postsByCampaign = posts.reduce<Record<string, { total: number; published: number }>>((acc, p) => {
    if (!p.campaign_id) return acc
    if (!acc[p.campaign_id]) acc[p.campaign_id] = { total: 0, published: 0 }
    acc[p.campaign_id].total++
    if (p.status === 'published') acc[p.campaign_id].published++
    return acc
  }, {})

  // Contacts to show in expanded drill-down
  const drillContacts = expanded ? contacts.filter(c => c.stage === expanded) : []

  const sk = <span className="animate-pulse bg-gray-100 rounded h-4 w-8 inline-block" />

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const KPIS = [
    { label: 'MRR',          value: `$${totalMRR.toLocaleString()}`, sub: `${paid.length} paying`,              icon: DollarSign,    color: 'text-emerald-600', bg: 'bg-emerald-50'  },
    { label: 'Active Leads', value: activeLeads,                      sub: `${coldLeads} cold · +${leadsThisWeek} this wk`, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'In Trial',     value: trials.length,                    sub: `${leadToTrial}% of leads converted`,  icon: Zap,           color: 'text-blue-600',    bg: 'bg-blue-50'     },
    { label: 'Paid',         value: paid.length,                      sub: `${trialToPaid}% of trials converted`, icon: TrendingUp,    color: 'text-orange-600',  bg: 'bg-orange-50'   },
    { label: 'At Risk',      value: paidAtRisk + expiringSoon.length, sub: `${expiringSoon.length} trials expiring`, icon: AlertTriangle, color: (paidAtRisk + expiringSoon.length) > 0 ? 'text-red-500' : 'text-slate-400', bg: (paidAtRisk + expiringSoon.length) > 0 ? 'bg-red-50' : 'bg-slate-50' },
    { label: 'Tasks Due',    value: tasksDue,                         sub: overdue > 0 ? `${overdue} overdue ⚠` : 'none overdue', icon: CheckSquare, color: overdue > 0 ? 'text-red-500' : 'text-amber-600', bg: overdue > 0 ? 'bg-red-50' : 'bg-amber-50' },
  ]

  // ── Drill-down state labels ──────────────────────────────────────────────

  const STATE_BADGE: Record<string, string> = {
    new: 'bg-amber-100 text-amber-700', contacted: 'bg-sky-100 text-sky-700',
    reminded_7d: 'bg-amber-100 text-amber-700', reminded_21d: 'bg-orange-100 text-orange-700',
    cold: 'bg-slate-100 text-slate-500',
    active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-orange-100 text-orange-600',
    expiring: 'bg-red-100 text-red-600', expired: 'bg-slate-100 text-slate-500',
    at_risk: 'bg-yellow-100 text-yellow-700', churned: 'bg-slate-100 text-slate-500',
  }

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · AgentsPilot CRM`}
      />
      <div className="p-6 space-y-5">

        {/* ── 1. KPI Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {KPIS.map(k => (
            <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-3 ${k.bg}`}>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <p className="text-xs text-slate-400">{k.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${k.color}`}>{loading ? sk : k.value}</p>
              <p className="text-xs text-slate-400 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── 2. Pipeline ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Customer Pipeline</h2>
              <p className="text-xs text-slate-400 mt-0.5">Lead → Trial → Paid · click a stage to see contacts</p>
            </div>
            <Link href="/reports" className="text-xs text-orange-500 hover:underline">Full report →</Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <>
              {/* Stage columns */}
              <div className="grid grid-cols-3 divide-x divide-gray-100">

                {/* ── LEADS ── */}
                <button
                  onClick={() => setExpanded(e => e === 'lead' ? null : 'lead')}
                  className={`text-left p-5 transition-colors hover:bg-gray-50 ${expanded === 'lead' ? 'bg-amber-50/60' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Leads</span>
                    {expanded === 'lead' ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                  <p className="text-3xl font-extrabold text-amber-600 mb-1">{leads.length}</p>
                  <p className="text-xs text-slate-400 mb-4">total · {activeLeads} active · {coldLeads} cold</p>
                  <div className="space-y-1.5 mb-4">
                    {[
                      { label: 'New',        val: leads.filter(c=>c.state==='new').length,          color: 'bg-amber-400' },
                      { label: 'Contacted',  val: leads.filter(c=>c.state==='contacted').length,    color: 'bg-sky-400' },
                      { label: 'Reminded',   val: leads.filter(c=>c.state==='reminded_7d' || c.state==='reminded_21d').length, color: 'bg-orange-400' },
                      { label: 'Cold',       val: coldLeads,                                        color: 'bg-slate-300' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-2">
                        <div className="w-16 text-xs text-slate-500 shrink-0">{s.label}</div>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.color}`} style={{ width: leads.length ? `${Math.max(s.val > 0 ? 4 : 0, Math.round((s.val/leads.length)*100))}%` : '0%' }} />
                        </div>
                        <span className="text-xs text-slate-400 w-4 text-right">{s.val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-amber-100">
                    <span className="text-xs text-slate-400">+{leadsThisWeek} this week</span>
                    <span className="text-xs font-semibold text-amber-600">{pct(everLead, everLead)} entered</span>
                  </div>
                </button>

                {/* ── CONVERSION ARROW + TRIAL ── */}
                <div className="relative">
                  {/* conversion % arrow badge */}
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="text-xs font-bold text-blue-600">{leadToTrial}%</span>
                  </div>
                  <button
                    onClick={() => setExpanded(e => e === 'customer_trial' ? null : 'customer_trial')}
                    className={`w-full h-full text-left p-5 transition-colors hover:bg-gray-50 ${expanded === 'customer_trial' ? 'bg-blue-50/60' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Trial</span>
                      {expanded === 'customer_trial' ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                    <p className="text-3xl font-extrabold text-blue-600 mb-1">{trials.length}</p>
                    <p className="text-xs text-slate-400 mb-4">total · {trialActive} active · {trialExpiring} expiring</p>
                    <div className="space-y-1.5 mb-4">
                      {[
                        { label: 'Active',   val: trialActive,   color: 'bg-emerald-400' },
                        { label: 'Inactive', val: trialInactive, color: 'bg-orange-400' },
                        { label: 'Expiring', val: trialExpiring, color: 'bg-red-400' },
                        { label: 'Expired',  val: trialExpired,  color: 'bg-slate-300' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-2">
                          <div className="w-16 text-xs text-slate-500 shrink-0">{s.label}</div>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.color}`} style={{ width: trials.length ? `${Math.max(s.val > 0 ? 4 : 0, Math.round((s.val/trials.length)*100))}%` : '0%' }} />
                          </div>
                          <span className="text-xs text-slate-400 w-4 text-right">{s.val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-blue-100">
                      <span className="text-xs text-slate-400">+{trialsThisWeek} this week</span>
                      <span className="text-xs font-semibold text-blue-600">
                        {trials.length ? Math.round((trials.filter(c=>!!c.activated_at).length/trials.length)*100) : 0}% activated
                      </span>
                    </div>
                  </button>
                </div>

                {/* ── PAID ── */}
                <div className="relative">
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="text-xs font-bold text-emerald-600">{trialToPaid}%</span>
                  </div>
                  <button
                    onClick={() => setExpanded(e => e === 'customer_paid' ? null : 'customer_paid')}
                    className={`w-full h-full text-left p-5 transition-colors hover:bg-gray-50 ${expanded === 'customer_paid' ? 'bg-emerald-50/60' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Paid</span>
                      {expanded === 'customer_paid' ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                    <p className="text-3xl font-extrabold text-emerald-600 mb-1">{paid.length}</p>
                    <p className="text-xs text-slate-400 mb-4">total · ${totalMRR.toLocaleString()}/mo MRR</p>
                    <div className="space-y-1.5 mb-4">
                      {[
                        { label: 'Active',   val: paidActive,  color: 'bg-emerald-400' },
                        { label: 'At Risk',  val: paidAtRisk,  color: 'bg-yellow-400' },
                        { label: 'Churned',  val: paidChurned, color: 'bg-slate-300' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-2">
                          <div className="w-16 text-xs text-slate-500 shrink-0">{s.label}</div>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.color}`} style={{ width: paid.length ? `${Math.max(s.val > 0 ? 4 : 0, Math.round((s.val/paid.length)*100))}%` : '0%' }} />
                          </div>
                          <span className="text-xs text-slate-400 w-4 text-right">{s.val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-emerald-100">
                      <span className="text-xs text-slate-400">+{paidThisWeek} this week</span>
                      <span className="text-xs font-semibold text-emerald-600">avg ${avgMRR}/mo</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* ── Drill-down panel ── */}
              {expanded && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  <div className="px-5 py-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {expanded === 'lead' ? 'All Leads' : expanded === 'customer_trial' ? 'All Trial Contacts' : 'All Paying Customers'}
                      <span className="ml-2 font-normal normal-case text-slate-400">({drillContacts.length})</span>
                    </p>
                    <Link href="/contacts" className="text-xs text-orange-500 hover:underline flex items-center gap-1">
                      Open in Contacts <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                    {drillContacts.length === 0 ? (
                      <p className="px-5 py-4 text-xs text-slate-400 italic">No contacts in this stage.</p>
                    ) : (
                      drillContacts
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map(c => {
                          const n = name(c)
                          const keyDate = c.converted_at ?? c.trial_started_at ?? c.created_at
                          const d = daysAgo(keyDate)
                          return (
                            <Link key={c.contact_id} href={`/contacts/${c.contact_id}`}
                              className="flex items-center gap-3 px-5 py-2.5 hover:bg-white transition-colors group">
                              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                                expanded === 'lead' ? 'bg-amber-100 text-amber-700' :
                                expanded === 'customer_trial' ? 'bg-blue-100 text-blue-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>{n.charAt(0).toUpperCase()}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-800 truncate group-hover:text-orange-500 transition-colors">{n}</p>
                                <p className="text-xs text-slate-400 truncate">{c.company ?? c.email ?? '—'}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATE_BADGE[c.state] ?? 'bg-gray-100 text-gray-500'}`}>
                                {c.state}
                              </span>
                              {c.mrr ? (
                                <span className="text-xs font-bold text-emerald-600 shrink-0 w-16 text-right">${c.mrr}/mo</span>
                              ) : c.plan ? (
                                <span className="text-xs text-orange-600 shrink-0 capitalize">{c.plan}</span>
                              ) : null}
                              <span className="text-xs text-slate-300 shrink-0 hidden sm:block w-16 text-right">
                                {d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`}
                              </span>
                            </Link>
                          )
                        })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── 3. Manager Row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Daily Risks */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-slate-800">🚨 Daily Risks</h2>
              <p className="text-xs text-slate-400 mt-0.5">Items needing attention today</p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="h-4 w-4 animate-spin text-slate-300" /></div>
            ) : (
              <div className="divide-y divide-gray-50">

                {/* Overdue tasks */}
                <Link href="/tasks" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${overdue > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <CheckSquare className={`h-3.5 w-3.5 ${overdue > 0 ? 'text-red-500' : 'text-slate-300'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-700">Overdue tasks</p>
                    <p className="text-xs text-slate-400">{tasksDue} due today</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${overdue > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                    {overdue}
                  </span>
                </Link>

                {/* Expiring trials */}
                <Link href="/contacts" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${expiringSoon.length > 0 ? 'bg-orange-50' : 'bg-slate-50'}`}>
                    <Zap className={`h-3.5 w-3.5 ${expiringSoon.length > 0 ? 'text-orange-500' : 'text-slate-300'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-700">Trials expiring ≤3 days</p>
                    {expiringSoon.length > 0
                      ? <p className="text-xs text-slate-400">{expiringSoon.map(c => name(c)).slice(0, 2).join(', ')}{expiringSoon.length > 2 ? ` +${expiringSoon.length - 2}` : ''}</p>
                      : <p className="text-xs text-slate-400">None right now</p>
                    }
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${expiringSoon.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                    {expiringSoon.length}
                  </span>
                </Link>

                {/* At-risk paid */}
                <Link href="/contacts" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${paidAtRisk > 0 ? 'bg-yellow-50' : 'bg-slate-50'}`}>
                    <AlertTriangle className={`h-3.5 w-3.5 ${paidAtRisk > 0 ? 'text-yellow-500' : 'text-slate-300'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-700">At-risk customers</p>
                    <p className="text-xs text-slate-400">Paid · at_risk state</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${paidAtRisk > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-400'}`}>
                    {paidAtRisk}
                  </span>
                </Link>

                {/* Cold leads */}
                <div className="flex items-center gap-3 px-5 py-3">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-slate-50">
                    <Users className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-700">Cold leads</p>
                    <p className="text-xs text-slate-400">30d+ no activity · send manual email</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{coldLeads}</span>
                </div>

                {/* Weekly adds summary */}
                <div className="px-5 py-3 bg-gray-50/50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Added this week</p>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-base font-bold text-amber-600">{leadsThisWeek}</p>
                      <p className="text-xs text-slate-400">leads</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-blue-600">{trialsThisWeek}</p>
                      <p className="text-xs text-slate-400">trials</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-emerald-600">{paidThisWeek}</p>
                      <p className="text-xs text-slate-400">paid</p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Campaigns + Posts */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden lg:col-span-2">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">📢 Campaigns</h2>
                <p className="text-xs text-slate-400 mt-0.5">Active campaigns · posts per campaign</p>
              </div>
              <Link href="/campaigns" className="text-xs text-orange-500 hover:underline">View all →</Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="h-4 w-4 animate-spin text-slate-300" /></div>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-slate-300 text-center py-10">No campaigns yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {campaigns.slice(0, 8).map(c => {
                  const spendPct   = c.budget && c.budget > 0 ? Math.round(((c.spent ?? 0) / c.budget) * 100) : 0
                  const postCounts = postsByCampaign[c.id] ?? { total: 0, published: 0 }
                  return (
                    <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                      {/* Status dot */}
                      <div className={`h-2 w-2 rounded-full shrink-0 ${
                        c.status === 'active' ? 'bg-emerald-400' : c.status === 'paused' ? 'bg-amber-400' : 'bg-slate-300'
                      }`} />
                      {/* Name + channel */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{c.name ?? 'Unnamed'}</p>
                        <p className="text-xs text-slate-400">{c.channel ?? '—'}</p>
                      </div>
                      {/* Post counts */}
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-slate-700">
                          {postCounts.published}<span className="font-normal text-slate-400">/{postCounts.total}</span>
                        </p>
                        <p className="text-xs text-slate-400">posts pub.</p>
                      </div>
                      {/* Budget bar */}
                      <div className="w-24 shrink-0">
                        <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                          <span>${(c.spent ?? 0).toLocaleString()}</span>
                          <span>${(c.budget ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${spendPct >= 90 ? 'bg-red-400' : spendPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(spendPct, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Recent Conversions ──────────────────────────────────────── */}
        {recentConversions.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">💰 Recent Conversions</h2>
              <span className="text-xs text-slate-400">${totalMRR.toLocaleString()}/mo total MRR</span>
            </div>
            <div className="divide-y divide-gray-50">
              {recentConversions.map(c => {
                const n  = name(c)
                const d  = c.converted_at ? daysAgo(c.converted_at) : null
                return (
                  <Link key={c.contact_id} href={`/contacts/${c.contact_id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors group">
                    <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-emerald-700">{n.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate group-hover:text-orange-500">{n}</p>
                      <p className="text-xs text-slate-400">{c.company ?? c.email ?? '—'}</p>
                    </div>
                    {c.plan && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-medium capitalize shrink-0">{c.plan}</span>}
                    <span className="text-sm font-bold text-emerald-600 shrink-0">${(c.mrr ?? 0).toLocaleString()}<span className="text-xs font-normal text-slate-400">/mo</span></span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      c.state === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      c.state === 'at_risk' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>{c.state}</span>
                    <span className="text-xs text-slate-300 shrink-0 hidden sm:block w-20 text-right">
                      {d === null ? '—' : d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
