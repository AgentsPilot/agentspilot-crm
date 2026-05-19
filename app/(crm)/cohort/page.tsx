import Header from '@/components/layout/Header'
import { CohortCrChart, CplLineChart } from '@/components/charts/Charts'
import { cohortData, weeklyPerformance } from '@/lib/mock-data'

function delta(arr: number[], i: number) {
  if (i === 0) return null
  return ((arr[i] - arr[i - 1]) / arr[i - 1]) * 100
}

const crArr = weeklyPerformance.map(w => w.cr)

export default function CohortPage() {
  const last = weeklyPerformance[weeklyPerformance.length - 1]

  return (
    <div>
      <Header title="Cohort Program" subtitle="KPI tracking — CR, CPL, CPA by week" />
      <div className="p-6 space-y-6">

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Latest CR Rate', value: `${last.cr}%`, desc: 'Conversion Rate this week' },
            { label: 'Latest CPL', value: `$${last.cpl}`, desc: 'Cost Per Lead this week' },
            { label: 'Latest CPA', value: `$${last.cpa}`, desc: 'Cost Per Acquisition this week' },
          ].map(k => {
            return (
              <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{k.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{k.value}</p>
                <p className="text-xs text-slate-400 mt-1">{k.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">CR Rate Trend</h2>
            <p className="text-xs text-slate-500 mb-4">Weekly conversion rate — 12 cohorts</p>
            <CohortCrChart data={weeklyPerformance} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">CPL Trend</h2>
            <p className="text-xs text-slate-500 mb-4">Cost per lead — 12 cohorts</p>
            <CplLineChart />
          </div>
        </div>

        {/* Cohort Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-slate-900">Cohort Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">12-week cohort performance by channel</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Week', 'Leads', 'Conv.', 'CR%', 'CPL', 'CPA', 'Spend', 'Revenue', 'Meta', 'Google', 'TikTok'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cohortData.map((row, i) => {
                  const crChange = delta(crArr, i)
                  return (
                    <tr key={row.week} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{row.week}</td>
                      <td className="px-4 py-3 text-slate-700">{row.leads}</td>
                      <td className="px-4 py-3 text-slate-700">{row.conversions}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${row.cr >= 9 ? 'text-emerald-600' : row.cr >= 7 ? 'text-indigo-600' : 'text-amber-600'}`}>
                          {row.cr}%
                        </span>
                        {crChange !== null && (
                          <span className={`ml-1 text-xs ${crChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {crChange > 0 ? '↑' : '↓'}{Math.abs(crChange).toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">${row.cpl}</td>
                      <td className="px-4 py-3 text-slate-700">${row.cpa}</td>
                      <td className="px-4 py-3 text-slate-700">${row.spend.toLocaleString()}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">${row.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500">{row.meta.leads}</td>
                      <td className="px-4 py-3 text-slate-500">{row.google.leads}</td>
                      <td className="px-4 py-3 text-slate-500">{row.tiktok.leads}</td>
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
