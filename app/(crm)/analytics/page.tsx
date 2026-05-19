import Header from '@/components/layout/Header'
import { PerformanceLineChart, ChannelBarChart, BudgetRevenueChart, CohortCrChart } from '@/components/charts/Charts'
import { weeklyPerformance, channelPerformance, kpiSummary } from '@/lib/mock-data'

export default function AnalyticsPage() {
  const bestChannel = channelPerformance.reduce((a, b) => a.cr > b.cr ? a : b)
  const bestWeek = weeklyPerformance.reduce((a, b) => a.leads > b.leads ? a : b)

  return (
    <div>
      <Header title="Analytics" subtitle="Deep-dive performance analysis" />
      <div className="p-6 space-y-6">

        {/* Insights bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Best Performing Channel',
              value: bestChannel.channel,
              sub: `${bestChannel.cr}% CR · ${bestChannel.leads.toLocaleString()} leads`,
              color: 'border-l-indigo-500',
            },
            {
              title: 'Best Week',
              value: bestWeek.week,
              sub: `${bestWeek.leads} leads · ${bestWeek.conversions} conversions`,
              color: 'border-l-emerald-500',
            },
            {
              title: 'Overall ROAS',
              value: `${kpiSummary.avgROI}%`,
              sub: `$966K revenue on $127K spend`,
              color: 'border-l-amber-500',
            },
          ].map(insight => (
            <div key={insight.title} className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm border-l-4 ${insight.color}`}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{insight.title}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{insight.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{insight.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">CR Rate & Leads — 12 Weeks</h2>
          <p className="text-xs text-slate-500 mb-4">Overall funnel performance trend</p>
          <PerformanceLineChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Channel Comparison</h2>
            <p className="text-xs text-slate-500 mb-4">Leads vs Conversions by channel</p>
            <ChannelBarChart />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">CR Rate Trend</h2>
            <p className="text-xs text-slate-500 mb-4">Cohort conversion rate over time</p>
            <CohortCrChart data={weeklyPerformance} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Revenue vs Spend</h2>
          <p className="text-xs text-slate-500 mb-4">6-month financial performance</p>
          <BudgetRevenueChart />
        </div>

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
                {channelPerformance.map(ch => {
                  const roas = ch.spend > 0 ? ((ch.revenue / ch.spend) * 100).toFixed(0) : '∞'
                  return (
                    <tr key={ch.channel} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ch.color }} />
                          <span className="font-medium text-slate-900">{ch.channel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{ch.leads.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{ch.conversions}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${ch.cr >= 10 ? 'text-emerald-600' : ch.cr >= 7 ? 'text-indigo-600' : 'text-amber-600'}`}>
                          {ch.cr}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{ch.cpl === 0 ? '—' : `$${ch.cpl}`}</td>
                      <td className="px-4 py-3 text-slate-700">{ch.spend === 0 ? '—' : `$${ch.spend.toLocaleString()}`}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">${ch.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-amber-600">{roas}{roas !== '∞' ? '%' : ''}</span>
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
