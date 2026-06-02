'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import {
  Loader2, Clock, AlertCircle, CheckCircle2, Zap,
  LayoutGrid, List, RefreshCw, Users, GitBranch, RotateCcw, Shield,
  Snowflake, Send, CheckCircle,
} from 'lucide-react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────
type TaskStatus = 'open' | 'in_progress' | 'done'

type Task = {
  id: string
  title: string
  contact_id: string | null
  contact_name: string | null
  type: string
  priority: 'High' | 'Medium' | 'Low'
  due_date: string | null
  status: TaskStatus
  notes: string | null
  created_at: string
}

type ColdLead = {
  contact_id: string
  first_name: string
  last_name:  string | null
  email:      string
  company:    string | null
  changed_at: string
}

// ── Config ─────────────────────────────────────────────────────────────────
const STATUS_COLS: { id: TaskStatus; label: string; dot: string; header: string; card: string; border: string; badge: string }[] = [
  { id: 'open',        label: 'To Do',       dot: 'bg-amber-400',   header: 'text-amber-700',   card: 'bg-amber-50/40',    border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700'    },
  { id: 'in_progress', label: 'In Progress', dot: 'bg-blue-400',    header: 'text-blue-700',    card: 'bg-blue-50/40',     border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700'      },
  { id: 'done',        label: 'Done',        dot: 'bg-emerald-400', header: 'text-emerald-700', card: 'bg-emerald-50/40',  border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
]

const TYPE_META: Record<string, { color: string; accent: string; icon: React.ReactNode }> = {
  'Lead Follow-up':    { color: 'bg-orange-100 text-orange-700',  accent: 'bg-orange-400',  icon: <RefreshCw  className="h-3 w-3" /> },
  'Trial Activation':  { color: 'bg-blue-100 text-blue-700',      accent: 'bg-blue-400',    icon: <Zap        className="h-3 w-3" /> },
  'Trial Conversion':  { color: 'bg-violet-100 text-violet-700',  accent: 'bg-violet-400',  icon: <GitBranch  className="h-3 w-3" /> },
  'Win-back':          { color: 'bg-rose-100 text-rose-700',      accent: 'bg-rose-400',    icon: <RotateCcw  className="h-3 w-3" /> },
  'Retention':         { color: 'bg-emerald-100 text-emerald-700',accent: 'bg-emerald-400', icon: <Shield     className="h-3 w-3" /> },
  'Re-engage':         { color: 'bg-amber-100 text-amber-700',    accent: 'bg-amber-400',   icon: <Users      className="h-3 w-3" /> },
}

const TYPE_TABS = [
  { id: 'All',              label: 'All',              icon: LayoutGrid  },
  { id: 'Lead Follow-up',   label: 'Lead Follow-up',   icon: RefreshCw   },
  { id: 'Trial Activation', label: 'Trial Activation', icon: Zap         },
  { id: 'Trial Conversion', label: 'Trial Conversion', icon: GitBranch   },
  { id: 'Win-back',         label: 'Win-back',         icon: RotateCcw   },
  { id: 'Retention',        label: 'Retention',        icon: Shield      },
  { id: 'Re-engage',        label: 'Re-engage',        icon: Users       },
]

const priorityColor: Record<string, string> = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low:    'bg-gray-100 text-gray-500',
}

function isOverdue(due: string | null, status: TaskStatus) {
  if (!due || status === 'done') return false
  return due < new Date().toISOString().split('T')[0]
}
function isDueToday(due: string | null) {
  if (!due) return false
  return due === new Date().toISOString().split('T')[0]
}
function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Task Card ──────────────────────────────────────────────────────────────
const COLD_COL = { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-500', label: 'Cold' }

function TaskCard({ task }: { task: Task }) {
  const overdue = isOverdue(task.due_date, task.status)
  const today   = isDueToday(task.due_date)
  const meta    = TYPE_META[task.type]
  const isCold  = task.status === 'done' && task.type === 'Lead Follow-up' && task.notes?.includes('cold')
  const col     = isCold ? COLD_COL : STATUS_COLS.find(c => c.id === task.status)!

  return (
    <div className={`relative rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-all ${overdue ? 'border-red-200' : 'border-gray-200'}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta?.accent ?? 'bg-gray-300'}`} />
      <div className="pl-4 pr-3.5 py-3.5">
        <p className={`text-sm font-semibold leading-tight mb-1 ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {task.title}
        </p>
        {task.contact_name && (
          <p className="text-xs text-slate-500 mb-2">
            {task.contact_id
              ? <a href={`/contacts/${task.contact_id}`} className="hover:text-orange-500 transition-colors">{task.contact_name}</a>
              : task.contact_name}
          </p>
        )}
        {task.notes && <p className="text-xs text-slate-400 italic mb-2 line-clamp-2">{task.notes}</p>}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${meta ? meta.color + ' border-current/20' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {meta?.icon}{task.type}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[task.priority]}`}>{task.priority}</span>
          {task.due_date && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${overdue ? 'bg-red-100 text-red-600' : today ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
              <Clock className="h-3 w-3" />
              {overdue ? 'Overdue' : today ? 'Today' : formatDate(task.due_date)}
            </span>
          )}
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${col.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />{col.label}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── List Row ───────────────────────────────────────────────────────────────
function TaskRow({ task }: { task: Task }) {
  const overdue = isOverdue(task.due_date, task.status)
  const today   = isDueToday(task.due_date)
  const meta    = TYPE_META[task.type]
  const isCold  = task.status === 'done' && task.type === 'Lead Follow-up' && task.notes?.includes('cold')
  const col     = isCold ? COLD_COL : STATUS_COLS.find(c => c.id === task.status)!

  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${overdue ? 'bg-red-50/20' : ''}`}>
      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${col.dot}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
        {task.contact_name && (
          <p className="text-xs text-slate-400 mt-0.5">
            {task.contact_id
              ? <a href={`/contacts/${task.contact_id}`} className="hover:text-orange-500">{task.contact_name}</a>
              : task.contact_name}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${meta ? meta.color + ' border-current/20' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          {meta?.icon}{task.type}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[task.priority]}`}>{task.priority}</span>
        {task.due_date && (
          <span className={`text-xs flex items-center gap-1 font-medium ${overdue ? 'text-red-600' : today ? 'text-amber-600' : 'text-slate-400'}`}>
            <Clock className="h-3 w-3" />
            {overdue ? 'Overdue' : today ? 'Today' : formatDate(task.due_date)}
          </span>
        )}
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${col.badge}`}>{col.label}</span>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function TasksPage() {
  const [pageTab, setPageTab]         = useState<'tasks' | 'cold'>('tasks')

  // Tasks state
  const [tasks, setTasks]             = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [activeType, setActiveType]   = useState('All')
  const [viewMode, setViewMode]       = useState<'kanban' | 'list'>('kanban')

  // Cold leads state
  const [coldLeads, setColdLeads]     = useState<ColdLead[]>([])
  const [loadingCold, setLoadingCold] = useState(true)
  const [sending, setSending]         = useState<string | null>(null)
  const [sentIds, setSentIds]         = useState<Set<string>>(new Set())

  useEffect(() => { fetchTasks(); fetchColdLeads() }, [])

  async function fetchTasks() {
    setLoadingTasks(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('id,title,contact_id,contact_name,type,priority,due_date,status,notes,created_at')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setTasks((data ?? []) as Task[])
    setLoadingTasks(false)
  }

  async function fetchColdLeads() {
    setLoadingCold(true)
    const { data } = await supabase
      .from('contacts_current')
      .select('contact_id,first_name,last_name,email,company,changed_at')
      .eq('stage', 'lead')
      .eq('state', 'cold')
      .order('changed_at', { ascending: true })
    setColdLeads((data ?? []) as ColdLead[])
    setLoadingCold(false)
  }

  async function sendLastChance(contactId: string | 'all') {
    setSending(contactId)
    try {
      const body = contactId === 'all' ? { all: true } : { contact_id: contactId }
      const res  = await fetch('/api/leads/last-chance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const json = await res.json()
      if (contactId === 'all') {
        setSentIds(new Set(coldLeads.map(l => l.contact_id)))
      } else if (json.success) {
        setSentIds(prev => new Set([...prev, contactId]))
      }
    } finally {
      setSending(null)
    }
  }

  const filtered        = tasks.filter(t => activeType === 'All' || t.type === activeType)
  const todoCount       = tasks.filter(t => t.status === 'open').length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
  const doneCount       = tasks.filter(t => t.status === 'done').length
  const overdueCount    = tasks.filter(t => isOverdue(t.due_date, t.status)).length
  const daysSince       = (ts: string) => Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)

  return (
    <div>
      <Header
        title="Tasks"
        subtitle={`${todoCount + inProgressCount} active · ${overdueCount > 0 ? `${overdueCount} overdue` : 'all on track'} · auto-managed by lifecycle`}
      />

      <div className="p-6 space-y-5">

        {/* ── Page-level tabs ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          <button
            onClick={() => setPageTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              pageTab === 'tasks' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Tasks
            {(todoCount + inProgressCount) > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${pageTab === 'tasks' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-slate-500'}`}>
                {todoCount + inProgressCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setPageTab('cold')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              pageTab === 'cold' ? 'border-slate-500 text-slate-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Snowflake className="h-4 w-4" />
            Cold Leads
            {coldLeads.length > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${pageTab === 'cold' ? 'bg-slate-100 text-slate-600' : 'bg-gray-100 text-slate-500'}`}>
                {coldLeads.length}
              </span>
            )}
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TASKS TAB
        ══════════════════════════════════════════════════════════════════ */}
        {pageTab === 'tasks' && (
          <>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'To Do',       value: todoCount,       icon: <Clock        className="h-4 w-4" />, color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200'   },
                { label: 'In Progress', value: inProgressCount, icon: <Zap          className="h-4 w-4" />, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200'    },
                { label: 'Done',        value: doneCount,       icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                { label: 'Overdue',     value: overdueCount,    icon: <AlertCircle  className="h-4 w-4" />, color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200'     },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-4 flex items-center gap-3`}>
                  <div className={s.color}>{s.icon}</div>
                  <div>
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>
                      {loadingTasks ? <span className="animate-pulse bg-gray-200 rounded h-7 w-8 inline-block" /> : s.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Type tabs + view toggle */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 flex-1">
                {TYPE_TABS.map(tab => {
                  const Icon  = tab.icon
                  const count = tab.id === 'All'
                    ? tasks.filter(t => t.status !== 'done').length
                    : tasks.filter(t => t.type === tab.id && t.status !== 'done').length
                  return (
                    <button key={tab.id}
                      onClick={() => setActiveType(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        activeType === tab.id
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-slate-500 hover:border-orange-300 hover:text-orange-500'
                      }`}>
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {count > 0 && (
                        <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${activeType === tab.id ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 shrink-0">
                <button onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <LayoutGrid className="h-3.5 w-3.5" /> Board
                </button>
                <button onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <List className="h-3.5 w-3.5" /> List
                </button>
              </div>
            </div>

            {/* Kanban */}
            {!loadingTasks && viewMode === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STATUS_COLS.map(col => {
                  const colTasks = filtered.filter(t => t.status === col.id)
                  return (
                    <div key={col.id} className={`rounded-xl border ${col.border} overflow-hidden`}>
                      <div className={`px-4 py-3 border-b ${col.border} bg-white flex items-center gap-2`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                        <span className={`text-sm font-semibold ${col.header}`}>{col.label}</span>
                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${col.badge}`}>{colTasks.length}</span>
                      </div>
                      <div className={`p-3 space-y-2.5 min-h-[200px] ${col.card}`}>
                        {colTasks.length === 0
                          ? <div className="flex items-center justify-center h-24 text-xs text-slate-400">No {col.label.toLowerCase()} tasks</div>
                          : colTasks.map(task => <TaskCard key={task.id} task={task} />)
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* List */}
            {!loadingTasks && viewMode === 'list' && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-1" />
                  <div className="col-span-5">Task</div>
                  <div className="col-span-4">Type · Priority · Due</div>
                  <div className="col-span-2 text-right">Status</div>
                </div>
                {filtered.length === 0
                  ? <div className="py-16 text-center text-sm text-slate-400">No tasks found</div>
                  : filtered.map(task => <TaskRow key={task.id} task={task} />)
                }
              </div>
            )}

            {loadingTasks && (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            )}

            {!loadingTasks && tasks.length > 0 && (
              <p className="text-center text-xs text-slate-400">
                ⚡ Tasks are created and updated automatically by the lifecycle engine
              </p>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            COLD LEADS TAB
        ══════════════════════════════════════════════════════════════════ */}
        {pageTab === 'cold' && (
          <div className="space-y-4">

            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Leads with no trial signup after <span className="font-semibold">30 days</span>. Automatic emails have stopped — send a manual last chance email to re-engage them.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  If they sign up after receiving this email, they'll auto-upgrade to trial.
                </p>
              </div>
              {coldLeads.length > 0 && (
                <button
                  onClick={() => sendLastChance('all')}
                  disabled={sending !== null}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50 transition-colors shrink-0 ml-4"
                >
                  {sending === 'all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send to All
                </button>
              )}
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {loadingCold ? (
                <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : coldLeads.length === 0 ? (
                <div className="text-center py-16">
                  <Snowflake className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-medium text-slate-500">No cold leads</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Leads that receive no trial signup after 30 days are automatically moved here
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Lead</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Company</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Cold since</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {coldLeads.map(lead => {
                      const alreadySent = sentIds.has(lead.contact_id)
                      const days        = daysSince(lead.changed_at)
                      const name        = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
                      return (
                        <tr key={lead.contact_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <Link href={`/contacts/${lead.contact_id}`} className="group">
                              <p className="font-medium text-slate-800 group-hover:text-orange-600 transition-colors">{name}</p>
                              <p className="text-xs text-slate-400">{lead.email}</p>
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500">{lead.company ?? '—'}</td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs font-medium ${days > 60 ? 'text-red-500' : 'text-slate-500'}`}>
                              {days}d ago
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {alreadySent ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <CheckCircle className="h-3.5 w-3.5" /> Sent
                              </span>
                            ) : (
                              <button
                                onClick={() => sendLastChance(lead.contact_id)}
                                disabled={sending !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
                              >
                                {sending === lead.contact_id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Send className="h-3 w-3" />
                                }
                                Send Last Chance
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
