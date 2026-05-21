'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { Plus, X, Loader2, Calendar, Layout, PenSquare, Linkedin, Instagram, Globe, ChevronLeft, ChevronRight, Pencil, Check } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
type SocialPost = {
  id: string
  collateral: string
  platforms: string
  background: string
  media_type: string
  cta: string
  caption: string
  scheduled_date: string | null
  status: 'draft' | 'scheduled' | 'published'
  created_at: string
}

type TabId = 'calendar' | 'platform' | 'create'

// ── Google Sheet templates ─────────────────────────────────────────────────
const TEMPLATES = [
  {
    collateral: 'Teaser Post #1',
    platforms: 'LinkedIn, Facebook, Instagram, TikTok',
    media_type: 'Short Video (15–30s)',
    cta: '👉 Follow to see how recurring work gets handled',
    background: 'The same operational work. Every single day. Emails. Follow-ups. Updates. Tracking. ✨ A different way to handle it is coming ✨',
    caption: 'The same operational work. Every single day. Emails. Follow-ups. Updates. Tracking. ✨ A different way is coming ✨ 👉 Follow to see how recurring work gets handled',
  },
  {
    collateral: 'Teaser Post #2 — Pain Question',
    platforms: 'LinkedIn, Facebook, Instagram',
    media_type: 'Short Video',
    cta: '👉 Vote & follow to see what\'s coming',
    background: 'What\'s the recurring work that takes your time every day? Emails. Follow-ups. Status checks. ✨ Something new is coming ✨',
    caption: "What's the recurring work that takes your time every day? Emails. Follow-ups. Status checks. ✨ Something new is coming ✨ 👉 Vote & follow",
  },
  {
    collateral: 'Comparison Post (Core)',
    platforms: 'LinkedIn, Instagram',
    media_type: 'Static / Video split screen',
    cta: '👉 Follow to see the difference',
    background: 'Automation sounds easy — until you have to run it. Other solutions: workflows, rules, maintenance. AgentsPilot: recurring work, fully managed, finished outcomes.',
    caption: "Automation sounds easy — until you have to run it.\nOther solutions: workflows, rules, maintenance\nAgentsPilot: fully managed, finished outcomes\nAutomation adds responsibility. AgentsPilot removes it.",
  },
  {
    collateral: 'Value Post — Time & Money',
    platforms: 'LinkedIn',
    media_type: 'Static clean post',
    cta: '👉 Learn how it works',
    background: 'Small business managers spend hours on the same operational work every day. Not strategic — just constant. AgentsPilot removes it entirely.',
    caption: 'The same work. Every day. Not complex — just constant.\nAgentsPilot handles it for you. No setup. Just results.',
  },
  {
    collateral: 'Use Case — Expenses',
    platforms: 'LinkedIn, Instagram',
    media_type: 'Demo / Static',
    cta: '👉 See how it works',
    background: 'Expense tracking is recurring work. Receipts, invoices, updates — every month. AgentsPilot handles it and delivers the finished result.',
    caption: 'Expense tracking is recurring work.\nAgentsPilot handles it for you. No manual entry. No management. Just handled.',
  },
  {
    collateral: 'Engagement Post — Question',
    platforms: 'LinkedIn',
    media_type: 'Text-only or poll',
    cta: '👉 Comment or vote',
    background: "Be honest — what's the one task you repeat every day? If it shows up every day, it shouldn't be your job to manage it.",
    caption: "What's the one task you repeat every day?\nIt shouldn't be your job to manage it.",
  },
  {
    collateral: 'Reveal Post (Later Stage)',
    platforms: 'LinkedIn, Website',
    media_type: 'Video / Hero',
    cta: '👉 Request a demo',
    background: "Managed Recurring Operations Assistance. We don't automate tasks. We deliver outcomes.",
    caption: "Managed Recurring Operations Assistance\nWe don't automate tasks. We deliver outcomes.",
  },
]

const ALL_PLATFORMS = ['LinkedIn', 'Facebook', 'Instagram', 'TikTok', 'Website', 'Other']

const platformIcon: Record<string, React.ReactNode> = {
  LinkedIn: <Linkedin className="h-4 w-4" />,
  Facebook: <span className="text-xs font-bold">f</span>,
  Instagram: <Instagram className="h-4 w-4" />,
  TikTok: <span className="text-xs font-bold">TK</span>,
  Website: <Globe className="h-4 w-4" />,
  Other: <Globe className="h-4 w-4" />,
}

const platformColor: Record<string, string> = {
  LinkedIn: 'bg-blue-600',
  Facebook: 'bg-indigo-600',
  Instagram: 'bg-pink-500',
  TikTok: 'bg-slate-900',
  Website: 'bg-orange-500',
  Other: 'bg-gray-400',
}

const statusColor = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
}

const emptyForm = {
  collateral: '',
  platforms: [] as string[],
  background: '',
  media_type: '',
  cta: '',
  caption: '',
  scheduled_date: '',
  status: 'draft' as SocialPost['status'],
}

// ── Month helpers ──────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ── Main Component ─────────────────────────────────────────────────────────
export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('calendar')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null)

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('social_posts')
      .select('*')
      .order('scheduled_date', { ascending: true, nullsFirst: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [])

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setForm(f => ({
      ...f,
      collateral: t.collateral,
      platforms: t.platforms.split(', ').map(p => p.trim()),
      background: t.background,
      media_type: t.media_type,
      cta: t.cta,
      caption: t.caption,
    }))
    setSelectedTemplate(t.collateral)
  }

  async function savePost(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      collateral: form.collateral,
      platforms: form.platforms.join(', '),
      background: form.background,
      media_type: form.media_type,
      cta: form.cta,
      caption: form.caption,
      scheduled_date: form.scheduled_date || null,
      status: form.status,
    }
    const { error } = editingPost
      ? await supabase.from('social_posts').update(payload).eq('id', editingPost.id)
      : await supabase.from('social_posts').insert([payload])
    setSaving(false)
    if (error) { setError(error.message); return }
    setSuccess(editingPost ? 'Post updated!' : 'Post created!')
    setForm(emptyForm)
    setSelectedTemplate(null)
    setEditingPost(null)
    fetchPosts()
    setTimeout(() => setSuccess(null), 3000)
  }

  async function deletePost(id: string) {
    await supabase.from('social_posts').delete().eq('id', id)
    fetchPosts()
  }

  async function updateStatus(id: string, status: SocialPost['status']) {
    await supabase.from('social_posts').update({ status }).eq('id', id)
    fetchPosts()
  }

  function startEdit(post: SocialPost) {
    setEditingPost(post)
    setForm({
      collateral: post.collateral,
      platforms: post.platforms.split(', ').map(p => p.trim()),
      background: post.background,
      media_type: post.media_type,
      cta: post.cta,
      caption: post.caption,
      scheduled_date: post.scheduled_date ?? '',
      status: post.status,
    })
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Calendar data
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const postsByDay: Record<number, SocialPost[]> = {}
  posts.forEach(p => {
    if (p.scheduled_date) {
      const d = new Date(p.scheduled_date)
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate()
        if (!postsByDay[day]) postsByDay[day] = []
        postsByDay[day].push(p)
      }
    }
  })

  // Platform grouping
  const platformGroups: Record<string, SocialPost[]> = {}
  ALL_PLATFORMS.forEach(p => { platformGroups[p] = [] })
  posts.forEach(post => {
    const platforms = post.platforms.split(',').map(p => p.trim())
    platforms.forEach(pl => {
      const key = ALL_PLATFORMS.find(p => p.toLowerCase() === pl.toLowerCase()) ?? 'Other'
      if (!platformGroups[key]) platformGroups[key] = []
      platformGroups[key].push(post)
    })
  })

  // Stats
  const totalPosts = posts.length
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length
  const publishedCount = posts.filter(p => p.status === 'published').length
  const draftCount = posts.filter(p => p.status === 'draft').length

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700'

  const TABS = [
    { id: 'calendar' as TabId, label: 'Monthly Calendar', icon: Calendar },
    { id: 'platform' as TabId, label: 'By Platform', icon: Layout },
    { id: 'create' as TabId, label: editingPost ? 'Edit Post' : 'Create Post', icon: PenSquare },
  ]

  return (
    <div>
      <Header
        title="Social Campaign Manager"
        subtitle={`${totalPosts} posts · ${scheduledCount} scheduled · ${publishedCount} published`}
      />

      {/* Admin badge */}
      <div className="px-6 pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
          🔐 Admin Only
        </span>
      </div>

      {/* Tab bar */}
      <div className="sticky top-16 z-30 border-b border-gray-200 bg-white px-6 mt-3">
        <div className="flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  active ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-gray-300'
                }`}>
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Posts', value: totalPosts, color: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'Drafts', value: draftCount, color: 'text-slate-600', bg: 'bg-gray-50' },
            { label: 'Scheduled', value: scheduledCount, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Published', value: publishedCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(k => (
            <div key={k.label} className={`rounded-xl border border-gray-200 ${k.bg} p-4`}>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>
                {loading ? <span className="animate-pulse bg-gray-100 rounded h-7 w-8 inline-block" /> : k.value}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex justify-between">
            {error}<button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-600 flex items-center gap-2">
            <Check className="h-4 w-4" /> {success}
          </div>
        )}

        {/* ── CALENDAR TAB ─────────────────────────────────────────────── */}
        {activeTab === 'calendar' && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="h-5 w-5 text-slate-500" />
              </button>
              <h2 className="text-sm font-semibold text-slate-900">{MONTH_NAMES[calMonth]} {calYear}</h2>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAY_NAMES.map(d => (
                <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="border-r border-b border-gray-100 min-h-24 bg-gray-50/50" />
              ))}
              {calendarDays.map(day => {
                const dayPosts = postsByDay[day] ?? []
                const isToday = calYear === now.getFullYear() && calMonth === now.getMonth() && day === now.getDate()
                return (
                  <div key={day} className={`border-r border-b border-gray-100 min-h-24 p-2 ${isToday ? 'bg-orange-50/40' : 'hover:bg-gray-50/50'} transition-colors`}>
                    <div className={`text-xs font-semibold mb-1 h-5 w-5 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-orange-500 text-white' : 'text-slate-500'
                    }`}>{day}</div>
                    <div className="space-y-0.5">
                      {dayPosts.slice(0, 3).map(post => {
                        const platforms = post.platforms.split(',').map(p => p.trim())
                        return (
                          <div key={post.id}
                            onClick={() => startEdit(post)}
                            className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${statusColor[post.status]}`}
                            title={post.collateral}>
                            {post.collateral.length > 18 ? post.collateral.slice(0, 18) + '…' : post.collateral}
                          </div>
                        )
                      })}
                      {dayPosts.length > 3 && (
                        <div className="text-xs text-slate-400 px-1">+{dayPosts.length - 3} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-4">
              {[
                { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
                { label: 'Scheduled', cls: 'bg-amber-100 text-amber-700' },
                { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.cls}`}>{s.label}</span>
                </div>
              ))}
              <button onClick={() => setActiveTab('create')}
                className="ml-auto flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700">
                <Plus className="h-3.5 w-3.5" /> Add post
              </button>
            </div>
          </div>
        )}

        {/* ── BY PLATFORM TAB ──────────────────────────────────────────── */}
        {activeTab === 'platform' && (
          <div className="space-y-6">
            {ALL_PLATFORMS.filter(pl => platformGroups[pl]?.length > 0).map(platform => (
              <div key={platform} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-lg ${platformColor[platform]} flex items-center justify-center text-white`}>
                    {platformIcon[platform]}
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">{platform}</h2>
                  <span className="text-xs text-slate-400">{platformGroups[platform].length} post{platformGroups[platform].length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {platformGroups[platform].map(post => (
                    <div key={post.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-slate-900">{post.collateral}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[post.status]}`}>
                            {post.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">{post.media_type}</p>
                        <p className="text-xs text-slate-600 line-clamp-2">{post.caption}</p>
                        {post.cta && <p className="text-xs text-orange-500 mt-1">{post.cta}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {post.scheduled_date && (
                          <span className="text-xs text-slate-400">{new Date(post.scheduled_date).toLocaleDateString()}</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <select value={post.status}
                            onChange={e => updateStatus(post.id, e.target.value as SocialPost['status'])}
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500">
                            <option value="draft">Draft</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="published">Published</option>
                          </select>
                          <button onClick={() => startEdit(post)} className="text-slate-400 hover:text-orange-500 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deletePost(post.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.values(platformGroups).every(g => g.length === 0) && (
              <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
                <p className="text-sm text-slate-400">No posts yet — create your first post</p>
                <button onClick={() => setActiveTab('create')}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
                  <Plus className="h-4 w-4" /> Create Post
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CREATE / EDIT POST TAB ────────────────────────────────────── */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Templates panel */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Post Templates</h3>
                <p className="text-xs text-slate-400 mb-4">From your social campaign programme — click to load</p>
                <div className="space-y-2">
                  {TEMPLATES.map(t => (
                    <div key={t.collateral}
                      onClick={() => applyTemplate(t)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTemplate === t.collateral
                          ? 'border-orange-500/40 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      <p className="text-xs font-semibold text-slate-800">{t.collateral}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{t.platforms}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.caption}</p>
                      {selectedTemplate === t.collateral && (
                        <p className="text-xs text-orange-500 mt-1 font-medium flex items-center gap-1">
                          <Check className="h-3 w-3" /> Loaded
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Post form */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editingPost ? '✏️ Edit Post' : '✨ Create New Post'}
                  </h3>
                  {editingPost && (
                    <button onClick={() => { setEditingPost(null); setForm(emptyForm); setSelectedTemplate(null) }}
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                      <X className="h-3.5 w-3.5" /> Cancel edit
                    </button>
                  )}
                </div>
                <form onSubmit={savePost} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Post Title / Collateral <span className="text-red-500">*</span></label>
                      <input required value={form.collateral} onChange={e => setForm(f => ({ ...f, collateral: e.target.value }))}
                        placeholder="e.g. Teaser Post #1" className={inputCls} />
                    </div>

                    {/* Platform checkboxes */}
                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Platforms</label>
                      <div className="flex flex-wrap gap-2">
                        {ALL_PLATFORMS.map(pl => (
                          <label key={pl} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                            form.platforms.includes(pl)
                              ? `${platformColor[pl]} text-white border-transparent`
                              : 'border-gray-200 text-slate-600 hover:border-gray-300'
                          }`}>
                            <input type="checkbox" className="hidden"
                              checked={form.platforms.includes(pl)}
                              onChange={e => setForm(f => ({
                                ...f,
                                platforms: e.target.checked
                                  ? [...f.platforms, pl]
                                  : f.platforms.filter(p => p !== pl)
                              }))} />
                            {pl}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Media Type</label>
                      <input value={form.media_type} onChange={e => setForm(f => ({ ...f, media_type: e.target.value }))}
                        placeholder="e.g. Short Video, Static Image" className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">CTA</label>
                      <input value={form.cta} onChange={e => setForm(f => ({ ...f, cta: e.target.value }))}
                        placeholder="e.g. 👉 Follow to see more" className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Schedule Date</label>
                      <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                        className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Status</label>
                      <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as SocialPost['status'] }))}
                        className={inputCls}>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Background / Messaging</label>
                    <textarea rows={3} value={form.background} onChange={e => setForm(f => ({ ...f, background: e.target.value }))}
                      placeholder="The key message and context for this post..."
                      className={`${inputCls} resize-none`} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Post Caption <span className="text-red-500">*</span></label>
                    <textarea required rows={5} value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                      placeholder="Write the final caption text here..."
                      className={`${inputCls} resize-none font-mono text-xs`} />
                    <p className="text-xs text-slate-400">{form.caption.length} chars</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => { setForm(emptyForm); setSelectedTemplate(null); setEditingPost(null) }}
                      className="px-4 py-2 text-sm text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-50">Clear</button>
                    <button type="submit" disabled={saving}
                      className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {saving ? 'Saving...' : editingPost ? 'Save Changes' : 'Create Post'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
