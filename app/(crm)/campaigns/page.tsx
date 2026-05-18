import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { Megaphone } from 'lucide-react'

const sample = [
  { id: '1', name: 'May Meta — Strategy Call', channel: 'Meta', status: 'active', budget: 5000, spent: 3200, leads: 87, cr: 8.2, cpl: 36.8 },
  { id: '2', name: 'Google Brand Keywords', channel: 'Google', status: 'active', budget: 3000, spent: 2800, leads: 42, cr: 11.4, cpl: 66.7 },
  { id: '3', name: 'TikTok Awareness — Reel Series', channel: 'TikTok', status: 'paused', budget: 2000, spent: 1200, leads: 38, cr: 5.1, cpl: 31.6 },
  { id: '4', name: 'Email Nurture Sequence', channel: 'Email', status: 'active', budget: 500, spent: 320, leads: 24, cr: 28.4, cpl: 13.3 },
  { id: '5', name: 'LinkedIn B2B Outreach', channel: 'LinkedIn', status: 'draft', budget: 1500, spent: 0, leads: 0, cr: 0, cpl: 0 },
]

const statusVariant = { active: 'success', paused: 'warning', draft: 'neutral', ended: 'danger' } as const
const channelVariant = { Meta: 'indigo', Google: 'info', TikTok: 'danger', Email: 'neutral', LinkedIn: 'success' } as const

export default function CampaignsPage() {
  const totalLeads = sample.reduce((s, c) => s + c.leads, 0)
  const totalSpent = sample.reduce((s, c) => s + c.spent, 0)
  const avgCpl = totalLeads > 0 ? (totalSpent / totalLeads).toFixed(1) : '—'

  return (
    <div>
      <Header title="Campaigns" subtitle="Track acquisition campaigns and their lead results" />
      <div className="p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Campaigns', value: sample.filter(c => c.status === 'active').length, color: 'text-emerald-600' },
            { label: 'Total Leads', value: totalLeads, color: 'text-indigo-600' },
            { label: 'Total Spent', value: `$${totalSpent.toLocaleString()}`, color: 'text-slate-900' },
            { label: 'Avg CPL', value: `$${avgCpl}`, color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <strong>Coming next:</strong> Campaigns will be connected to Supabase and linked to contacts via UTM campaign name.
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">All Campaigns</h2>
            <button className="flex items-center gap-1.5 text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
              <Megaphone className="h-3.5 w-3.5" /> New Campaign
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Campaign', 'Channel', 'Status', 'Budget', 'Spent', 'Leads', 'CR%', 'CPL'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sample.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3">
                      <Badge label={c.channel} variant={channelVariant[c.channel as keyof typeof channelVariant] ?? 'neutral'} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={c.status} variant={statusVariant[c.status as keyof typeof statusVariant]} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">${c.budget.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-700">${c.spent.toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-indigo-600">{c.leads}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${c.cr >= 10 ? 'text-emerald-600' : c.cr >= 5 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {c.cr > 0 ? `${c.cr}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.cpl > 0 ? `$${c.cpl}` : '—'}</td>
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
