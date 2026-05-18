import Header from '@/components/layout/Header'
import KpiCard from '@/components/ui/KpiCard'
import { PerformanceLineChart, ChannelBarChart, BudgetDonutChart, FunnelViz } from '@/components/charts/Charts'
import { kpiSummary, funnelData, channelPerformance } from '@/lib/mock-data'
import { Users, Target, DollarSign, TrendingUp, Zap, BarChart2 } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div>
      <Header title="Dashboard" subtitle="Performance overview — AgentsPilot CRM" />
      <div className="p-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            title="CR Rate"
            value={`${kpiSummary.avgCR}%`}
            change={12.4}
            changeLabel="vs last period"
            icon={Target}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
          />
          <KpiCard
            title="CPL"
            value={`$${kpiSummary.avgCPL}`}
            change={-8.2}
            changeLabel="vs last period"
            icon={DollarSign}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
          <KpiCard
            title="Total Leads"
            value={kpiSummary.totalLeads}
            change={18.6}
            changeLabel="vs last period"
            icon={Users}
            iconColor="text-sky-600"
            iconBg="bg-sky-50"
          />
          <KpiCard
            title="Budget Used"
            value={`${kpiSummary.budgetUsed}%`}
            change={-3.1}
            changeLabel="under budget"
            icon={BarChart2}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
          <KpiCard
            title="Revenue"
            value="$966K"
            change={22.1}
            changeLabel="vs last period"
            icon={TrendingUp}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <KpiCard
            title="Active Campaigns"
            value={kpiSummary.activeCampaigns}
            icon={Zap}
            iconColor="text-rose-600"
            iconBg="bg-rose-50"
          />
        </div>

        {/* Performance Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Performance Over Time</h2>
              <p className="text-xs text-slate-500 mt-0.5">CR Rate & Leads — last 12 weeks</p>
            </div>
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-slate-600 bg-gray-50">
              <option>Last 12 weeks</option>
              <option>Last 6 months</option>
            </select>
          </div>
          <PerformanceLineChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Performance */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Performance by Channel</h2>
            <p className="text-xs text-slate-500 mb-4">Leads & Conversions — all time</p>
            <ChannelBarChart />
          </div>

          {/* Budget Allocation */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Budget Allocation</h2>
            <p className="text-xs text-slate-500 mb-4">Spend distribution by channel</p>
            <BudgetDonutChart />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel / Status by Level */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Status by Level</h2>
            <p className="text-xs text-slate-500 mb-4">Conversion funnel — all channels</p>
            <FunnelViz data={funnelData} />
          </div>

          {/* Channel stats table */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Channel Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left text-xs font-medium text-slate-500">Channel</th>
                    <th className="pb-2 text-right text-xs font-medium text-slate-500">Leads</th>
                    <th className="pb-2 text-right text-xs font-medium text-slate-500">CR%</th>
                    <th className="pb-2 text-right text-xs font-medium text-slate-500">CPL</th>
                    <th className="pb-2 text-right text-xs font-medium text-slate-500">Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {channelPerformance.map((ch) => (
                    <tr key={ch.channel} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                          <span className="font-medium text-slate-800">{ch.channel}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-slate-700">{ch.leads.toLocaleString()}</td>
                      <td className="py-2.5 text-right">
                        <span className={`font-semibold ${ch.cr >= 10 ? 'text-emerald-600' : ch.cr >= 7 ? 'text-indigo-600' : 'text-amber-600'}`}>
                          {ch.cr}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-700">
                        {ch.cpl === 0 ? <span className="text-emerald-600 font-medium">Free</span> : `$${ch.cpl}`}
                      </td>
                      <td className="py-2.5 text-right text-slate-700">
                        {ch.spend === 0 ? '—' : `$${ch.spend.toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
