'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Circle, Plus, X, Loader2, Clock, AlertCircle } from 'lucide-react'

type Task = {
  id: string
  title: string
  contact_id: string | null
  contact_name: string | null
  deal_id: string | null
  type: 'Call' | 'Email' | 'Follow-up' | 'Meeting' | 'Other'
  priority: 'High' | 'Medium' | 'Low'
  due_date: string | null
  done: boolean
  notes: string | null
  created_at: string
}

const priorityVariant = { High: 'danger', Medium: 'warning', Low: 'neutral' } as const
const typeVariant = { Call: 'indigo', Email: 'info', 'Follow-up': 'warning', Meeting: 'success', Other: 'neutral' } as const

const emptyForm = {
  title: '', contact_name: '', type: 'Follow-up', priority: 'Medium', due_date: '', notes: '',
}

function isOverdue(due: string | null) {
  if (!due) return false
  return new Date(due) < new Date(new Date().toDateString())
}

function isDueToday(due: string | null) {
  if (!due) return false
  return due === new Date().toISOString().split('T')[0]
}

const DAY_FILTERS = ['All', 'Today', 'Overdue', 'Upcoming']

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [dayFilter, setDayFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')

  async function fetchTasks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
    if (error) setError(error.message)
    else setTasks(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('tasks').insert([{
      title: form.title,
      contact_name: form.contact_name || null,
      type: form.type,
      priority: form.priority,
      due_date: form.due_date || null,
      notes: form.notes || null,
      done: false,
    }])
    setSaving(false)
    if (error) { setError(error.message); return }
    setShowForm(false)
    setForm(emptyForm)
    fetchTasks()
  }

  async function toggleDone(task: Task) {
    await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id)
    fetchTasks()
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks()
  }

  const filtered = tasks.filter(t => {
    const matchType = typeFilter === 'All' || t.type === typeFilter
    const matchDay =
      dayFilter === 'All' ? true :
      dayFilter === 'Today' ? isDueToday(t.due_date) :
      dayFilter === 'Overdue' ? isOverdue(t.due_date) && !t.done :
      dayFilter === 'Upcoming' ? (t.due_date ? !isOverdue(t.due_date) && !isDueToday(t.due_date) : false) :
      true
    return matchType && matchDay
  })

  const pending = filtered.filter(t => !t.done)
  const done = filtered.filter(t => t.done)

  const todayCount = tasks.filter(t => isDueToday(t.due_date) && !t.done).length
  const overdueCount = tasks.filter(t => isOverdue(t.due_date) && !t.done).length
  const pendingCount = tasks.filter(t => !t.done).length
  const doneCount = tasks.filter(t => t.done).length

  return (
    <div>
      <Header title="Tasks" subtitle={`${pendingCount} pending tasks`} />
      <div className="p-6 space-y-6">

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex justify-between">
            {error}<button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Due Today', value: todayCount, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Overdue', value: overdueCount, color: 'text-orange-400', bg: 'bg-orange-500/10' },
            { label: 'Pending', value: pendingCount, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Completed', value: doneCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border border-[#222] ${s.bg} p-4`}>
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                {loading ? <span className="animate-pulse bg-zinc-800 rounded h-7 w-8 inline-block" /> : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters + Add */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {DAY_FILTERS.map(f => (
              <button key={f} onClick={() => setDayFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  dayFilter === f ? 'bg-orange-500 text-white' : 'bg-[#1a1a1a] border border-[#333] text-zinc-400 hover:text-white'
                }`}>
                {f}
                {f === 'Overdue' && overdueCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs">{overdueCount}</span>
                )}
              </button>
            ))}
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="text-sm border border-[#333] rounded-lg px-3 py-1.5 bg-[#1a1a1a] text-zinc-300">
              {['All', 'Call', 'Email', 'Follow-up', 'Meeting', 'Other'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
            <Plus className="h-4 w-4" /> Add Task
          </button>
        </div>

        {/* Add Task Form — white */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Add New Task</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={addTask} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Task *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Call back — interested in Pro plan"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Contact</label>
                <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  placeholder="Contact name"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700">
                  {['Call', 'Email', 'Follow-up', 'Meeting', 'Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700">
                  {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
              </div>
              <div className="col-span-2 md:col-span-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Task List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading tasks...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending */}
            <div className="rounded-xl border border-[#222] bg-[#1a1a1a] overflow-hidden">
              <div className="px-5 py-3 bg-[#111] border-b border-[#222]">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Pending ({pending.length})</p>
              </div>
              {pending.length === 0 ? (
                <div className="text-center py-10 text-zinc-600 text-sm">
                  {tasks.length === 0 ? 'No tasks yet — click Add Task to create one.' : 'No tasks match this filter.'}
                </div>
              ) : (
                <div className="divide-y divide-[#222]">
                  {pending.map(task => (
                    <div key={task.id} className={`flex items-start gap-3 px-5 py-4 hover:bg-[#222] transition-colors ${isOverdue(task.due_date) ? 'bg-red-500/5' : ''}`}>
                      <button onClick={() => toggleDone(task)} className="mt-0.5 shrink-0">
                        <Circle className="h-5 w-5 text-zinc-600 hover:text-orange-400 transition-colors" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        {task.contact_name && (
                          <p className="text-xs text-zinc-500 mt-0.5">{task.contact_name}</p>
                        )}
                        {task.notes && (
                          <p className="text-xs text-zinc-600 mt-1 italic">{task.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <Badge label={task.type} variant={typeVariant[task.type]} />
                        <Badge label={task.priority} variant={priorityVariant[task.priority]} />
                        {task.due_date && (
                          <div className={`flex items-center gap-1 text-xs font-medium ${
                            isOverdue(task.due_date) ? 'text-red-400' :
                            isDueToday(task.due_date) ? 'text-amber-400' : 'text-zinc-500'
                          }`}>
                            {isOverdue(task.due_date)
                              ? <AlertCircle className="h-3.5 w-3.5" />
                              : <Clock className="h-3.5 w-3.5" />}
                            {isOverdue(task.due_date) ? 'Overdue' : isDueToday(task.due_date) ? 'Today' : task.due_date}
                          </div>
                        )}
                        <button onClick={() => deleteTask(task.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed */}
            {done.length > 0 && (
              <div className="rounded-xl border border-[#222] bg-[#1a1a1a] overflow-hidden">
                <div className="px-5 py-3 bg-[#111] border-b border-[#222]">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Completed ({done.length})</p>
                </div>
                <div className="divide-y divide-[#222]">
                  {done.map(task => (
                    <div key={task.id} className="flex items-start gap-3 px-5 py-3 opacity-50 hover:opacity-70 transition-opacity">
                      <button onClick={() => toggleDone(task)} className="mt-0.5 shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </button>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-400 line-through">{task.title}</p>
                        {task.contact_name && <p className="text-xs text-zinc-600">{task.contact_name}</p>}
                      </div>
                      <button onClick={() => deleteTask(task.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
