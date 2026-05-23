'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Circle, Plus, X, Loader2 } from 'lucide-react'

type ChecklistItem = {
  id: string
  task: string
  category: string
  priority: string
  due_day: string
  completed: boolean
  sort_order: number
}

const categoryVariant: Record<string, 'info' | 'indigo' | 'success' | 'warning' | 'neutral'> = {
  Content: 'info', Ads: 'indigo', Analytics: 'success', Email: 'warning', Strategy: 'neutral',
}
const priorityVariant: Record<string, 'danger' | 'warning' | 'neutral'> = {
  High: 'danger', Medium: 'warning', Low: 'neutral',
}

const DAYS       = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const CATEGORIES = ['All', 'Content', 'Ads', 'Analytics', 'Email', 'Strategy']

const empty = { task: '', category: 'Content', priority: 'Medium', due_day: 'Monday' }

export default function WeeklyChecklistPage() {
  const [items, setItems]     = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState(empty)
  const [saving, setSaving]   = useState(false)

  async function fetchItems() {
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .order('sort_order', { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  async function toggle(id: string, current: boolean) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !current } : i))
    await supabase.from('checklist_items').update({ completed: !current }).eq('id', id)
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order), 0)
    await supabase.from('checklist_items').insert([{ ...form, sort_order: maxOrder + 1, completed: false }])
    setSaving(false)
    setShowForm(false)
    setForm(empty)
    fetchItems()
  }

  async function deleteItem(id: string) {
    await supabase.from('checklist_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function resetAll() {
    await supabase.from('checklist_items').update({ completed: false }).neq('id', '')
    fetchItems()
  }

  const completed = items.filter(i => i.completed).length
  const total     = items.length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
  const filtered  = items.filter(i => filter === 'All' || i.category === filter)

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700'

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 4)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div>
      <Header title="Weekly Checklist" subtitle={`Week of ${fmt(weekStart)} – ${fmt(weekEnd)}, ${weekEnd.getFullYear()}`} />
      <div className="p-6 space-y-6">

        {/* Progress */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Weekly Progress</p>
              <p className="text-xs text-slate-500 mt-0.5">{completed} of {total} tasks completed</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={resetAll} className="text-xs text-slate-400 hover:text-slate-600 underline">Reset week</button>
              <span className={`text-2xl font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {pct}%
              </span>
            </div>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-5 gap-3 mt-4">
            {CATEGORIES.slice(1).map(cat => {
              const catItems = items.filter(i => i.category === cat)
              const catDone  = catItems.filter(i => i.completed).length
              return (
                <div key={cat} className="text-center">
                  <p className="text-xs text-slate-500">{cat}</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{catDone}/{catItems.length}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Add Task Form */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Add Task</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={addItem} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Task *</label>
                <input required value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                  {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={inputCls}>
                  {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Due Day</label>
                <select value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} className={inputCls}>
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 w-full justify-center px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving…' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Category filter + Add button */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filter === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-gray-200 hover:border-indigo-400'
              }`}>
              {c}
            </button>
          ))}
          <button onClick={() => setShowForm(v => !v)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 hover:border-indigo-400 text-slate-600 transition-all">
            <Plus className="h-3.5 w-3.5" /> Add task
          </button>
        </div>

        {/* Tasks by Day */}
        {loading
          ? <div className="animate-pulse space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-xl border border-gray-200 bg-white h-32" />)}</div>
          : <div className="space-y-4">
              {DAYS.map(day => {
                const dayItems = filtered.filter(i => i.due_day === day)
                if (dayItems.length === 0) return null
                const dayDone = dayItems.filter(i => i.completed).length
                return (
                  <div key={day} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-slate-900">{day}</h3>
                      <span className="text-xs text-slate-500">{dayDone}/{dayItems.length} done</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {dayItems.map(item => (
                        <div key={item.id}
                          className={`flex items-start gap-3 px-5 py-4 transition-colors ${item.completed ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`}>
                          <button onClick={() => toggle(item.id, item.completed)} className="mt-0.5 shrink-0">
                            {item.completed
                              ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              : <Circle className="h-5 w-5 text-slate-300" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-snug ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {item.task}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge label={item.category} variant={categoryVariant[item.category] ?? 'neutral'} />
                              <Badge label={item.priority} variant={priorityVariant[item.priority] ?? 'neutral'} />
                            </div>
                          </div>
                          <button onClick={() => deleteItem(item.id)} className="mt-0.5 text-slate-300 hover:text-red-400 transition-colors shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
        }

      </div>
    </div>
  )
}
