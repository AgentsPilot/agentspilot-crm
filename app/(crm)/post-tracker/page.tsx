'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { postTracker, posts } from '@/lib/mock-data'

const statusVariant = {
  published: 'success',
  scheduled: 'info',
  draft: 'neutral',
} as const

export default function PostTrackerPage() {
  const [view, setView] = useState<'grid' | 'channel'>('grid')

  const weeks = postTracker.weeks
  const channels = postTracker.channels

  const getCell = (week: string, channel: string) =>
    postTracker.schedule.find(s => s.week === week && s.channel === channel)

  return (
    <div>
      <Header title="Post Tracker" subtitle="Social content schedule by week and channel" />
      <div className="p-6 space-y-6">

        {/* View toggle */}
        <div className="flex items-center gap-2">
          {(['grid', 'channel'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                view === v ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-slate-600 hover:bg-gray-50'
              }`}>
              {v === 'grid' ? 'By Week' : 'By Channel'}
            </button>
          ))}
        </div>

        {view === 'grid' ? (
          /* Week × Channel Grid */
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Week</th>
                    {channels.map(ch => (
                      <th key={ch} className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{ch}</th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {weeks.map(week => {
                    const total = channels.reduce((s, ch) => s + (getCell(week, ch)?.count ?? 0), 0)
                    return (
                      <tr key={week} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 font-medium text-slate-900 whitespace-nowrap">{week}</td>
                        {channels.map(ch => {
                          const cell = getCell(week, ch)
                          return (
                            <td key={ch} className="px-4 py-4 text-center">
                              {cell ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-base font-bold text-slate-900">{cell.count}</span>
                                  <Badge label={cell.status} variant={statusVariant[cell.status as keyof typeof statusVariant]} />
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-bold text-indigo-600">{total}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* By Channel view */
          <div className="space-y-4">
            {channels.map(channel => {
              const channelSchedule = postTracker.schedule.filter(s => s.channel === channel)
              if (channelSchedule.length === 0) return null
              const channelPosts = posts.filter(p => p.platform === channel || (channel === 'Meta' && p.platform === 'Meta'))
              return (
                <div key={channel} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-slate-900">{channel}</h3>
                    <span className="text-xs text-slate-500">{channelSchedule.reduce((s, c) => s + c.count, 0)} posts total</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {channelSchedule.map(entry => (
                      <div key={entry.week} className="flex items-center justify-between px-6 py-3">
                        <span className="text-sm text-slate-700 w-40">{entry.week}</span>
                        <span className="text-sm font-medium text-slate-900">{entry.count} post{entry.count > 1 ? 's' : ''}</span>
                        <Badge label={entry.status} variant={statusVariant[entry.status as keyof typeof statusVariant]} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="font-medium">Status:</span>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Published</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" />Scheduled</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300" />Draft</div>
        </div>

      </div>
    </div>
  )
}
