'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { CheckCircle2, Circle, Plus, Clock } from 'lucide-react'

type Task = {
  id: string
  title: string
  contact: string
  due: string
  priority: 'High' | 'Medium' | 'Low'
  type: 'Call' | 'Email' | 'Follow-up' | 'Other'
  done: boolean
}

const sample: Task[] = [
  { id: '1', title: 'Call back — interested in Pro plan', contact: 'John Smith', due: 'Today', priority: 'High', type: 'Call', done: false },
  { id: '2', title: 'Send proposal email', contact: 'Sarah Lee', due: 'Today', priority: 'High', type: 'Email', done: false },
  { id: '3', title: 'Follow up — no response in 3 days', contact: 'Marco Rossi', due: 'Tomorrow', priority: 'Medium', type: 'Follow-up', done: false },
  { id: '4', title: 'Qualify — check budget & timeline', contact: 'Nina Patel', due: 'Tomorrow', priority: 'Medium', type: 'Call', done: true },
]

const priorityVariant = { High: 'danger', Medium: 'warning', Low: 'neutral' } as const
const typeVariant = { Call: 'indigo', Email: 'info', 'Follow-up': 'warning', Other: 'neutral' } as const

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(sample)

  const toggle = (id: string) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const todo = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  return (
    <div>
      <Header title="Tasks" subtitle={`${todo.length} tasks pending`} />
      <div className="p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Due Today', value: tasks.filter(t => t.due === 'Today' && !t.done).length, color: 'text-red-600' },
            { label: 'Pending', value: todo.length, color: 'text-amber-600' },
            { label: 'Completed', value: done.length, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Coming soon notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <strong>Coming next:</strong> Tasks will be connected to Supabase and auto-created when a contact enters the pipeline.
        </div>

        {/* Pending tasks */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Pending Tasks</h2>
            <button className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              <Plus className="h-3.5 w-3.5" /> Add Task
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {todo.map(task => (
              <div key={task.id} className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                <button onClick={() => toggle(task.id)} className="mt-0.5 shrink-0">
                  <Circle className="h-5 w-5 text-slate-300" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{task.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{task.contact}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge label={task.type} variant={typeVariant[task.type]} />
                  <Badge label={task.priority} variant={priorityVariant[task.priority]} />
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {task.due}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed */}
        {done.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-slate-500">Completed ({done.length})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {done.map(task => (
                <div key={task.id} className="flex items-start gap-3 px-5 py-4 opacity-50">
                  <button onClick={() => toggle(task.id)} className="mt-0.5 shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 line-through">{task.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{task.contact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
