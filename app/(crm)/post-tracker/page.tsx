'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'

type Post = {
  id: string
  title: string
  platform: string
  status: 'published' | 'scheduled' | 'draft'
  post_date: string | null
  week_num: number
}

const statusVariant: Record<string, 'success' | 'info' | 'neutral'> = {
  published: 'success', scheduled: 'info', draft: 'neutral',
}

const CHANNELS = ['Meta', 'Instagram', 'TikTok', 'LinkedIn', 'Email']

function weekLabel(weekNum: number): string {
  if (weekNum === 0) return 'Unscheduled'
  return `W${weekNum}`
}

export default function PostTrackerPage() {
  const [posts, setPosts]   = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView]     = useState<'grid' | 'channel'>('grid')

  useEffect(() => {
    supabase
      .from('posts_library')
      .select('id, title, platform, status, post_date, week_num')
      .order('week_num', { ascending: true })
      .then(({ data }) => {
        setPosts(data ?? [])
        setLoading(false)
      })
  }, [])

  // Build unique sorted week list
  const weeks = [...new Set(posts.filter(p => p.week_num > 0).map(p => p.week_num))].sort((a, b) => a - b)

  // week × channel lookup: count + dominant status
  function getCell(weekNum: number, channel: string) {
    const matching = posts.filter(p => p.week_num === weekNum && p.platform === channel)
    if (matching.length === 0) return null
    const dominant = matching.some(p => p.status === 'published') ? 'published'
      : matching.some(p => p.status === 'scheduled') ? 'scheduled' : 'draft'
    return { count: matching.length, status: dominant as Post['status'], posts: matching }
  }

  return (
    <div>
      <Header title="Post Tracker" subtitle="Social content schedule by week and channel" />
      <div className="p-6 space-y-6">

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

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-slate-400 animate-pulse">Loading…</div>
        ) : view === 'grid' ? (

          /* ── Week × Channel Grid ── */
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Week</th>
                    {CHANNELS.map(ch => (
                      <th key={ch} className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{ch}</th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {weeks.map(weekNum => {
                    const total = CHANNELS.reduce((s, ch) => s + (getCell(weekNum, ch)?.count ?? 0), 0)
                    return (
                      <tr key={weekNum} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 font-medium text-slate-900 whitespace-nowrap">{weekLabel(weekNum)}</td>
                        {CHANNELS.map(ch => {
                          const cell = getCell(weekNum, ch)
                          return (
                            <td key={ch} className="px-4 py-4 text-center">
                              {cell ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-base font-bold text-slate-900">{cell.count}</span>
                                  <Badge label={cell.status} variant={statusVariant[cell.status]} />
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
                  {weeks.length === 0 && (
                    <tr>
                      <td colSpan={CHANNELS.length + 2} className="px-4 py-8 text-center text-slate-400">
                        No posts with week numbers yet. Set week_num on posts in the Posts Library.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        ) : (

          /* ── By Channel View ── */
          <div className="space-y-4">
            {CHANNELS.map(channel => {
              const channelPosts = posts.filter(p => p.platform === channel)
              if (channelPosts.length === 0) return null
              const channelWeeks = [...new Set(channelPosts.filter(p => p.week_num > 0).map(p => p.week_num))].sort((a, b) => a - b)
              return (
                <div key={channel} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-slate-900">{channel}</h3>
                    <span className="text-xs text-slate-500">{channelPosts.length} posts total</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {channelWeeks.map(weekNum => {
                      const cell = getCell(weekNum, channel)!
                      return (
                        <div key={weekNum} className="flex items-center justify-between px-6 py-3">
                          <span className="text-sm text-slate-700 w-24">{weekLabel(weekNum)}</span>
                          <span className="text-sm font-medium text-slate-900">{cell.count} post{cell.count > 1 ? 's' : ''}</span>
                          <Badge label={cell.status} variant={statusVariant[cell.status]} />
                        </div>
                      )
                    })}
                    {/* Posts with no week number */}
                    {channelPosts.filter(p => p.week_num === 0).map(p => (
                      <div key={p.id} className="flex items-center justify-between px-6 py-3 bg-gray-50/50">
                        <span className="text-sm text-slate-500 truncate flex-1">{p.title}</span>
                        <Badge label={p.status} variant={statusVariant[p.status]} />
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
