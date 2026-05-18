import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { pipeline } from '@/lib/mock-data'

const stageColors: Record<string, string> = {
  'New Lead': 'bg-sky-50 border-sky-200',
  'Contacted': 'bg-indigo-50 border-indigo-200',
  'Qualified': 'bg-violet-50 border-violet-200',
  'Proposal Sent': 'bg-amber-50 border-amber-200',
  'Won': 'bg-emerald-50 border-emerald-200',
  'Lost': 'bg-red-50 border-red-200',
}

const stageHeader: Record<string, string> = {
  'New Lead': 'bg-sky-500',
  'Contacted': 'bg-indigo-500',
  'Qualified': 'bg-violet-500',
  'Proposal Sent': 'bg-amber-500',
  'Won': 'bg-emerald-500',
  'Lost': 'bg-red-400',
}

const channelVariant = {
  Meta: 'indigo',
  Google: 'info',
  TikTok: 'danger',
  Organic: 'success',
  Email: 'neutral',
} as const

const totalPipeline = pipeline.cards
  .filter(c => !['Won', 'Lost'].includes(c.stage))
  .reduce((s, c) => s + c.value, 0)
const totalWon = pipeline.cards.filter(c => c.stage === 'Won').reduce((s, c) => s + c.value, 0)

export default function PipelinePage() {
  return (
    <div>
      <Header title="Lead Pipeline" subtitle="Deal flow by stage" />
      <div className="p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Leads', value: pipeline.cards.filter(c => !['Won', 'Lost'].includes(c.stage)).length },
            { label: 'Pipeline Value', value: `$${totalPipeline.toLocaleString()}` },
            { label: 'Won This Period', value: `$${totalWon.toLocaleString()}` },
            { label: 'Win Rate', value: `${Math.round((pipeline.cards.filter(c => c.stage === 'Won').length / pipeline.cards.length) * 100)}%` },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Kanban Board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {pipeline.columns.map(col => {
              const colCards = pipeline.cards.filter(c => c.stage === col)
              const colValue = colCards.reduce((s, c) => s + c.value, 0)
              return (
                <div key={col} className="w-64 flex flex-col gap-3">
                  {/* Column header */}
                  <div className={`rounded-lg p-3 ${stageColors[col]} border`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${stageHeader[col]}`} />
                        <span className="text-xs font-semibold text-slate-700">{col}</span>
                      </div>
                      <span className="text-xs text-slate-500">{colCards.length}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">${colValue.toLocaleString()}</p>
                  </div>

                  {/* Cards */}
                  {colCards.map(card => (
                    <div key={card.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{card.name}</p>
                          <p className="text-xs text-slate-500">{card.company}</p>
                        </div>
                        <span className={`text-xs font-bold ${card.priority === 'High' ? 'text-red-500' : card.priority === 'Medium' ? 'text-amber-500' : 'text-slate-400'}`}>
                          {card.priority === 'High' ? '↑↑' : card.priority === 'Medium' ? '↑' : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge label={card.channel} variant={channelVariant[card.channel as keyof typeof channelVariant] ?? 'neutral'} />
                        <span className="text-sm font-bold text-slate-900">${card.value.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{card.date}</p>
                    </div>
                  ))}

                  {colCards.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center text-xs text-slate-300">
                      No leads here
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
