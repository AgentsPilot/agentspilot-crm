import Header from '@/components/layout/Header'
import { BudgetRevenueChart, BudgetDonutChart, RoiChart } from '@/components/charts/Charts'
import { budgetData, channelBudget } from '@/lib/mock-data'

const totals = budgetData.reduce(
  (acc, m) => ({
    allocated: acc.allocated + m.allocated,
    spent: acc.spent + m.spent,
    revenue: acc.revenue + m.revenue,
  }),
  { allocated: 0, spent: 0, revenue: 0 }
)

export default function BudgetPage() {
  const utilisation = ((totals.spent / totals.allocated) * 100).toFixed(1)
  const roi = (((totals.revenue - totals.spent) / totals.spent) * 100).toFixed(0)

  return (
    <div>
      <Header title="Budget & Revenue" subtitle="Financial performance across all channels" />
      <div className="p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Allocated', value: `$${(totals.allocated / 1000).toFixed(0)}K`, sub: '6-month budget', color: 'text-slate-900' },
            { label: 'Total Spent', value: `$${(totals.spent / 1000).toFixed(0)}K`, sub: `${utilisation}% utilised`, color: 'text-indigo-600' },
            { label: 'Total Revenue', value: `$${(totals.revenue / 1000).toFixed(0)}K`, sub: 'Attributed revenue', color: 'text-emerald-600' },
            { label: 'Overall ROI', value: `${roi}%`, sub: 'Return on ad spend', color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Budget vs Revenue Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Budget vs Revenue</h2>
          <p className="text-xs text-slate-500 mb-4">Monthly allocated, spent, and revenue — 6 months</p>
          <BudgetRevenueChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget Allocation Donut */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Budget by Channel</h2>
            <p className="text-xs text-slate-500 mb-4">Spend distribution</p>
            <BudgetDonutChart />
          </div>

          {/* ROI chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">ROI by Month</h2>
            <p className="text-xs text-slate-500 mb-4">Return on investment %</p>
            <RoiChart />
          </div>
        </div>

        {/* Channel budget table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-slate-900">Channel Budget Detail</h2>
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
                {channelBudget.map(ch => {
                  const remaining = ch.allocated - ch.spent
                  const util = ((ch.spent / ch.allocated) * 100).toFixed(0)
                  return (
                    <tr key={ch.channel} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{ch.channel}</td>
                      <td className="px-4 py-3 text-slate-700">${ch.allocated.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">${ch.spent.toLocaleString()}</td>
                      <td className={`px-4 py-3 font-medium ${remaining > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ${remaining.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-24">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${util}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{util}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{ch.pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly breakdown */}
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
                    <td className="px-4 py-3 text-slate-700">${m.allocated.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-700">${m.spent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">${m.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-amber-600">{m.roi}%</span>
                    </td>
                    <td className="px-4 py-3 text-emerald-600">${(m.allocated - m.spent).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
