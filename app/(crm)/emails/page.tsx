import Header from '@/components/layout/Header'
import { Mail, Send, FileText } from 'lucide-react'

const templates = [
  { id: '1', name: 'Initial Intro', subject: 'Thanks for reaching out — next steps', tags: ['New Lead'] },
  { id: '2', name: 'Follow-up Day 2', subject: 'Quick follow-up from AgentsPilot', tags: ['Follow-up'] },
  { id: '3', name: 'Proposal', subject: 'Your personalised proposal is ready', tags: ['Qualified'] },
  { id: '4', name: 'Win-back', subject: 'We noticed you haven\'t responded...', tags: ['Cold'] },
]

const recent = [
  { id: '1', to: 'john@example.com', subject: 'Thanks for reaching out', date: '2026-05-17', status: 'delivered' },
  { id: '2', to: 'sarah@example.com', subject: 'Your personalised proposal', date: '2026-05-16', status: 'opened' },
  { id: '3', to: 'marco@example.com', subject: 'Quick follow-up', date: '2026-05-15', status: 'clicked' },
]

const statusColor = { delivered: 'text-slate-500', opened: 'text-amber-600', clicked: 'text-emerald-600' }

export default function EmailsPage() {
  return (
    <div>
      <Header title="Emails" subtitle="Send and manage outreach emails" />
      <div className="p-6 space-y-6">

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <strong>Coming next:</strong> Full email composer connected to contacts, with send history and open tracking.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Compose */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Send className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">Compose Email</h2>
            </div>
            <div className="space-y-3">
              <input placeholder="To — contact email" disabled
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-slate-400" />
              <input placeholder="Subject" disabled
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-slate-400" />
              <textarea rows={5} placeholder="Message..." disabled
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-slate-400 resize-none" />
              <button disabled className="w-full py-2 bg-indigo-200 text-indigo-400 text-sm font-medium rounded-lg cursor-not-allowed">
                Send Email (coming soon)
              </button>
            </div>
          </div>

          {/* Templates */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">Email Templates</h2>
            </div>
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.subject}</p>
                  </div>
                  <div className="flex gap-1">
                    {t.tags.map(tag => (
                      <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent sent */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Recently Sent</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.map(e => (
              <div key={e.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{e.subject}</p>
                  <p className="text-xs text-slate-400">{e.to}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium capitalize ${statusColor[e.status as keyof typeof statusColor]}`}>
                    {e.status}
                  </span>
                  <span className="text-xs text-slate-400">{e.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
