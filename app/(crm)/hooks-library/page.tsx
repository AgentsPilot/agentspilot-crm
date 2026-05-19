'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { hooks, type Hook } from '@/lib/mock-data'
import { Search, Copy, Star } from 'lucide-react'

const categoryVariant = {
  Curiosity: 'info',
  Fear: 'danger',
  Benefit: 'success',
  'Social Proof': 'indigo',
  Urgency: 'warning',
  Story: 'neutral',
} as const

const platformVariant = {
  Meta: 'indigo',
  TikTok: 'danger',
  LinkedIn: 'info',
  Email: 'neutral',
  Universal: 'success',
} as const

const categories = ['All', 'Curiosity', 'Fear', 'Benefit', 'Social Proof', 'Urgency', 'Story']
const platforms = ['All', 'Meta', 'TikTok', 'LinkedIn', 'Email', 'Universal']

export default function HooksLibraryPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [platform, setPlatform] = useState('All')
  const [sort, setSort] = useState<'avgScore' | 'usageCount'>('avgScore')
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = hooks
    .filter(h => {
      const q = search.toLowerCase()
      return (
        (!search || h.text.toLowerCase().includes(q) || h.tags.some(t => t.includes(q))) &&
        (category === 'All' || h.category === category) &&
        (platform === 'All' || h.platform === platform)
      )
    })
    .sort((a, b) => b[sort] - a[sort])

  const copyHook = (hook: Hook) => {
    navigator.clipboard.writeText(hook.text)
    setCopied(hook.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const avgScore = (hooks.reduce((s, h) => s + h.avgScore, 0) / hooks.length).toFixed(1)
  const totalUses = hooks.reduce((s, h) => s + h.usageCount, 0)
  const topHook = hooks.reduce((a, b) => a.avgScore > b.avgScore ? a : b)

  return (
    <div>
      <Header title="Hooks Library" subtitle="Proven hooks organised by category and platform" />
      <div className="p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Hooks', value: hooks.length },
            { label: 'Avg Score', value: `${avgScore}/100` },
            { label: 'Total Uses', value: totalUses },
            { label: 'Top Score', value: `${topHook.avgScore}/100` },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search hooks or tags..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={platform} onChange={e => setPlatform(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700">
            {platforms.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as 'avgScore' | 'usageCount')}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-slate-700">
            <option value="avgScore">Sort: Best Score</option>
            <option value="usageCount">Sort: Most Used</option>
          </select>
        </div>

        {/* Category quick filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
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
                  {['Hook Text', 'Category', 'Platform', 'Score', 'Uses', 'Tags', 'Copy'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((hook: Hook) => (
                  <tr key={hook.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 max-w-sm">
                      <p className="text-sm text-slate-800 leading-relaxed">{hook.text}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge label={hook.category} variant={categoryVariant[hook.category]} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge label={hook.platform} variant={platformVariant[hook.platform]} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Star className={`h-3.5 w-3.5 ${hook.avgScore >= 90 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                        <span className={`font-bold text-sm ${hook.avgScore >= 90 ? 'text-amber-600' : hook.avgScore >= 85 ? 'text-indigo-600' : 'text-slate-600'}`}>
                          {hook.avgScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600 font-medium">{hook.usageCount}×</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {hook.tags.map(tag => (
                          <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => copyHook(hook)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          copied === hook.id
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                        }`}>
                        <Copy className="h-3 w-3" />
                        {copied === hook.id ? 'Copied!' : 'Copy'}
                      </button>
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
