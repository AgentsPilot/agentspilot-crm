'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import {
  Loader2, Filter, Search, Pencil, ExternalLink,
  CheckCircle2, Clock, FileText, BarChart2,
} from 'lucide-react'
import Link from 'next/link'

export type TrackerPost = {
  id: string
  collateral: string
  platforms: string
  status: 'draft' | 'scheduled' | 'published'
  scheduled_date: string | null
  campaign_id: string | null
  media_type: string
  caption: string
}

type Campaign = { id: string; name: string }

const STATUS_OPTIONS = ['All', 'draft', 'scheduled', 'published']

const statusStyle: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-600',
  scheduled: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
}

const statusIcon: Record<string, React.ReactNode> = {
  draft:     <FileText className="h-3 w-3" />,
  scheduled: <Clock className="h-3 w-3" />,
  published: <CheckCircle2 className="h-3 w-3" />,
}

// ── Shared Post Tracker Table (used in standalone page + social tab) ─────────
export function PostTrackerTable({ showHeader = true }: { showHeader?: boolean }) {
  const [posts, setPosts]           = useState<TrackerPost[]>([])
  const [campaigns, setCampaigns]   = useState<Campaign[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('All')
  const [campaignFilter, setCampaign] = useState('All')
  const [platformFilter, setPlatform] = useState('All')
  const [updating, setUpdating]     = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('social_posts').select('*').order('scheduled_date', { ascending: true, nullsFirst: false }),
      supabase.from('campaigns').select('id, name').order('name'),
    ])
    setPosts(p ?? [])
    setCampaigns(c ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await supabase.from('social_posts').update({ status }).eq('id', id)
    setUpdating(null)
    fetchData()
  }

  const allPlatforms = [...new Set(posts.flatMap(p => p.platforms.split(',').map(s => s.trim())))]

  const filtered = posts.filter(p => {
    const q = search.toLowerCase()
    const matchSearch   = !search || p.collateral.toLowerCase().includes(q) || p.caption.toLowerCase().includes(q)
    const matchStatus   = statusFilter   === 'All' || p.status === statusFilter
    const matchCampaign = campaignFilter === 'All' || p.campaign_id === campaignFilter
    const matchPlatform = platformFilter === 'All' || p.platforms.includes(platformFilter)
    return matchSearch && matchStatus && matchCampaign && matchPlatform
  })

  const stats = {
    total:     posts.length,
    published: posts.filter(p => p.status === 'published').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    draft:     posts.filter(p => p.status === 'draft').length,
  }

  return (
    <div className="space-y-4">

      {/* KPI strip — only on standalone page, not when embedded in a tab */}
      {showHeader && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Posts',  value: stats.total,     color: 'text-slate-700',   bg: 'bg-slate-50',   icon: BarChart2      },
            { label: 'Published',    value: stats.published, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2   },
            { label: 'Scheduled',    value: stats.scheduled, color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Clock          },
            { label: 'Draft',        value: stats.draft,     color: 'text-slate-500',   bg: 'bg-slate-50',   icon: FileText       },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500">
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={campaignFilter} onChange={e => setCampaign(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500">
          <option value="All">All Campaigns</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={platformFilter} onChange={e => setPlatform(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500">
          <option value="All">All Platforms</option>
          {allPlatforms.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Post Title', 'Campaign', 'Platforms', 'Type', 'Scheduled', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                      No posts match your filters
                    </td>
                  </tr>
                ) : filtered.map(post => {
                  const camp = campaigns.find(c => c.id === post.campaign_id)
                  return (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 max-w-48 truncate">{post.collateral}</p>
                        {post.caption && (
                          <p className="text-xs text-slate-400 truncate max-w-48 mt-0.5">{post.caption}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {camp ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{camp.name}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-32 truncate">{post.platforms}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{post.media_type || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {post.scheduled_date ?? <span className="text-slate-300">Not set</span>}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={post.status}
                          onChange={e => updateStatus(post.id, e.target.value)}
                          disabled={updating === post.id}
                          className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 ${statusStyle[post.status]}`}
                        >
                          {['draft', 'scheduled', 'published'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href="/social?tab=create" title="Edit in Social Manager"
                            className="text-slate-400 hover:text-orange-500 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <span className={`flex items-center gap-1 text-xs ${statusStyle[post.status]} px-1.5 py-0.5 rounded`}>
                            {statusIcon[post.status]}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Standalone Page ───────────────────────────────────────────────────────────
export default function PostTrackerPage() {
  return (
    <div>
      <Header title="Post Tracker" subtitle="Track every post across all campaigns and platforms" />
      <div className="p-6">
        <PostTrackerTable showHeader={true} />
      </div>
    </div>
  )
}
