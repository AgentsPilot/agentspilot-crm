'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { Users, Target, DollarSign, TrendingUp, Zap, CheckSquare, Loader2 } from 'lucide-react'

type Contact = {
  id: string
  full_name: string | null
  email: string | null
  utm_source: string | null
  utm_medium: string | null
  status: string | null
  campaign_name: string | null
  created_at: string
}

type Deal = {
  id: string
  stage: string
  value: number
}

type Task = {
  id: string
  due_date: string | null
  done: boolean
}

type Campaign = {
  id: string
  name: string | null
  channel: string | null
  status: string
  budget: number | null
  spend: number | null
}

const STAGE_ORDER = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost']

const stageColor: Record<string, string> = {
  'New Lead': 'bg-sky-500',
  'Contacted': 'bg-indigo-500',
  'Qualified': 'bg-violet-500',
  'Proposal Sent': 'bg-amber-500',
  'Won': 'bg-emerald-500',
  'Lost': 'bg-red-400',
}

const channelColor: Record<string, string> = {
  Meta: '#6366f1', Google: '#0ea5e9', TikTok: '#f43f5e',
  LinkedIn: '#3b82f6', Organic: '#10b981', Email: '#f59e0b', Other: '#94a3b8',
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function isOverdue(due: string | null) {
  if (!due) return false
  return due < today()
}

export default function DashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [c, d, t, ca] = await Promise.all([
        supabase.from('users').select('id,full_name,email,utm_source,utm_medium,status,campaign_name,created_at'),
        supabase.from('pipeline_deals').select('id,stage,value'),
        supabase.from('tasks').select('id,due_date,done'),
        supabase.from('campaigns').select('id,name,channel,status,budget,spend'),
      ])
      setContacts(c.data ?? [])
      setDeals(d.data ?? [])
      setTasks(t.data ?? [])
      setCampaigns(ca.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // KPIs
  const totalLeads = contacts.length
  const activeCampaigns = campaigns.filter(c => c.status === 'Active').length
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget ?? 0), 0)
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0)
  const budgetUsed = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0
  const wonDeals = deals.filter(d => d.stage === 'Won')
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0)
  const pipelineValue = deals.filter(d => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0)
  const winRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0
  const tasksDueToday = tasks.filter(t => t.due_date === today() && !t.done).length
  const overdueCount = tasks.filter(t => isOverdue(t.due_date) && !t.done).length

  // Channel breakdown from contacts
  const channelMap: Record<string, number> = {}
  contacts.forEach(c => {
    const ch = c.utm_source ?? 'Organic'
    channelMap[ch] = (channelMap[ch] ?? 0) + 1
  })
  const channels = Object.entries(channelMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const maxLeads = Math.max(...channels.map(([, n]) => n), 1)

  // Pipeline funnel
  const stageCount = STAGE_ORDER.map(stage => ({
    stage,
    count: deals.filter(d => d.stage === stage).length,
    value: deals.filter(d => d.stage === stage).reduce((s, d) => s + d.value, 0),
  }))
  const maxCount = Math.max(...stageCount.map(s => s.count), 1)

  // Recent contacts (last 5)
  const recentContacts = [...contacts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const kpis = [
    { label: 'Total Leads', value: totalLeads, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50', sub: `${activeCampaigns} active campaigns` },
    { label: 'Pipeline Value', value: `$${pipelineValue.toLocaleString()}`, icon: DollarSign, color: 'text-orange-500', bg: 'bg-orange-50', sub: `${deals.filter(d => !['Won','Lost'].includes(d.stage)).length} active deals` },
    { label: 'Won Revenue', value: `$${wonValue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: `${winRate}% win rate` },
    { label: 'Active Campaigns', value: activeCampaigns, icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50', sub: `${budgetUsed}% budget used` },
    { label: 'Tasks Due Today', value: tasksDueToday, icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-50', sub: overdueCount > 0 ? `${overdueCount} overdue` : 'No overdue tasks' },
    { label: 'Win Rate', value: `${winRate}%`, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: `${wonDeals.length} of ${deals.length} deals won` },
  ]

  return (
    <div>
      <Header title="Dashboard" subtitle="Performance overview — AgentsPilot CRM" />
      <div className="p-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className={`h-9 w-9 rounded-lg ${k.bg} flex items-center justify-center mb-3`}>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${k.color}`}>
                {loading ? <span className="animate-pulse bg-gray-100 rounded h-6 w-12 inline-block" /> : k.value}
              </p>
              <p className="text-xs text-slate-400 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Pipeline Funnel */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Pipeline Funnel</h2>
            <p className="text-xs text-slate-500 mb-4">Deals by stage — all time</p>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : (
              <div className="space-y-2">
                {stageCount.map(({ stage, count, value }) => (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-slate-600 shrink-0">{stage}</div>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${stageColor[stage]}`}
                        style={{ width: `${Math.max((count / maxCount) * 100, count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <div className="w-6 text-xs font-semibold text-slate-700 text-right">{count}</div>
                    {value > 0 && (
                      <div className="w-20 text-xs text-slate-400 text-right">${value.toLocaleString()}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leads by Channel */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Leads by Channel</h2>
            <p className="text-xs text-slate-500 mb-4">Source attribution from UTM data</p>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : channels.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No contact data yet</p>
            ) : (
              <div className="space-y-3">
                {channels.map(([ch, count]) => (
                  <div key={ch} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-24 shrink-0">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: channelColor[ch] ?? '#94a3b8' }} />
                      <span className="text-xs text-slate-700 truncate">{ch}</span>
                    </div>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max((count / maxLeads) * 100, 4)}%`,
                          backgroundColor: channelColor[ch] ?? '#94a3b8',
                          opacity: 0.75,
                        }}
                      />
                    </div>
                    <div className="w-8 text-xs font-semibold text-slate-700 text-right">{count}</div>
                    <div className="w-10 text-xs text-slate-400 text-right">
                      {Math.round((count / totalLeads) * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Contacts */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recent Contacts</h2>
                <p className="text-xs text-slate-500 mt-0.5">Last 5 leads added</p>
              </div>
              <a href="/contacts" className="text-xs text-orange-500 hover:underline">View all →</a>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : recentContacts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No contacts yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentContacts.map(c => (
                  <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-orange-600">
                          {(c.full_name ?? c.email ?? '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{c.full_name ?? c.email ?? 'Unknown'}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {c.campaign_name ? `📣 ${c.campaign_name}` : (c.utm_source ?? 'Organic')} · {new Date(c.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      c.status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                      c.status === 'active' ? 'bg-sky-100 text-sky-700' :
                      c.status === 'lead' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{c.status ?? 'New'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campaign Summary */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Campaigns</h2>
                <p className="text-xs text-slate-500 mt-0.5">Budget & spend overview</p>
              </div>
              <a href="/campaigns" className="text-xs text-orange-500 hover:underline">View all →</a>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No campaigns yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {campaigns.slice(0, 5).map(c => {
                  const pct = c.budget && c.budget > 0 ? Math.round(((c.spend ?? 0) / c.budget) * 100) : 0
                  return (
                    <div key={c.id} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-xs font-medium text-slate-800 truncate">{c.name ?? 'Unnamed Campaign'}</p>
                          <p className="text-xs text-slate-400">{c.channel ?? '—'}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                          c.status === 'Paused' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{c.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">${(c.spend ?? 0).toLocaleString()} / ${(c.budget ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
