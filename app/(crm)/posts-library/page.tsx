'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { posts, type Post } from '@/lib/mock-data'
import { Search, Eye, MousePointerClick, Users } from 'lucide-react'

const platformVariant = {
  Meta: 'indigo',
  Instagram: 'warning',
  TikTok: 'danger',
  LinkedIn: 'info',
  Email: 'neutral',
} as const

const statusVariant = {
  published: 'success',
  scheduled: 'info',
  draft: 'neutral',
} as const

const platforms = ['All', 'Meta', 'Instagram', 'TikTok', 'LinkedIn', 'Email']
const statuses = ['All', 'published', 'scheduled', 'draft']
const types = ['All', 'image', 'video', 'carousel', 'story', 'email']

export default function PostsLibraryPage() {
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('All')
  const [status, setStatus] = useState('All')
  const [type, setType] = useState('All')
  const [sort, setSort] = useState<'leads' | 'reach' | 'engagement' | 'score'>('score')

  const filtered = posts
    .filter(p => {
      const q = search.toLowerCase()
      return (
        (!search || p.title.toLowerCase().includes(q) || p.hook.toLowerCase().includes(q)) &&
        (platform === 'All' || p.platform === platform) &&
        (status === 'All' || p.status === status) &&
        (type === 'All' || p.type === type)
      )
    })
    .sort((a, b) => b[sort] - a[sort])

  return (
    <div>
      <Header title="Posts Library" subtitle={`${posts.length} posts across all platforms`} />
      <div className="p-6 space-y-6">

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search posts or hooks..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {[
            { label: 'Platform', value: platform, set: setPlatform, opts: platforms },
            { label: 'Status', value: status, set: setStatus, opts: statuses },
            { label: 'Type', value: type, set: setType, opts: types },
            { label: 'Sort by', value: sort, set: setSort as (v: string) => void, opts: ['score', 'leads', 'reach', 'engagement'] },
          ].map(f => (
            <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700">
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((post: Post) => (
            <div key={post.id} className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug flex-1">{post.title}</h3>
                  {post.score > 0 && (
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                      post.score >= 90 ? 'bg-emerald-100 text-emerald-700' :
                      post.score >= 80 ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{post.score}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge label={post.platform} variant={platformVariant[post.platform]} />
                  <Badge label={post.type} variant="neutral" />
                  <Badge label={post.status} variant={statusVariant[post.status]} />
                </div>
              </div>

              {/* Hook */}
              <div className="px-4 py-3 bg-slate-50 border-b border-gray-100">
                <p className="text-xs text-slate-500 font-medium mb-1">Hook</p>
                <p className="text-xs text-slate-700 italic leading-relaxed">&ldquo;{post.hook}&rdquo;</p>
              </div>

              {/* Stats */}
              {post.status === 'published' ? (
                <div className="grid grid-cols-4 divide-x divide-gray-100 p-0">
                  {[
                    { icon: Eye, label: 'Reach', value: post.reach >= 1000 ? `${(post.reach / 1000).toFixed(0)}K` : post.reach },
                    { icon: null, label: 'Eng%', value: `${post.engagement}%` },
                    { icon: MousePointerClick, label: 'Clicks', value: post.clicks >= 1000 ? `${(post.clicks / 1000).toFixed(1)}K` : post.clicks },
                    { icon: Users, label: 'Leads', value: post.leads },
                  ].map(s => (
                    <div key={s.label} className="flex flex-col items-center py-3 px-1">
                      <p className="text-xs text-slate-400">{s.label}</p>
                      <p className="text-sm font-bold text-slate-900">{s.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-xs text-slate-400 flex items-center justify-between">
                  <span>Scheduled for {post.date}</span>
                  <span className="capitalize">{post.status}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">No posts match your filters.</div>
        )}
      </div>
    </div>
  )
}
