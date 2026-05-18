'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { checklistItems, type ChecklistItem } from '@/lib/mock-data'
import { CheckCircle2, Circle, ChevronDown } from 'lucide-react'

const categoryVariant = {
  Content: 'info',
  Ads: 'indigo',
  Analytics: 'success',
  Email: 'warning',
  Strategy: 'neutral',
} as const

const priorityVariant = {
  High: 'danger',
  Medium: 'warning',
  Low: 'neutral',
} as const

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const categories = ['All', 'Content', 'Ads', 'Analytics', 'Email', 'Strategy']

export default function WeeklyChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>(checklistItems)
  const [filter, setFilter] = useState('All')

  const toggle = (id: string) =>
    setItems(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item))

  const completed = items.filter(i => i.completed).length
  const total = items.length
  const pct = Math.round((completed / total) * 100)

  const filtered = items.filter(i => filter === 'All' || i.category === filter)

  return (
    <div>
      <Header title="Weekly Checklist" subtitle={`Week of May 12 – 16, 2026`} />
      <div className="p-6 space-y-6">

        {/* Progress */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Weekly Progress</p>
              <p className="text-xs text-slate-500 mt-0.5">{completed} of {total} tasks completed</p>
            </div>
            <span className={`text-2xl font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {pct}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-5 gap-3 mt-4">
            {categories.slice(1).map(cat => {
              const catItems = items.filter(i => i.category === cat)
              const catDone = catItems.filter(i => i.completed).length
              return (
                <div key={cat} className="text-center">
                  <p className="text-xs text-slate-500">{cat}</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{catDone}/{catItems.length}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filter === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-gray-200 hover:border-indigo-400'
              }`}>
              {c}
            </button>
          ))}
        </div>

        {/* Tasks by Day */}
        <div className="space-y-4">
          {days.map(day => {
            const dayItems = filtered.filter(i => i.dueDay === day)
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
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 px-5 py-4 transition-colors ${item.completed ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`}
                    >
                      <button onClick={() => toggle(item.id)} className="mt-0.5 shrink-0">
                        {item.completed
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          : <Circle className="h-5 w-5 text-slate-300" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {item.task}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge label={item.category} variant={categoryVariant[item.category]} />
                          <Badge label={item.priority} variant={priorityVariant[item.priority]} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
