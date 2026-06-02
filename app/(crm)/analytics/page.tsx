'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { TrendingUp, Users, Zap, DollarSign, Snowflake, ArrowRight, Loader2, BarChart2 } from 'lucide-react'

type Contact = {
  contact_id:       string
  stage:            string
  state:            string
  acquisition_type: string | null
  channel:          string | null
  utm_source:       string | null
  created_at:       string
}

type StageRow = {
  contact_id: string
  stage:      string
  state:      string
  changed_at: string
}

function pct(num: number, den: number) {
  if (!den) return '—'
  return Math.round((num / den) * 100) + '%'
}

function StatCard({ label, value, sub, icon: Icon, color, bg }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; bg: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-4">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Bar({ label, value, max, color, sub }: {
  label: string; value: number; max: number; color: string; sub?: string
}) {
  const w = max ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-400">{value}{sub ? ` · ${sub}` : ''}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [history,  setHistory]  = useState<StageRow[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: h }] = await Promise.all([
        supabase.from('contacts_current').select('contact_id,stage,state,acquisition_type,channel,utm_source,created_at'),
        supabase.from('contact_stages').select('contact_id,stage,state,changed_at'),
      ])
      setContacts((c ?? []) as Contact[])
      setHistory((h ?? []) as StageRow[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading analytics…
      </div>
    )
  }

  // Funnel — unique contacts that ever reached each stage
  const everLead  = new Set(history.filter(h => h.stage === 'lead').map(h => h.contact_id)).size
  const everTrial = new Set(history.filter(h => h.stage === 'customer_trial').map(h => h.contact_id)).size
  const everPaid  = new Set(history.filter(h => h.stage === 'customer_paid').map(h => h.contact_id)).size

  // Current counts
  const leadContacts = contacts.filter(c => c.stage === 'lead')
  const totalTrial   = contacts.filter(c => c.stage === 'customer_trial').length
  const totalPaid    = contacts.filter(c => c.stage === 'customer_paid').length
  const totalAll     = contacts.length
  const coldLeads    = leadContacts.filter(c => c.state === 'cold').length
  const activeLeads  = leadContacts.filter(c => c.state !== 'cold').length

  const LEAD_STATES = [
    { state: 'new',          label: 'New',             color: 'bg-amber-400'  },
    { state: 'contacted',    label: 'Follow up · 1d',  color: 'bg-sky-400'    },
    { state: 'reminded_7d',  label: 'Follow up · 7d',  color: 'bg-amber-500'  },
    { state: 'reminded_21d', label: 'Follow up · 21d', color: 'bg-orange-500' },
    { state: 'cold',         label: '❄️ Cold',          color: 'bg-slate-400'  },
  ]

  const stateCount = (s: string) => leadContacts.filter(c => c.state === s).length

  // Acquisition type
  const nurtured    = contacts.filter(c => c.acquisition_type === 'lead_nurtured').length
  const directTrial = contacts.filter(c => c.acquisition_type === 'direct_trial').length
  const directPaid  = contacts.filter(c => c.acquisition_type === 'direct_paid').length

  // Channel breakdown
  const channelMap: Record<string, number> = {}
  contacts.forEach(c => {
    const ch = c.channel || c.utm_source || 'Direct'
    channelMap[ch] = (channelMap[ch] ?? 0) + 1
  })
  const channels = Object.entries(channelMap).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const FUNNEL = [
    { label: 'Leads',    count: everLead,  color: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700'     },
    { label: 'Trial',    count: everTrial, color: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700'       },
    { label: 'Paid',     count: everPaid,  color: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  ]

  return (
    <div>
      <Header title="Analytics" subtitle="Lead acquisition & conversion funnel" />
      <div className="p-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Contacts"   value={totalAll}    icon={Users}       color="text-slate-600"    bg="bg-slate-100"   />
          <StatCard label="Active Leads"     value={activeLeads} sub={`${coldLeads} cold`}
                    icon={TrendingUp} color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="In Trial"         value={totalTrial}  sub={`${pct(everTrial, everLead)} of leads`}
                    icon={Zap}        color="text-blue-600"  bg="bg-blue-50"  />
          <StatCard label="Paying Customers" value={totalPaid}   sub={`${pct(everPaid, everTrial)} of trials`}
                    icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50" />
        </div>

        {/* Conversion Funnel */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-slate-400" /> Conversion Funnel
          </h2>
          <div className="flex items-end gap-3">
            {FUNNEL.map((s, i) => (
              <div key={s.label} className="flex items-center gap-3 flex-1">
                <div className="flex-1">
                  <div className={`rounded-xl ${s.color} flex items-center justify-center`}
                    style={{ height: `${Math.max(40, 80 * (s.count / (FUNNEL[0].count || 1)))}px`, opacity: 0.85 + 0.15 * (i / FUNNEL.length) }}>
                    <span className="text-white text-lg font-bold">{s.count}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-slate-500 font-medium">{s.label}</span>
                    {i > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${s.badge}`}>
                        {pct(s.count, FUNNEL[i - 1].count)}
                      </span>
                    )}
                  </div>
                </div>
                {i < FUNNEL.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-gray-300 shrink-0 mb-5" />
                )}
              </div>
            ))}
          </div>

          {/* Rate summary */}
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-blue-600">{pct(everTrial, everLead)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Lead → Trial rate</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600">{pct(everPaid, everTrial)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Trial → Paid rate</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-500">{pct(coldLeads, everLead)}</p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                <Snowflake className="h-3 w-3" /> Cold rate
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Lead Pipeline Breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Lead Pipeline Breakdown</h2>
            {leadContacts.length === 0
              ? <p className="text-sm text-slate-300 text-center py-6">No leads yet</p>
              : <div className="space-y-3">
                  {LEAD_STATES.map(s => (
                    <Bar key={s.state} label={s.label} value={stateCount(s.state)}
                      max={leadContacts.length} color={s.color} sub={pct(stateCount(s.state), leadContacts.length)} />
                  ))}
                </div>
            }
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Acquisition type */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Acquisition Type</h2>
              <div className="space-y-3">
                <Bar label="🌱 Lead nurtured" value={nurtured}    max={totalAll || 1} color="bg-amber-400"   sub={pct(nurtured,    totalAll)} />
                <Bar label="⚡ Direct trial"  value={directTrial} max={totalAll || 1} color="bg-sky-400"     sub={pct(directTrial, totalAll)} />
                <Bar label="💳 Direct paid"   value={directPaid}  max={totalAll || 1} color="bg-emerald-400" sub={pct(directPaid,  totalAll)} />
              </div>
            </div>

            {/* Channel */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">By Channel</h2>
              {channels.length === 0
                ? <p className="text-xs text-slate-300 text-center py-2">No channel data</p>
                : <div className="space-y-3">
                    {channels.map(([ch, count]) => (
                      <Bar key={ch} label={ch} value={count} max={totalAll || 1} color="bg-violet-400" sub={pct(count, totalAll)} />
                    ))}
                  </div>
              }
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
