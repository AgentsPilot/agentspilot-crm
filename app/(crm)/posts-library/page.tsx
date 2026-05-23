'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { Search, Eye, MousePointerClick, Users, Plus, Loader2, X } from 'lucide-react'

type Post = {
  id: string
  title: string
  content: string | null
  platform: string
  type: string
  status: 'published' | 'scheduled' | 'draft'
  post_date: string | null
  week_num: number
  reach: number
  engagement: number
  clicks: number
  leads_count: number
  score: number
  hook: string
}

const platformVariant: Record<string, 'indigo' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  Meta: 'indigo', Instagram: 'warning', TikTok: 'danger', LinkedIn: 'info', Email: 'neutral',
}
const statusVariant: Record<string, 'success' | 'info' | 'neutral'> = {
  published: 'success', scheduled: 'info', draft: 'neutral',
}

const PLATFORMS = ['All', 'Meta', 'Instagram', 'TikTok', 'LinkedIn', 'Email']
const STATUSES  = ['All', 'published', 'scheduled', 'draft']
const TYPES     = ['All', 'image', 'video', 'carousel', 'story', 'email']

const empty = {
  title: '', content: '', platform: 'LinkedIn', type: 'image', status: 'draft' as Post['status'],
  post_date: '', week_num: 0, reach: 0, engagement: 0, clicks: 0, leads_count: 0, score: 0, hook: '',
}

export default function PostsLibraryPage() {
  const [posts, setPosts]       = useState<Post[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [platform, setPlatform] = useState('All')
  const [status, setStatus]     = useState('All')
  const [type, setType]         = useState('All')
  const [sort, setSort]         = useState<'score' | 'leads_count' | 'reach' | 'engagement'>('score')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(empty)
  const [saving, setSaving]     = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)

  async function fetchPosts() {
    const { data } = await supabase.from('posts_library').select('*').order('post_date', { ascending: false, nullsFirst: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [])

  const filtered = posts
    .filter(p => {
      const q = search.toLowerCase()
      return (
        (!search || p.title.toLowerCase().includes(q) || p.hook.toLowerCase().includes(q)) &&
        (platform === 'All' || p.platform === platform) &&
        (status   === 'All' || p.status   === status)   &&
        (type     === 'All' || p.type     === type)
      )
    })
    .sort((a, b) => Number(b[sort]) - Number(a[sort]))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, week_num: Number(form.week_num) || 0 }
    if (editId) {
      await supabase.from('posts_library').update(payload).eq('id', editId)
    } else {
      await supabase.from('posts_library').insert([payload])
    }
    setSaving(false)
    setShowForm(false)
    setForm(empty)
    setEditId(null)
    fetchPosts()
  }

  function startEdit(p: Post) {
    setForm({ title: p.title, content: p.content ?? '', platform: p.platform, type: p.type, status: p.status,
      post_date: p.post_date ?? '', week_num: p.week_num, reach: p.reach, engagement: p.engagement,
      clicks: p.clicks, leads_count: p.leads_count, score: p.score, hook: p.hook })
    setEditId(p.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deletePost(id: string) {
    await supabase.from('posts_library').delete().eq('id', id)
    fetchPosts()
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700'

  return (
    <div>
      <Header title="Posts Library" subtitle={`${posts.length} posts across all platforms`} />
      <div className="p-6 space-y-6">

        {/* Add / Edit Form */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">{editId ? 'Edit Post' : 'Add Post'}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(empty) }} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={save} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Platform</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className={inputCls}>
                  {PLATFORMS.slice(1).map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                  {TYPES.slice(1).map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Post['status'] }))} className={inputCls}>
                  {STATUSES.slice(1).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Post Date</label>
                <input type="date" value={form.post_date} onChange={e => setForm(f => ({ ...f, post_date: e.target.value }))} className={inputCls} />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Hook</label>
                <input value={form.hook} onChange={e => setForm(f => ({ ...f, hook: e.target.value }))} placeholder="Opening line / hook..." className={inputCls} />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Content</label>
                <textarea rows={3} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className={`${inputCls} resize-none`} />
              </div>
              {/* Performance fields */}
              {['reach', 'engagement', 'clicks', 'leads_count', 'score'].map(field => (
                <div key={field} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 capitalize">{field.replace('_', ' ')}</label>
                  <input type="number" value={(form as Record<string, unknown>)[field] as number}
                    onChange={e => setForm(f => ({ ...f, [field]: Number(e.target.value) }))} className={inputCls} />
                </div>
              ))}
              <div className="col-span-2 flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(empty) }}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Post'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search posts or hooks..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {[
            { label: 'Platform', value: platform, set: setPlatform, opts: PLATFORMS },
            { label: 'Status',   value: status,   set: setStatus,   opts: STATUSES },
            { label: 'Type',     value: type,     set: setType,     opts: TYPES },
            { label: 'Sort by',  value: sort,     set: setSort as (v: string) => void, opts: ['score', 'leads_count', 'reach', 'engagement'] },
          ].map(f => (
            <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700">
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
          <button onClick={() => { setShowForm(true); setEditId(null); setForm(empty) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" /> Add Post
          </button>
        </div>

        {/* Cards Grid */}
        {loading
          ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse h-48" />
              ))}
            </div>
          : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(post => (
                <div key={post.id} className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-slate-900 leading-snug flex-1">{post.title}</h3>
                      {post.score > 0 && (
                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                          post.score >= 90 ? 'bg-emerald-100 text-emerald-700' :
                          post.score >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>{post.score}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge label={post.platform} variant={platformVariant[post.platform] ?? 'neutral'} />
                      <Badge label={post.type} variant="neutral" />
                      <Badge label={post.status} variant={statusVariant[post.status]} />
                    </div>
                  </div>

                  {post.hook && (
                    <div className="px-4 py-3 bg-slate-50 border-b border-gray-100">
                      <p className="text-xs text-slate-500 font-medium mb-1">Hook</p>
                      <p className="text-xs text-slate-700 italic leading-relaxed">&ldquo;{post.hook}&rdquo;</p>
                    </div>
                  )}

                  {post.status === 'published' && post.reach > 0 ? (
                    <div className="grid grid-cols-4 divide-x divide-gray-100">
                      {[
                        { icon: Eye, label: 'Reach', value: post.reach >= 1000 ? `${(post.reach / 1000).toFixed(0)}K` : post.reach },
                        { label: 'Eng%',   value: `${post.engagement}%` },
                        { icon: MousePointerClick, label: 'Clicks', value: post.clicks >= 1000 ? `${(post.clicks / 1000).toFixed(1)}K` : post.clicks },
                        { icon: Users, label: 'Leads', value: post.leads_count },
                      ].map(s => (
                        <div key={s.label} className="flex flex-col items-center py-3 px-1">
                          <p className="text-xs text-slate-400">{s.label}</p>
                          <p className="text-sm font-bold text-slate-900">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-xs text-slate-400 flex items-center justify-between">
                      <span>{post.post_date ? `Scheduled for ${post.post_date}` : 'No date set'}</span>
                      <span className="capitalize">{post.status}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 px-4 py-2 border-t border-gray-50">
                    <button onClick={() => startEdit(post)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => deletePost(post.id)} className="text-xs text-red-400 hover:text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
        }

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">No posts match your filters.</div>
        )}
      </div>
    </div>
  )
}
