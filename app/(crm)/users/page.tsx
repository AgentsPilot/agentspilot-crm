'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { users, type User } from '@/lib/mock-data'
import { Search, Filter } from 'lucide-react'

const statusVariant = {
  active: 'success',
  converted: 'indigo',
  lead: 'warning',
  inactive: 'neutral',
} as const

const levelVariant = {
  Awareness: 'neutral',
  Interest: 'info',
  Consideration: 'warning',
  Intent: 'indigo',
  Converted: 'success',
} as const

const channels = ['All', 'Meta', 'Google', 'TikTok', 'Organic', 'Email']
const statuses = ['All', 'active', 'lead', 'converted', 'inactive']

const summary = {
  total: users.length,
  active: users.filter(u => u.status === 'active').length,
  converted: users.filter(u => u.status === 'converted').length,
  leads: users.filter(u => u.status === 'lead').length,
  totalSpend: users.reduce((s, u) => s + u.spend, 0),
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState('All')
  const [status, setStatus] = useState('All')

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !search || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const matchChannel = channel === 'All' || u.channel === channel
    const matchStatus = status === 'All' || u.status === status
    return matchSearch && matchChannel && matchStatus
  })

  return (
    <div>
      <Header title="Users" subtitle={`${summary.total} total users`} />
      <div className="p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Users', value: summary.total, color: 'text-slate-900' },
            { label: 'Active', value: summary.active, color: 'text-emerald-600' },
            { label: 'Converted', value: summary.converted, color: 'text-indigo-600' },
            { label: 'Leads', value: summary.leads, color: 'text-amber-600' },
            { label: 'Total Spend', value: `$${summary.totalSpend.toLocaleString()}`, color: 'text-slate-900' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={channel} onChange={e => setChannel(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700">
              {channels.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700">
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Status', 'Level', 'Channel', 'Country', 'Joined', 'Leads', 'Conv.', 'Spend'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((user: User) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={user.status} variant={statusVariant[user.status]} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={user.level} variant={levelVariant[user.level]} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{user.channel}</td>
                    <td className="px-4 py-3 text-slate-700">{user.country}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{user.joined}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{user.leads}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">{user.conversions}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {user.spend > 0 ? `$${user.spend.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-xs text-slate-400">
            Showing {filtered.length} of {users.length} users
          </div>
        </div>
      </div>
    </div>
  )
}
