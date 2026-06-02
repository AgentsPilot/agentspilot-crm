'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import {
  Search, Plus, Loader2, X, Pencil, Trash2, Tag, BookOpen, Send, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

type NurtureItem = {
  id: string
  title: string
  body: string
  type: string
  pipeline_stages: string[]
}

const PIPELINE_STAGES = ['Contacted', 'Qualified', 'Proposal Sent', 'Won']

const stageColor: Record<string, string> = {
  'Contacted':     'bg-indigo-100 text-indigo-700',
  'Qualified':     'bg-violet-100 text-violet-700',
  'Proposal Sent': 'bg-amber-100 text-amber-700',
  'Won':           'bg-emerald-100 text-emerald-700',
}

const emptyForm = { title: '', body: '', type: 'post', pipeline_stages: [] as string[] }

export default function PostsLibraryPage() {
  const [items, setItems]         = useState<NurtureItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [stageFilter, setStage]   = useState('All')
  const [typeFilter, setType]     = useState('All')
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)

  // ── Bulk send modal ────────────────────────────────────────────────────────
  const [sendModal, setSendModal] = useState<NurtureItem | null>(null)
  const [sendStage, setSendStage] = useState(PIPELINE_STAGES[0])
  const [stageCount, setStageCount] = useState<number | null>(null)
  const [sending, setSending]     = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null)

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase.from('content_library').select('*').order('title')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (editId) {
      await supabase.from('content_library').update(form).eq('id', editId)
    } else {
      await supabase.from('content_library').insert([form])
    }
    setSaving(false)
    closeForm()
    fetchItems()
  }

  function startEdit(item: NurtureItem) {
    setForm({ title: item.title, body: item.body, type: item.type, pipeline_stages: item.pipeline_stages ?? [] })
    setEditId(item.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm)
  }

  async function deleteItem(id: string) {
    await supabase.from('content_library').delete().eq('id', id)
    fetchItems()
  }

  async function openSendModal(item: NurtureItem) {
    setSendModal(item)
    setSendStage(PIPELINE_STAGES[0])
    setSendResult(null)
    setStageCount(null)
    // Pre-fetch count for first stage
    await fetchStageCount(PIPELINE_STAGES[0])
  }

  async function fetchStageCount(stage: string) {
    setStageCount(null)
    const { count } = await supabase
      .from('pipeline_deals')
      .select('*', { count: 'exact', head: true })
      .eq('stage', stage)
      .not('contact_email', 'is', null)
      .neq('contact_email', '')
    setStageCount(count ?? 0)
  }

  async function bulkSend() {
    if (!sendModal) return
    setSending(true)
    setSendResult(null)
    const res = await fetch('/api/content/bulk-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_id: sendModal.id, stage: sendStage }),
    })
    const data = await res.json()
    setSendResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 })
    setSending(false)
  }

  function toggleStage(stage: string) {
    setForm(f => ({
      ...f,
      pipeline_stages: f.pipeline_stages.includes(stage)
        ? f.pipeline_stages.filter(s => s !== stage)
        : [...f.pipeline_stages, stage],
    }))
  }

  const allTypes = [...new Set(items.map(i => i.type))]

  const filtered = items.filter(n => {
    const q = search.toLowerCase()
    return (
      (!search || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) &&
      (stageFilter === 'All' || (n.pipeline_stages ?? []).includes(stageFilter)) &&
      (typeFilter  === 'All' || n.type === typeFilter)
    )
  })

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700'

  return (
    <div>
      <Header
        title="Posts Library"
        subtitle="Nurture content sent to pipeline contacts at each stage"
      />
      <div className="p-6 space-y-5">

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl bg-orange-50 border border-orange-100 px-4 py-3 text-sm text-orange-700">
          <BookOpen className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Content is added here from{' '}
            <Link href="/social?tab=create" className="font-semibold underline underline-offset-2">
              Social Manager → Create Post
            </Link>
            {' '}when you check <strong>"📚 Add to Posts Library"</strong>.
            It is then available in the Pipeline to send directly to contacts.
          </span>
        </div>

        {/* Edit form */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Edit Nurture Content</h3>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={save} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Title *</label>
                <input required value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Type</label>
                <select value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className={inputCls}>
                  {['post', 'email', 'case_study', 'value', 'video', 'guide'].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Pipeline Stages</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PIPELINE_STAGES.map(stage => (
                    <button key={stage} type="button" onClick={() => toggleStage(stage)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.pipeline_stages.includes(stage)
                          ? `${stageColor[stage]} border-transparent`
                          : 'bg-white text-slate-500 border-gray-200 hover:border-gray-300'
                      }`}>
                      {stage}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Body *</label>
                <textarea required rows={5} value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  className={`${inputCls} resize-none`} />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeForm}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* KPI strip — pieces per stage */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PIPELINE_STAGES.map(stage => {
            const count = items.filter(n => (n.pipeline_stages ?? []).includes(stage)).length
            return (
              <div key={stage}
                onClick={() => setStage(s => s === stage ? 'All' : stage)}
                className={`rounded-xl border bg-white p-4 cursor-pointer transition-all ${
                  stageFilter === stage
                    ? 'border-orange-400 ring-2 ring-orange-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                <p className="text-xs text-slate-500 mb-1">{stage}</p>
                <p className="text-2xl font-bold text-slate-800">{count}</p>
                <p className="text-xs text-slate-400">pieces</p>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search content…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <select value={stageFilter} onChange={e => setStage(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="All">All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setType(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="All">All Types</option>
            {allTypes.map(t => <option key={t}>{t}</option>)}
          </select>
          <Link href="/social?tab=create"
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors whitespace-nowrap">
            <Plus className="h-4 w-4" /> Add via Social Manager
          </Link>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse h-40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-medium text-slate-500 mb-1">No nurture content yet</p>
            <p className="text-xs text-slate-400 mb-5">
              Create a post in Social Manager and check<br />
              <span className="font-medium text-slate-600">"📚 Add to Posts Library"</span> to populate this library.
            </p>
            <Link href="/social?tab=create"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
              <Plus className="h-4 w-4" /> Go to Social Manager
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => (
              <div key={item.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug flex-1">{item.title}</h3>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                      {item.type}
                    </span>
                  </div>
                  {(item.pipeline_stages ?? []).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Tag className="h-3 w-3 text-slate-400 shrink-0" />
                      {(item.pipeline_stages ?? []).map(stage => (
                        <span key={stage}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColor[stage] ?? 'bg-gray-100 text-gray-600'}`}>
                          {stage}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 flex-1">
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                    {item.body}
                  </p>
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-t border-gray-50">
                  <button onClick={() => openSendModal(item)}
                    className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
                    <Send className="h-3 w-3" /> Send to Stage
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(item)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-orange-600 transition-colors">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => deleteItem(item.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── Bulk Send Modal ─────────────────────────────────────────────────── */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Send to Stage</h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{sendModal.title}</p>
              </div>
              <button onClick={() => { setSendModal(null); setSendResult(null) }}
                className="text-slate-400 hover:text-slate-600 ml-4 shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            {sendResult ? (
              /* ── Result screen ── */
              <div className="text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-lg font-bold text-slate-900 mb-1">
                  {sendResult.sent} email{sendResult.sent !== 1 ? 's' : ''} sent
                </p>
                {sendResult.failed > 0 && (
                  <p className="text-sm text-red-500">{sendResult.failed} failed</p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  A task has been logged per contact in the Tasks page.
                </p>
                <button onClick={() => { setSendModal(null); setSendResult(null) }}
                  className="mt-5 px-5 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600">
                  Done
                </button>
              </div>
            ) : (
              /* ── Stage selector ── */
              <>
                <p className="text-sm text-slate-600 mb-4">
                  Choose which pipeline stage to send this content to. An email will be sent to every contact at that stage and a task will be logged as proof of send.
                </p>

                <div className="mb-5">
                  <label className="text-xs font-medium text-slate-500 mb-2 block">Pipeline Stage</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PIPELINE_STAGES.map(stage => (
                      <button key={stage} type="button"
                        onClick={() => { setSendStage(stage); fetchStageCount(stage) }}
                        className={`text-sm px-3 py-2 rounded-lg border text-left transition-colors ${
                          sendStage === stage
                            ? `${stageColor[stage]} border-transparent font-medium`
                            : 'bg-white text-slate-600 border-gray-200 hover:border-gray-300'
                        }`}>
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact count */}
                <div className="rounded-lg bg-slate-50 px-4 py-3 mb-5 text-sm text-slate-600 flex items-center gap-2">
                  {stageCount === null
                    ? <><Loader2 className="h-4 w-4 animate-spin text-slate-400" /> Counting contacts…</>
                    : stageCount === 0
                      ? <span className="text-slate-400">No contacts with email at <strong>{sendStage}</strong></span>
                      : <><span className="text-2xl font-bold text-slate-900 mr-1">{stageCount}</span> contact{stageCount !== 1 ? 's' : ''} will receive this email</>
                  }
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => { setSendModal(null); setSendResult(null) }}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={bulkSend}
                    disabled={sending || stageCount === 0 || stageCount === null}
                    className="flex items-center gap-2 px-5 py-2 text-sm bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50">
                    {sending
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                      : <><Send className="h-3.5 w-3.5" /> Send to {stageCount ?? '…'} contacts</>
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
