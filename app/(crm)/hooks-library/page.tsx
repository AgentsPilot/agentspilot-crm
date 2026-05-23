'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { Search, Copy, Star, Plus, X, Loader2 } from 'lucide-react'

type Hook = {
  id: string
  text: string
  category: string
  platform: string
  usage_count: number
  avg_score: number
  tags: string[]
}

const categoryVariant: Record<string, 'info' | 'danger' | 'success' | 'indigo' | 'warning' | 'neutral'> = {
  Curiosity: 'info', Fear: 'danger', Benefit: 'success', 'Social Proof': 'indigo', Urgency: 'warning', Story: 'neutral',
}
const platformVariant: Record<string, 'indigo' | 'danger' | 'info' | 'neutral' | 'success'> = {
  Meta: 'indigo', TikTok: 'danger', LinkedIn: 'info', Email: 'neutral', Universal: 'success',
}

const CATEGORIES = ['All', 'Curiosity', 'Fear', 'Benefit', 'Social Proof', 'Urgency', 'Story']
const PLATFORMS  = ['All', 'Meta', 'TikTok', 'LinkedIn', 'Email', 'Universal']

const empty = { text: '', category: 'Curiosity', platform: 'Universal', usage_count: 0, avg_score: 0, tags: '' }

export default function HooksLibraryPage() {
  const [hooks, setHooks]     = useState<Hook[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [category, setCategory] = useState('All')
  const [platform, setPlatform] = useState('All')
  const [sort, setSort]       = useState<'avg_score' | 'usage_count'>('avg_score')
  const [copied, setCopied]   = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState(empty)
  const [saving, setSaving]   = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)

  async function fetchHooks() {
    const { data } = await supabase.from('hooks_library').select('*').order('avg_score', { ascending: false })
    setHooks(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchHooks() }, [])

  const filtered = hooks
    .filter(h => {
      const q = search.toLowerCase()
      return (
        (!search || h.text.toLowerCase().includes(q) || (h.tags ?? []).some(t => t.includes(q))) &&
        (category === 'All' || h.category === category) &&
        (platform === 'All' || h.platform === platform)
      )
    })
    .sort((a, b) => Number(b[sort]) - Number(a[sort]))

  const copyHook = (hook: Hook) => {
    navigator.clipboard.writeText(hook.text)
    setCopied(hook.id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const payload = { text: form.text, category: form.category, platform: form.platform,
      usage_count: Number(form.usage_count), avg_score: Number(form.avg_score), tags }
    if (editId) {
      await supabase.from('hooks_library').update(payload).eq('id', editId)
    } else {
      await supabase.from('hooks_library').insert([payload])
    }
    setSaving(false)
    setShowForm(false)
    setForm(empty)
    setEditId(null)
    fetchHooks()
  }

  function startEdit(h: Hook) {
    setForm({ text: h.text, category: h.category, platform: h.platform,
      usage_count: h.usage_count, avg_score: h.avg_score, tags: (h.tags ?? []).join(', ') })
    setEditId(h.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteHook(id: string) {
    await supabase.from('hooks_library').delete().eq('id', id)
    setHooks(prev => prev.filter(h => h.id !== id))
  }

  const avgScore   = hooks.length > 0 ? (hooks.reduce((s, h) => s + Number(h.avg_score), 0) / hooks.length).toFixed(1) : '0'
  const totalUses  = hooks.reduce((s, h) => s + Number(h.usage_count), 0)
  const topHook    = hooks.length > 0 ? hooks.reduce((a, b) => Number(a.avg_score) > Number(b.avg_score) ? a : b) : null

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700'

  return (
    <div>
      <Header title="Hooks Library" subtitle="Proven hooks organised by category and platform" />
      <div className="p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Hooks', value: hooks.length },
            { label: 'Avg Score',   value: `${avgScore}/100` },
            { label: 'Total Uses',  value: totalUses },
            { label: 'Top Score',   value: topHook ? `${topHook.avg_score}/100` : '—' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? <span className="animate-pulse bg-gray-100 rounded h-7 w-12 inline-block" /> : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">{editId ? 'Edit Hook' : 'Add Hook'}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(empty) }} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={save} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Hook Text *</label>
                <textarea required rows={2} value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} className={`${inputCls} resize-none`} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                  {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Platform</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className={inputCls}>
                  {PLATFORMS.slice(1).map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Score (0–100)</label>
                <input type="number" min={0} max={100} value={form.avg_score} onChange={e => setForm(f => ({ ...f, avg_score: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Usage Count</label>
                <input type="number" min={0} value={form.usage_count} onChange={e => setForm(f => ({ ...f, usage_count: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. leads, ads, quick-tip" className={inputCls} />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(empty) }}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Hook'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search hooks or tags..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700">
            {PLATFORMS.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as 'avg_score' | 'usage_count')} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700">
            <option value="avg_score">Sort: Best Score</option>
            <option value="usage_count">Sort: Most Used</option>
          </select>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm(empty) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" /> Add Hook
          </button>
        </div>

        {/* Category quick filters */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                category === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-gray-200 hover:border-indigo-400'
              }`}>
              {c}
            </button>
          ))}
        </div>

        {/* Hooks Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Hook Text', 'Category', 'Platform', 'Score', 'Uses', 'Tags', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(hook => (
                  <tr key={hook.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 max-w-sm">
                      <p className="text-sm text-slate-800 leading-relaxed">{hook.text}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge label={hook.category} variant={categoryVariant[hook.category] ?? 'neutral'} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge label={hook.platform} variant={platformVariant[hook.platform] ?? 'neutral'} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Star className={`h-3.5 w-3.5 ${Number(hook.avg_score) >= 90 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                        <span className={`font-bold text-sm ${Number(hook.avg_score) >= 90 ? 'text-amber-600' : Number(hook.avg_score) >= 85 ? 'text-indigo-600' : 'text-slate-600'}`}>
                          {hook.avg_score}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600 font-medium">{hook.usage_count}×</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(hook.tags ?? []).map(tag => (
                          <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => copyHook(hook)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            copied === hook.id ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                          }`}>
                          <Copy className="h-3 w-3" />
                          {copied === hook.id ? 'Copied!' : 'Copy'}
                        </button>
                        <button onClick={() => startEdit(hook)} className="text-xs text-slate-400 hover:text-indigo-600 px-1">Edit</button>
                        <button onClick={() => deleteHook(hook.id)} className="text-xs text-slate-400 hover:text-red-500 px-1">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-xs text-slate-400">
            {filtered.length} hooks shown
          </div>
        </div>
      </div>
    </div>
  )
}
