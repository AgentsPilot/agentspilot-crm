'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Circle, Plus, X, Loader2, Clock, AlertCircle, Search, Bell, BellOff } from 'lucide-react'

type Task = {
  id: string
  title: string
  contact_id: string | null
  contact_name: string | null
  deal_id: string | null
  type: 'Call' | 'Email' | 'Follow-up' | 'Meeting' | 'LinkedIn' | 'WhatsApp' | 'Demo' | 'Proposal' | 'Other'
  priority: 'High' | 'Medium' | 'Low'
  due_date: string | null
  done: boolean
  notes: string | null
  alarm_at: string | null
  alarm_triggered: boolean
  created_at: string
}

const TASK_TYPES = ['Call', 'Email', 'Follow-up', 'Meeting', 'LinkedIn', 'WhatsApp', 'Demo', 'Proposal', 'Other']

const priorityVariant = { High: 'danger', Medium: 'warning', Low: 'neutral' } as const
const typeVariant: Record<string, 'indigo' | 'info' | 'warning' | 'success' | 'neutral' | 'danger'> = {
  Call: 'indigo', Email: 'info', 'Follow-up': 'warning', Meeting: 'success',
  LinkedIn: 'info', WhatsApp: 'success', Demo: 'indigo', Proposal: 'danger', Other: 'neutral',
}

const ALARM_OFFSETS = [
  { label: 'No alarm', value: '' },
  { label: 'In 1 hour', value: '1h' },
  { label: 'In 2 hours', value: '2h' },
  { label: 'In 4 hours', value: '4h' },
  { label: 'In 8 hours', value: '8h' },
  { label: 'In 1 day', value: '1d' },
  { label: 'In 2 days', value: '2d' },
  { label: 'In 3 days', value: '3d' },
  { label: 'In 1 week', value: '7d' },
]

function computeAlarmAt(offset: string): string | null {
  if (!offset) return null
  const ms: Record<string, number> = {
    '1h': 3600000, '2h': 7200000, '4h': 14400000, '8h': 28800000,
    '1d': 86400000, '2d': 172800000, '3d': 259200000, '7d': 604800000,
  }
  return new Date(Date.now() + (ms[offset] ?? 0)).toISOString()
}

function formatAlarm(alarmAt: string | null): string | null {
  if (!alarmAt) return null
  const diff = new Date(alarmAt).getTime() - Date.now()
  const abs = Math.abs(diff)
  const past = diff < 0
  const mins = Math.floor(abs / 60000)
  const hours = Math.floor(abs / 3600000)
  const days = Math.floor(abs / 86400000)
  if (mins < 60) return past ? `${mins}m overdue` : `in ${mins}m`
  if (hours < 24) return past ? `${hours}h overdue` : `in ${hours}h`
  return past ? `${days}d overdue` : `in ${days}d`
}

function formatCreatedAt(created: string) {
  const diff = Date.now() - new Date(created).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(created).toLocaleDateString()
}

const emptyForm = {
  title: '', contact_name: '', type: 'Follow-up', priority: 'Medium',
  due_date: '', notes: '', alarm_offset: '',
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
  const [search, setSearch] = useState('')

  async function fetchTasks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setTasks(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const alarm_at = computeAlarmAt(form.alarm_offset)
    const { data: taskData, error } = await supabase.from('tasks').insert([{
      title: form.title,
      contact_name: form.contact_name || null,
      type: form.type,
      priority: form.priority,
      due_date: form.due_date || null,
      notes: form.notes || null,
      done: false,
      alarm_at,
      alarm_triggered: false,
    }]).select().single()
    if (error) { setSaving(false); setError(error.message); return }

    // Auto-create email draft when task type is Email
    if (form.type === 'Email' && form.contact_name) {
      // Look up contact email from users table
      const { data: contact } = await supabase
        .from('users')
        .select('email, full_name')
        .ilike('full_name', `%${form.contact_name.trim()}%`)
        .limit(1)
        .single()

      await supabase.from('emails').insert([{
        to_email: contact?.email ?? '',
        to_name: form.contact_name,
        contact_name: form.contact_name,
        subject: `Follow-up: ${form.title}`,
        body: '',
        status: 'draft',
        task_id: taskData?.id ?? null,
        template_name: null,
      }])
    }

    setSaving(false)
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

  async function dismissAlarm(task: Task) {
    await supabase.from('tasks').update({ alarm_triggered: true }).eq('id', task.id)
    fetchTasks()
  }

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.title.toLowerCase().includes(q) || (t.contact_name ?? '').toLowerCase().includes(q)
    const matchType = typeFilter === 'All' || t.type === typeFilter
    const matchDay =
      dayFilter === 'All' ? true :
      dayFilter === 'Today' ? isDueToday(t.due_date) :
      dayFilter === 'Overdue' ? isOverdue(t.due_date) && !t.done :
      dayFilter === 'Upcoming' ? (t.due_date ? !isOverdue(t.due_date) && !isDueToday(t.due_date) : false) :
      true
    return matchSearch && matchType && matchDay
  })

  const pending = filtered.filter(t => !t.done)
  const done = filtered.filter(t => t.done)

  const todayCount = tasks.filter(t => isDueToday(t.due_date) && !t.done).length
  const overdueCount = tasks.filter(t => isOverdue(t.due_date) && !t.done).length
  const pendingCount = tasks.filter(t => !t.done).length
  const doneCount = tasks.filter(t => t.done).length
  const alarmCount = tasks.filter(t => t.alarm_at && !t.alarm_triggered && !t.done && new Date(t.alarm_at) <= new Date()).length

  const cls = 'px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700'

  return (
    <div>
      <Header
        title="Tasks"
        subtitle={`${pendingCount} pending · ${alarmCount > 0 ? `${alarmCount} alarm${alarmCount > 1 ? 's' : ''} due` : 'no alarms due'}`}
      />
      <div className="p-6 space-y-6">

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-500/20 px-4 py-3 text-sm text-red-600 flex justify-between">
            {error}<button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Alarm banner */}
        {alarmCount > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600 animate-pulse" />
              <p className="text-sm font-medium text-amber-800">
                {alarmCount} task alarm{alarmCount > 1 ? 's are' : ' is'} due right now
              </p>
            </div>
            <a href="/alarms" className="text-xs font-semibold text-amber-700 underline hover:text-amber-900">View Alarms →</a>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Due Today', value: todayCount, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Overdue', value: overdueCount, color: 'text-orange-500', bg: 'bg-orange-50' },
            { label: 'Pending', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Completed', value: doneCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border border-gray-200 ${s.bg} p-4`}>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                {loading ? <span className="animate-pulse bg-gray-100 rounded h-7 w-8 inline-block" /> : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search title or contact..."
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 w-52"
              />
            </div>
            {/* Day filters */}
            {DAY_FILTERS.map(f => (
              <button key={f} onClick={() => setDayFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  dayFilter === f ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-slate-500 hover:text-slate-700'
                }`}>
                {f}
                {f === 'Overdue' && overdueCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs">{overdueCount}</span>
                )}
              </button>
            ))}
            {/* Type filter */}
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500">
              {['All', ...TASK_TYPES].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
            <Plus className="h-4 w-4" /> Add Task
          </button>
        </div>

        {/* Add Task Form */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Add New Task</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={addTask} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Task <span className="text-red-500">*</span></label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Call back — interested in Pro plan" className={cls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Contact</label>
                <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  placeholder="Contact name" className={cls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={cls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={cls}>
                  {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={cls}>
                  {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Bell className="h-3 w-3" /> Set Alarm
                </label>
                <select value={form.alarm_offset} onChange={e => setForm(f => ({ ...f, alarm_offset: e.target.value }))} className={cls}>
                  {ALARM_OFFSETS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={cls} />
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
          <div className="flex items-center justify-center py-20 gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading tasks...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pending ({pending.length})</p>
              </div>
              {pending.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  {tasks.length === 0 ? 'No tasks yet — click Add Task to create one.' : 'No tasks match this filter.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pending.map(task => {
                    const alarmDue = task.alarm_at && !task.alarm_triggered && new Date(task.alarm_at) <= new Date()
                    const alarmPending = task.alarm_at && !task.alarm_triggered && new Date(task.alarm_at) > new Date()
                    return (
                      <div key={task.id} className={`flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors ${
                        alarmDue ? 'bg-amber-50/70' : isOverdue(task.due_date) ? 'bg-red-500/5' : ''
                      }`}>
                        <button onClick={() => toggleDone(task)} className="mt-0.5 shrink-0">
                          <Circle className="h-5 w-5 text-slate-400 hover:text-orange-500 transition-colors" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{task.title}</p>
                          {task.contact_name && (
                            <p className="text-xs text-slate-500 mt-0.5">{task.contact_name}</p>
                          )}
                          {task.notes && (
                            <p className="text-xs text-slate-400 mt-1 italic">{task.notes}</p>
                          )}
                          {/* Alarm indicators */}
                          {alarmDue && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <Bell className="h-3.5 w-3.5 text-amber-600 animate-pulse shrink-0" />
                              <span className="text-xs font-semibold text-amber-700">Alarm: {formatAlarm(task.alarm_at)}</span>
                              <button onClick={() => dismissAlarm(task)}
                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 ml-1">
                                <BellOff className="h-3 w-3" /> dismiss
                              </button>
                            </div>
                          )}
                          {alarmPending && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Bell className="h-3 w-3 text-slate-300" />
                              <span className="text-xs text-slate-400">Alarm {formatAlarm(task.alarm_at)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          <Badge label={task.type} variant={typeVariant[task.type]} />
                          <Badge label={task.priority} variant={priorityVariant[task.priority]} />
                          {task.due_date && (
                            <div className={`flex items-center gap-1 text-xs font-medium ${
                              isOverdue(task.due_date) ? 'text-red-600' :
                              isDueToday(task.due_date) ? 'text-amber-600' : 'text-slate-500'
                            }`}>
                              {isOverdue(task.due_date) ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                              {isOverdue(task.due_date) ? 'Overdue' : isDueToday(task.due_date) ? 'Today' : task.due_date}
                            </div>
                          )}
                          <span className="text-xs text-slate-300">{formatCreatedAt(task.created_at)}</span>
                          <button onClick={() => deleteTask(task.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Completed */}
            {done.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Completed ({done.length})</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {done.map(task => (
                    <div key={task.id} className="flex items-start gap-3 px-5 py-3 opacity-50 hover:opacity-70 transition-opacity">
                      <button onClick={() => toggleDone(task)} className="mt-0.5 shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </button>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-500 line-through">{task.title}</p>
                        {task.contact_name && <p className="text-xs text-slate-400">{task.contact_name}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-300">{formatCreatedAt(task.created_at)}</span>
                        <button onClick={() => deleteTask(task.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
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
