'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { PerformanceLineChart, ChannelBarChart, BudgetRevenueChart, CohortCrChart, type WeeklyRow, type ChannelRow, type BudgetRow } from '@/components/charts/Charts'
import { supabase } from '@/lib/supabase'

export default function AnalyticsPage() {
  const [weekly, setWeekly]   = useState<WeeklyRow[]>([])
  const [channels, setChannels] = useState<ChannelRow[]>([])
  const [budget, setBudget]   = useState<BudgetRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('weekly_performance').select('*').order('sort_order', { ascending: true }),
      supabase.from('channel_performance').select('*').order('leads', { ascending: false }),
      supabase.from('budget_months').select('*').order('sort_order', { ascending: true }),
    ]).then(([{ data: w }, { data: c }, { data: b }]) => {
      setWeekly(w ?? [])
      setChannels(c ?? [])
      setBudget(b ?? [])
      setLoading(false)
    })
  }, [])

  const bestChannel = channels.length > 0 ? channels.reduce((a, b) => Number(a.cr) > Number(b.cr) ? a : b) : null
  const bestWeek    = weekly.length > 0   ? weekly.reduce((a, b) => Number(a.leads) > Number(b.leads) ? a : b) : null
  const totalSpend  = channels.reduce((s, c) => s + Number(c.spend), 0)
  const totalRev    = channels.reduce((s, c) => s + Number(c.revenue), 0)
  const roas        = totalSpend > 0 ? ((totalRev / totalSpend) * 100).toFixed(0) : '∞'

  return (
    <div>
      <Header title="Analytics" subtitle="Deep-dive performance analysis" />
      <div className="p-6 space-y-6">

        {/* Insights bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Best Performing Channel',
              value: bestChannel ? bestChannel.channel : '—',
              sub: bestChannel ? `${bestChannel.cr}% CR · ${Number(bestChannel.leads).toLocaleString()} leads` : '',
              color: 'border-l-indigo-500',
            },
            {
              title: 'Best Week',
              value: bestWeek ? bestWeek.week : '—',
              sub: bestWeek ? `${bestWeek.leads} leads · ${bestWeek.conversions} conversions` : '',
              color: 'border-l-emerald-500',
            },
            {
              title: 'Overall ROAS',
              value: `${roas}%`,
              sub: totalSpend > 0 ? `$${(totalRev / 1000).toFixed(0)}K revenue on $${(totalSpend / 1000).toFixed(0)}K spend` : 'No spend data',
              color: 'border-l-amber-500',
            },
          ].map(insight => (
            <div key={insight.title} className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm border-l-4 ${insight.color}`}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{insight.title}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {loading ? <span className="animate-pulse bg-gray-100 rounded h-6 w-20 inline-block" /> : insight.value}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{insight.sub}</p>
            </div>
          ))}
        </div>

        {!loading && weekly.length > 0 && (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">CR Rate & Leads — {weekly.length} Weeks</h2>
              <p className="text-xs text-slate-500 mb-4">Overall funnel performance trend</p>
              <PerformanceLineChart data={weekly} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-1">Channel Comparison</h2>
                <p className="text-xs text-slate-500 mb-4">Leads vs Conversions by channel</p>
                <ChannelBarChart data={channels} />
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-1">CR Rate Trend</h2>
                <p className="text-xs text-slate-500 mb-4">Cohort conversion rate over time</p>
                <CohortCrChart data={weekly} />
              </div>
            </div>

            {budget.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-1">Revenue vs Spend</h2>
                <p className="text-xs text-slate-500 mb-4">6-month financial performance</p>
                <BudgetRevenueChart data={budget} />
              </div>
            )}
          </>
        )}

        {/* Channel deep-dive table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-slate-900">Channel Performance Deep Dive</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Channel', 'Leads', 'Conv.', 'CR %', 'CPL', 'Spend', 'Revenue', 'ROAS'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {channels.map(ch => {
                  const chRoas = Number(ch.spend) > 0 ? ((Number(ch.revenue) / Number(ch.spend)) * 100).toFixed(0) : '∞'
                  return (
                    <tr key={ch.channel} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ch.color }} />
                          <span className="font-medium text-slate-900">{ch.channel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{Number(ch.leads).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{ch.conversions}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${Number(ch.cr) >= 10 ? 'text-emerald-600' : Number(ch.cr) >= 7 ? 'text-indigo-600' : 'text-amber-600'}`}>
                          {ch.cr}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{Number(ch.cpl) === 0 ? '—' : `$${ch.cpl}`}</td>
                      <td className="px-4 py-3 text-slate-700">{Number(ch.spend) === 0 ? '—' : `$${Number(ch.spend).toLocaleString()}`}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">${Number(ch.revenue).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-amber-600">{chRoas}{chRoas !== '∞' ? '%' : ''}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
