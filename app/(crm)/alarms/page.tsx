'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { Bell, BellOff, CheckCircle2, Clock, Loader2, X, AlertCircle, Filter } from 'lucide-react'

type Task = {
  id: string
  title: string
  contact_name: string | null
  type: string
  priority: 'High' | 'Medium' | 'Low'
  due_date: string | null
  done: boolean
  notes: string | null
  alarm_at: string
  alarm_triggered: boolean
  created_at: string
}

type AlarmStatus = 'all' | 'pending' | 'overdue' | 'triggered'

const priorityColor = { High: 'text-red-600 bg-red-50', Medium: 'text-amber-600 bg-amber-50', Low: 'text-slate-500 bg-gray-50' }

function alarmStatus(task: Task): 'overdue' | 'pending' | 'triggered' {
  if (task.alarm_triggered || task.done) return 'triggered'
  if (new Date(task.alarm_at) <= new Date()) return 'overdue'
  return 'pending'
}

function formatAlarmTime(alarmAt: string): { label: string; relative: string } {
  const date = new Date(alarmAt)
  const diff = date.getTime() - Date.now()
  const abs = Math.abs(diff)
  const past = diff < 0
  const mins = Math.floor(abs / 60000)
  const hours = Math.floor(abs / 3600000)
  const days = Math.floor(abs / 86400000)

  let relative: string
  if (mins < 60) relative = past ? `${mins}m ago` : `in ${mins}m`
  else if (hours < 24) relative = past ? `${hours}h ago` : `in ${hours}h`
  else relative = past ? `${days}d ago` : `in ${days}d`

  return {
    label: date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    relative,
  }
}

export default function AlarmsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<AlarmStatus>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function fetchTasks() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .not('alarm_at', 'is', null)
      .order('alarm_at', { ascending: true })
    setTasks((data ?? []) as Task[])
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [])

  async function dismissAlarm(id: string) {
    await supabase.from('tasks').update({ alarm_triggered: true }).eq('id', id)
    fetchTasks()
  }

  async function restoreAlarm(id: string) {
    await supabase.from('tasks').update({ alarm_triggered: false }).eq('id', id)
    fetchTasks()
  }

  async function markDone(id: string) {
    await supabase.from('tasks').update({ done: true, alarm_triggered: true }).eq('id', id)
    fetchTasks()
  }

  const filtered = tasks.filter(t => {
    const s = alarmStatus(t)
    const matchStatus = statusFilter === 'all' || s === statusFilter
    const alarmDate = t.alarm_at.split('T')[0]
    const matchFrom = !dateFrom || alarmDate >= dateFrom
    const matchTo = !dateTo || alarmDate <= dateTo
    return matchStatus && matchFrom && matchTo
  })

  const overdueCount = tasks.filter(t => alarmStatus(t) === 'overdue').length
  const pendingCount = tasks.filter(t => alarmStatus(t) === 'pending').length
  const triggeredCount = tasks.filter(t => alarmStatus(t) === 'triggered').length

  const kpis = [
    { label: 'Overdue', value: overdueCount, color: 'text-red-600', bg: 'bg-red-50', filter: 'overdue' as AlarmStatus },
    { label: 'Pending', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50', filter: 'pending' as AlarmStatus },
    { label: 'Acknowledged', value: triggeredCount, color: 'text-emerald-600', bg: 'bg-emerald-50', filter: 'triggered' as AlarmStatus },
    { label: 'Total', value: tasks.length, color: 'text-sky-600', bg: 'bg-sky-50', filter: 'all' as AlarmStatus },
  ]

  const cls = 'px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700'

  return (
    <div>
      <Header
        title="Alarms"
        subtitle={overdueCount > 0 ? `${overdueCount} alarm${overdueCount > 1 ? 's' : ''} need attention` : 'All alarms on track'}
      />
      <div className="p-6 space-y-6">

        {/* KPI cards — clickable filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(k => (
            <button key={k.label} onClick={() => setStatusFilter(k.filter)}
              className={`rounded-xl border text-left p-4 transition-all ${
                statusFilter === k.filter
                  ? 'border-orange-500 ring-2 ring-orange-200'
                  : 'border-gray-200 hover:border-gray-300'
              } ${k.bg}`}>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>
                {loading ? <span className="animate-pulse bg-gray-100 rounded h-7 w-8 inline-block" /> : k.value}
              </p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={cls} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={cls} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors">
              <X className="h-3.5 w-3.5" /> Clear dates
            </button>
          )}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} alarm{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Alarm list */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading alarms...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
            <BellOff className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No alarms found</p>
            <p className="text-xs text-slate-400 mt-1">Set alarms when creating tasks to see them here</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filtered.map(task => {
                const s = alarmStatus(task)
                const { label: alarmLabel, relative } = formatAlarmTime(task.alarm_at)
                return (
                  <div key={task.id} className={`flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50/50 ${
                    s === 'overdue' ? 'border-l-4 border-red-400' :
                    s === 'pending' ? 'border-l-4 border-amber-400' :
                    'border-l-4 border-gray-200 opacity-60'
                  }`}>
                    {/* Bell icon */}
                    <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      s === 'overdue' ? 'bg-red-100' :
                      s === 'pending' ? 'bg-amber-100' :
                      'bg-gray-100'
                    }`}>
                      {s === 'triggered'
                        ? <BellOff className="h-4 w-4 text-slate-400" />
                        : <Bell className={`h-4 w-4 ${s === 'overdue' ? 'text-red-600 animate-pulse' : 'text-amber-600'}`} />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className={`text-sm font-medium ${s === 'triggered' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {task.title}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s === 'overdue' ? 'bg-red-100 text-red-700' :
                          s === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{s}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.contact_name && (
                        <p className="text-xs text-slate-500">{task.contact_name}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {/* Alarm time */}
                        <div className={`flex items-center gap-1 text-xs font-medium ${
                          s === 'overdue' ? 'text-red-600' : s === 'pending' ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          <Bell className="h-3 w-3" />
                          <span>{alarmLabel}</span>
                          <span className="font-normal opacity-70">({relative})</span>
                        </div>
                        {/* Due date */}
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>Due {task.due_date}</span>
                          </div>
                        )}
                        {/* Type */}
                        <span className="text-xs text-slate-400">{task.type}</span>
                      </div>
                      {task.notes && (
                        <p className="text-xs text-slate-400 mt-1 italic">{task.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {s === 'overdue' && (
                        <>
                          <button onClick={() => markDone(task.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Done
                          </button>
                          <button onClick={() => dismissAlarm(task.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 text-slate-600 rounded-lg hover:bg-gray-50 transition-colors">
                            <BellOff className="h-3.5 w-3.5" /> Dismiss
                          </button>
                        </>
                      )}
                      {s === 'pending' && (
                        <button onClick={() => dismissAlarm(task.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 text-slate-600 rounded-lg hover:bg-gray-50 transition-colors">
                          <BellOff className="h-3.5 w-3.5" /> Dismiss
                        </button>
                      )}
                      {s === 'triggered' && (
                        <button onClick={() => restoreAlarm(task.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <Bell className="h-3.5 w-3.5" /> Restore
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
