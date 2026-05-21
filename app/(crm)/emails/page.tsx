'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { Mail, Send, FileText, X, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

type Contact = { id: string; full_name: string | null; email: string | null }
type SentEmail = {
  id: string
  to_email: string
  to_name: string | null
  contact_name: string | null
  subject: string
  body: string
  template_name: string | null
  status: 'sent' | 'queued' | 'failed' | 'draft'
  task_id: string | null
  created_at: string
}

const TEMPLATES = [
  {
    name: 'Initial Intro',
    subject: 'Thanks for reaching out — next steps',
    tags: ['New Lead'],
    body: `Hi {{name}},

Thanks for reaching out to AgentsPilot! I wanted to personally follow up and learn more about what you're working on.

I'd love to schedule a quick 20-minute call to understand your goals and show you how AgentsPilot can help.

Would any of these times work for you?
→ Tomorrow at 10am or 2pm
→ Thursday at 11am or 3pm

Looking forward to connecting!

Best,
The AgentsPilot Team`,
  },
  {
    name: 'Follow-up Day 2',
    subject: 'Quick follow-up from AgentsPilot',
    tags: ['Follow-up'],
    body: `Hi {{name}},

Just wanted to follow up on my previous message — I don't want you to miss out on what AgentsPilot can do for your business.

Our platform helps teams automate lead gen, track pipelines, and close deals faster.

Happy to answer any questions — just reply to this email or book a call directly:
→ [Book a call]

Best,
The AgentsPilot Team`,
  },
  {
    name: 'Proposal Ready',
    subject: 'Your personalised proposal is ready',
    tags: ['Qualified'],
    body: `Hi {{name}},

Great news — I've put together a personalised proposal based on our conversation.

Here's what's included:
• Recommended plan for your team size
• Pricing breakdown
• Onboarding timeline
• ROI projection

I'd love to walk you through it on a call. Let me know when works best for you.

Best,
The AgentsPilot Team`,
  },
  {
    name: 'Win-back',
    subject: "We noticed you haven't responded...",
    tags: ['Cold'],
    body: `Hi {{name}},

I noticed we haven't connected in a while and wanted to check in.

Has anything changed on your end? We've recently launched some new features that might be a great fit for what you're working on.

If now isn't the right time, no worries at all — just let me know and I'll follow up in a few months.

Best,
The AgentsPilot Team`,
  },
]

const statusIcon = {
  sent: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  queued: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  failed: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
}
const statusLabel = { sent: 'Sent', queued: 'Queued', failed: 'Failed' }
const statusColor = { sent: 'text-emerald-600', queued: 'text-amber-600', failed: 'text-red-600' }

export default function EmailsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [showContactDrop, setShowContactDrop] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [previewEmail, setPreviewEmail] = useState<SentEmail | null>(null)

  const [form, setForm] = useState({
    to_email: '', to_name: '', subject: '', body: '',
  })

  useEffect(() => {
    async function load() {
      const [c, e] = await Promise.all([
        supabase.from('users').select('id,full_name,email').not('email', 'is', null),
        supabase.from('emails').select('*').order('created_at', { ascending: false }).limit(50),
      ])
      setContacts(c.data ?? [])
      setSentEmails(e.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function fetchEmails() {
    const { data } = await supabase.from('emails').select('*').order('created_at', { ascending: false }).limit(50)
    setSentEmails(data ?? [])
  }

  function applyTemplate(t: typeof TEMPLATES[0]) {
    const body = form.to_name
      ? t.body.replace(/\{\{name\}\}/g, form.to_name.split(' ')[0])
      : t.body.replace(/\{\{name\}\}/g, 'there')
    setForm(f => ({ ...f, subject: t.subject, body }))
    setSelectedTemplate(t.name)
  }

  function pickContact(c: Contact) {
    setForm(f => ({
      ...f,
      to_email: c.email ?? '',
      to_name: c.full_name ?? '',
    }))
    setContactSearch(c.full_name ?? c.email ?? '')
    setShowContactDrop(false)
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, template_name: selectedTemplate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSuccess(data.status === 'queued'
        ? 'Email queued — add your Resend API key to send for real.'
        : `Email sent to ${form.to_email}!`)
      setForm({ to_email: '', to_name: '', subject: '', body: '' })
      setContactSearch('')
      setSelectedTemplate(null)
      fetchEmails()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setSending(false)
  }

  const filteredContacts = contacts.filter(c =>
    (c.full_name ?? '').toLowerCase().includes(contactSearch.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(contactSearch.toLowerCase())
  ).slice(0, 8)

  const draftEmails = sentEmails.filter(e => e.status === 'draft')
  const sentCount = sentEmails.filter(e => e.status === 'sent').length
  const queuedCount = sentEmails.filter(e => e.status === 'queued').length
  const failedCount = sentEmails.filter(e => e.status === 'failed').length
  const draftCount = draftEmails.length

  function openDraft(draft: SentEmail) {
    setForm({
      to_email: draft.to_email ?? '',
      to_name: draft.to_name ?? draft.contact_name ?? '',
      subject: draft.subject,
      body: draft.body,
    })
    setContactSearch(draft.to_name ?? draft.contact_name ?? '')
    setSelectedTemplate(draft.template_name)
    // scroll to compose
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteDraft(id: string) {
    await supabase.from('emails').delete().eq('id', id)
    fetchEmails()
  }

  return (
    <div>
      <Header title="Emails" subtitle="Send and manage outreach emails" />
      <div className="p-6 space-y-6">

        {/* Setup notice if no Resend key */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm text-amber-600">
          <strong>Setup:</strong> To send real emails, add <code className="bg-amber-100 px-1 rounded">RESEND_API_KEY</code> and <code className="bg-amber-100 px-1 rounded">RESEND_FROM_EMAIL</code> to your <code className="bg-amber-100 px-1 rounded">.env.local</code>. Until then, emails are saved as <strong>queued</strong>.
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Drafts', value: draftCount, color: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'Sent', value: sentCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Queued', value: queuedCount, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Failed', value: failedCount, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border border-gray-200 ${s.bg} p-4`}>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                {loading ? <span className="animate-pulse bg-gray-100 rounded h-7 w-8 inline-block" /> : s.value}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-500/20 px-4 py-3 text-sm text-red-600 flex justify-between">
            {error}<button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-600 flex justify-between">
            {success}<button onClick={() => setSuccess(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Compose — white form panel */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Send className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-slate-900">Compose Email</h2>
            </div>
            <form onSubmit={sendEmail} className="space-y-3">

              {/* Contact picker */}
              <div className="relative">
                <label className="text-xs font-medium text-slate-500 block mb-1">To</label>
                <input
                  value={contactSearch}
                  onChange={e => { setContactSearch(e.target.value); setShowContactDrop(true) }}
                  onFocus={() => setShowContactDrop(true)}
                  onBlur={() => setTimeout(() => setShowContactDrop(false), 150)}
                  placeholder="Search contact or type email..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700"
                />
                {showContactDrop && filteredContacts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredContacts.map(c => (
                      <button key={c.id} type="button" onMouseDown={() => pickContact(c)}
                        className="w-full text-left px-3 py-2 hover:bg-orange-50 transition-colors">
                        <p className="text-xs font-medium text-slate-800">{c.full_name}</p>
                        <p className="text-xs text-slate-400">{c.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {form.to_email && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100">
                  <Mail className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span className="text-xs text-orange-700">{form.to_name} — {form.to_email}</span>
                  <button type="button" onClick={() => { setForm(f => ({ ...f, to_email: '', to_name: '' })); setContactSearch('') }}
                    className="ml-auto"><X className="h-3 w-3 text-orange-500" /></button>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Subject</label>
                <input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700" />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Message</label>
                <textarea required rows={8} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Write your message..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-slate-700" />
              </div>

              <button type="submit" disabled={sending || !form.to_email}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-slate-900 text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">
                {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send Email</>}
              </button>
            </form>
          </div>

          {/* Templates — dark */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-slate-900">Email Templates</h2>
            </div>
            <div className="space-y-2">
              {TEMPLATES.map(t => (
                <div key={t.name}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedTemplate === t.name
                      ? 'border-orange-500/40 bg-orange-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => applyTemplate(t)}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900">{t.name}</p>
                    <div className="flex gap-1">
                      {t.tags.map(tag => (
                        <span key={tag} className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{t.subject}</p>
                  {selectedTemplate === t.name && (
                    <p className="text-xs text-orange-500 mt-1 font-medium">✓ Applied to compose</p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Click a template to load it into the composer. <code className="bg-gray-100 text-slate-500 px-1 rounded">{'{{name}}'}</code> is auto-replaced.</p>
          </div>
        </div>

        {/* Drafts */}
        {draftEmails.length > 0 && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-sky-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-semibold text-slate-900">Email Drafts</h2>
              <span className="text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full font-medium">{draftCount} pending</span>
              <span className="ml-auto text-xs text-slate-400">Created from Email tasks — click to open in composer</span>
            </div>
            <div className="divide-y divide-sky-100">
              {draftEmails.map(draft => (
                <div key={draft.id} className="flex items-center gap-4 px-5 py-3 hover:bg-sky-50 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{draft.subject}</p>
                    <p className="text-xs text-slate-500">
                      To: <span className="font-medium">{draft.to_name || draft.contact_name || 'Unknown'}</span>
                      {draft.to_email && <span className="text-slate-400"> — {draft.to_email}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">{new Date(draft.created_at).toLocaleDateString()}</span>
                    <button onClick={() => openDraft(draft)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors">
                      <Send className="h-3.5 w-3.5" /> Open to Send
                    </button>
                    <button onClick={() => deleteDraft(draft.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent history */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Email History</h2>
            <span className="ml-auto text-xs text-slate-400">{sentEmails.filter(e => e.status !== 'draft').length} emails</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : sentEmails.filter(e => e.status !== 'draft').length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No emails sent yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sentEmails.filter(e => e.status !== 'draft').map(e => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setPreviewEmail(e)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{e.subject}</p>
                    <p className="text-xs text-slate-500">{e.to_name ? `${e.to_name} — ` : ''}{e.to_email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {e.template_name && (
                      <span className="text-xs text-slate-400 hidden md:block">{e.template_name}</span>
                    )}
                    <div className={`flex items-center gap-1 text-xs font-medium ${statusColor[e.status]}`}>
                      {statusIcon[e.status]}
                      {statusLabel[e.status]}
                    </div>
                    <span className="text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email preview modal */}
        {previewEmail && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPreviewEmail(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{previewEmail.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5">To: {previewEmail.to_name ? `${previewEmail.to_name} <${previewEmail.to_email}>` : previewEmail.to_email}</p>
                </div>
                <button onClick={() => setPreviewEmail(null)}><X className="h-4 w-4 text-slate-400" /></button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-80 overflow-y-auto">
                {previewEmail.body}
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className={`flex items-center gap-1 text-xs font-medium ${statusColor[previewEmail.status]}`}>
                  {statusIcon[previewEmail.status]} {statusLabel[previewEmail.status]}
                </div>
                <span className="text-xs text-slate-400">{new Date(previewEmail.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

