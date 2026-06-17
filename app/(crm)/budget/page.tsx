'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { BudgetRevenueChart, BudgetDonutChart, RoiChart, type BudgetRow, type ChannelBudgetRow } from '@/components/charts/Charts'
import { supabase } from '@/lib/supabase'

type Campaign = { channel: string | null; spent: number; budget: number }

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

export default function BudgetPage() {
  const [budgetData, setBudgetData]       = useState<BudgetRow[]>([])
  const [channelBudget, setChannelBudget] = useState<ChannelBudgetRow[]>([])
  const [campaigns, setCampaigns]         = useState<Campaign[]>([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('budget_months').select('*').order('sort_order', { ascending: true }),
      supabase.from('channel_budgets').select('*').order('pct', { ascending: false }),
      supabase.from('campaigns').select('channel,spent,budget'),
    ]).then(([{ data: months }, { data: channels }, { data: camps }]) => {
      setBudgetData(months ?? [])
      setChannelBudget(channels ?? [])
      setCampaigns(camps ?? [])
      setLoading(false)
    })
  }, [])

  // ── Aggregate campaign data by channel ───────────────────────────────────
  const byChannel = campaigns.reduce<Record<string, { allocated: number; spent: number }>>((acc, c) => {
    const key = c.channel ?? 'Other'
    if (!acc[key]) acc[key] = { allocated: 0, spent: 0 }
    acc[key].allocated += Number(c.budget)
    acc[key].spent     += Number(c.spent)
    return acc
  }, {})

  const realTotalAllocated = Object.values(byChannel).reduce((s, v) => s + v.allocated, 0)
  const realTotalSpent     = Object.values(byChannel).reduce((s, v) => s + v.spent,     0)

  // Use campaigns data if available, otherwise fall back to manual tables
  const displayAllocated = realTotalAllocated > 0 ? realTotalAllocated : budgetData.reduce((s, m) => s + Number(m.allocated), 0)
  const displaySpent     = realTotalSpent     > 0 ? realTotalSpent     : budgetData.reduce((s, m) => s + Number(m.spent),     0)
  const totalRevenue     = budgetData.reduce((s, m) => s + Number(m.revenue), 0)

  const utilisation = displayAllocated > 0 ? ((displaySpent / displayAllocated) * 100).toFixed(1) : '0'
  const roi         = displaySpent     > 0 ? (((totalRevenue - displaySpent) / displaySpent) * 100).toFixed(0) : '0'

  // Build channel rows — from campaigns if available, else from channel_budgets table
  const channelRows: { channel: string; allocated: number; spent: number; pct?: number }[] =
    Object.keys(byChannel).length > 0
      ? Object.entries(byChannel).map(([channel, v]) => ({ channel, ...v }))
      : channelBudget.map(ch => ({ channel: ch.channel, allocated: Number(ch.allocated), spent: Number(ch.spent), pct: ch.pct }))

  const fromCampaigns = Object.keys(byChannel).length > 0

  return (
    <div>
      <Header title="Budget & Revenue" subtitle="Financial performance across all channels" />
      <div className="p-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Allocated', value: fmt(displayAllocated), sub: fromCampaigns ? 'live from campaigns' : 'manual',           color: 'text-slate-900' },
            { label: 'Total Spent',     value: fmt(displaySpent),     sub: `${utilisation}% utilised · ${fromCampaigns ? 'live from campaigns' : 'manual'}`, color: 'text-indigo-600' },
            { label: 'Total Revenue',   value: fmt(totalRevenue),     sub: 'Attributed revenue (manual)',  color: 'text-emerald-600' },
            { label: 'Overall ROI',     value: `${roi}%`,             sub: 'Return on ad spend',           color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                {loading ? <span className="animate-pulse bg-gray-100 rounded h-7 w-16 inline-block" /> : s.value}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {!loading && budgetData.length > 0 && (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Budget vs Revenue</h2>
              <p className="text-xs text-slate-500 mb-4">Monthly allocated, spent, and revenue</p>
              <BudgetRevenueChart data={budgetData} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-1">Budget by Channel</h2>
                <p className="text-xs text-slate-500 mb-4">Spend distribution</p>
                <BudgetDonutChart data={channelBudget} />
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-1">ROI by Month</h2>
                <p className="text-xs text-slate-500 mb-4">Return on investment %</p>
                <RoiChart data={budgetData} />
              </div>
            </div>
          </>
        )}

        {/* Channel budget table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Channel Budget Detail</h2>
            {fromCampaigns && (
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                🔄 Live from Campaigns
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Channel', 'Allocated', 'Spent', 'Remaining', 'Utilisation', 'Share'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">Loading…</td></tr>
                ) : channelRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">No campaign budget data yet — add budget to campaigns</td></tr>
                ) : channelRows.map(ch => {
                  const remaining = ch.allocated - ch.spent
                  const util      = ch.allocated > 0 ? ((ch.spent / ch.allocated) * 100).toFixed(0) : '0'
                  const share     = displayAllocated > 0 ? ((ch.allocated / displayAllocated) * 100).toFixed(0) : (ch.pct?.toFixed(0) ?? '0')
                  return (
                    <tr key={ch.channel} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{ch.channel}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(ch.allocated)}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(ch.spent)}</td>
                      <td className={`px-4 py-3 font-medium ${remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {fmt(Math.abs(remaining))}{remaining < 0 ? ' over' : ''}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-24">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(Number(util), 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{util}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{share}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly breakdown */}
        {budgetData.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-slate-900">Monthly Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Month', 'Allocated', 'Spent', 'Revenue', 'ROI', 'Surplus'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {budgetData.map(m => (
                    <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{m.month}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(Number(m.allocated))}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(Number(m.spent))}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">{fmt(Number(m.revenue))}</td>
                      <td className="px-4 py-3"><span className="font-semibold text-amber-600">{m.roi}%</span></td>
                      <td className="px-4 py-3 text-emerald-600">{fmt(Number(m.allocated) - Number(m.spent))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
