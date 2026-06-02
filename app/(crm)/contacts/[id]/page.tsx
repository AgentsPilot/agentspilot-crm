'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar,
  CheckCircle2, Clock, GitBranch,
  Loader2, Zap, AlertTriangle, DollarSign, Send,
  Users, ArrowRight, Bot, User, Tag, Star, StickyNote,
  CreditCard, Activity, Pencil, Check, X as XIcon, Plus,
} from 'lucide-react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type StageId = 'lead' | 'customer_trial' | 'customer_paid'

type Contact = {
  contact_id:          string
  first_name:          string
  last_name:           string | null
  email:               string
  phone:               string | null
  country:             string | null
  timezone:            string | null
  channel:             string | null
  company:             string | null
  utm_source:          string | null
  utm_medium:          string | null
  utm_campaign:        string | null
  acquisition_type:    string | null
  lead_score:          number | null
  funnel_level:        string | null
  last_activity_at:    string | null
  tags:                string[]
  notes:               string | null
  payment_failed:      boolean
  manual_at_risk_flag: boolean
  activated_at:        string | null
  converted_at:        string | null
  customer_source:     string | null
  stage:               StageId
  state:               string
  plan:                string | null
  mrr:                 number | null
  trial_started_at:    string | null
  trial_expires_at:    string | null
  created_at:          string
  // computed
  full_name: string
}

type TaskStatus = 'open' | 'in_progress' | 'done'

type Task = {
  id: string
  title: string
  type: string
  priority: string
  due_date: string | null
  status: TaskStatus
  notes: string | null
  created_at: string
}

// Stage history row from contact_stages
type StageRow = {
  id:               string
  stage:            StageId
  state:            string
  from_stage:       string | null
  from_state:       string | null
  changed_by:       'system' | 'api' | 'stripe' | 'manual'
  changed_at:       string
  trial_started_at: string | null
  trial_expires_at: string | null
  mrr:              number | null
  plan:             string | null
  notes:            string | null
}

type EmailLog = {
  id:            string
  subject:       string
  body:          string
  status:        string
  template_name: string | null
  created_at:    string
}

type TabId = 'tasks' | 'pipeline' | 'emails'

// ── Stage / state meta ───────────────────────────────────────────────────────

const STAGE_META: Record<StageId, { label: string; bg: string; color: string; border: string; dot: string; icon: React.ElementType }> = {
  lead:           { label: 'Lead',  bg: 'bg-amber-50',   color: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400',   icon: Users       },
  customer_trial: { label: 'Trial', bg: 'bg-blue-50',    color: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500',    icon: Zap         },
  customer_paid:  { label: 'Paid',  bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle2 },
}

const STATE_STYLE: Record<string, { bg: string; text: string }> = {
  new:       { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  contacted: { bg: 'bg-sky-100',     text: 'text-sky-700'     },
  cold:      { bg: 'bg-slate-100',   text: 'text-slate-500'   },
  active:    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  inactive:  { bg: 'bg-orange-100',  text: 'text-orange-700'  },
  expiring:  { bg: 'bg-red-100',     text: 'text-red-600'     },
  expired:   { bg: 'bg-red-100',     text: 'text-red-600'     },
  at_risk:   { bg: 'bg-yellow-100',  text: 'text-yellow-700'  },
  churned:   { bg: 'bg-slate-100',   text: 'text-slate-500'   },
}

function StatePill({ state }: { state: string }) {
  const s = STATE_STYLE[state] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>{state}</span>
}

// ── Task status meta ─────────────────────────────────────────────────────────
const TASK_STATUS_META: Record<TaskStatus, {
  icon: React.ReactNode; label: string; dot: string; badge: string; section: string
}> = {
  open:        { icon: <Clock       className="h-4 w-4 text-amber-500"   />, label: 'Open',        dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700',   section: 'text-amber-600'   },
  in_progress: { icon: <Zap         className="h-4 w-4 text-blue-500"    />, label: 'In Progress', dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700',     section: 'text-blue-600'    },
  done:        { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, label: 'Done',        dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700', section: 'text-emerald-600' },
}

// ── Task type meta ────────────────────────────────────────────────────────────
const TASK_TYPE_META: Record<string, { color: string; bg: string; label: string }> = {
  'Lead Follow-up':    { color: 'text-amber-700',   bg: 'bg-amber-50   border-amber-200',   label: 'Lead Follow-up'    },
  'Trial Activation':  { color: 'text-blue-700',    bg: 'bg-blue-50    border-blue-200',    label: 'Trial Activation'  },
  'Trial Conversion':  { color: 'text-violet-700',  bg: 'bg-violet-50  border-violet-200',  label: 'Trial Conversion'  },
  'Win-back':          { color: 'text-red-700',     bg: 'bg-red-50     border-red-200',     label: 'Win-back'          },
  'Retention':         { color: 'text-orange-700',  bg: 'bg-orange-50  border-orange-200',  label: 'Retention'         },
  'Re-engage':         { color: 'text-slate-700',   bg: 'bg-slate-50   border-slate-200',   label: 'Re-engage'         },
}

const CHANGED_BY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  system: { label: 'Lifecycle automation', icon: Bot,        color: 'text-violet-500' },
  api:    { label: 'API / form submit',     icon: Zap,        color: 'text-blue-500'   },
  stripe: { label: 'Stripe payment',        icon: DollarSign, color: 'text-emerald-600'},
  manual: { label: 'Manual (CRM)',          icon: User,       color: 'text-slate-500'  },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContactDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const router    = useRouter()

  const [contact,      setContact]      = useState<Contact | null>(null)
  const [tasks,        setTasks]        = useState<Task[]>([])
  const [history,      setHistory]      = useState<StageRow[]>([])
  const [emails,       setEmails]       = useState<EmailLog[]>([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState<TabId>('pipeline')
  // Inline edit state
  const [editNotes,    setEditNotes]    = useState(false)
  const [notesVal,     setNotesVal]     = useState('')
  const [editScore,    setEditScore]    = useState(false)
  const [scoreVal,     setScoreVal]     = useState('')
  const [newTag,       setNewTag]       = useState('')
  const [savingField,  setSavingField]  = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: raw } = await supabase
        .from('contacts_current')
        .select('contact_id,first_name,last_name,email,phone,country,timezone,channel,company,utm_source,utm_medium,utm_campaign,acquisition_type,lead_score,funnel_level,last_activity_at,tags,notes,payment_failed,manual_at_risk_flag,activated_at,converted_at,customer_source,stage,state,plan,mrr,trial_started_at,trial_expires_at,created_at')
        .eq('contact_id', id)
        .single()

      if (!raw) { router.push('/contacts'); return }

      const c: Contact = {
        ...raw,
        full_name: [raw.first_name, raw.last_name].filter(Boolean).join(' '),
      } as Contact
      setContact(c)

      const [{ data: t }, { data: h }, { data: e }] = await Promise.all([
        supabase.from('tasks')
          .select('id,title,type,priority,due_date,status,notes,created_at')
          .eq('contact_id', raw.contact_id)
          .order('created_at', { ascending: false }),
        supabase.from('contact_stages')
          .select('id,stage,state,from_stage,from_state,changed_by,changed_at,trial_started_at,trial_expires_at,mrr,plan,notes')
          .eq('contact_id', raw.contact_id)
          .order('changed_at', { ascending: false }),
        supabase.from('emails')
          .select('id,subject,body,status,template_name,created_at')
          .eq('contact_id', raw.contact_id)
          .order('created_at', { ascending: false }),
      ])

      setTasks(t ?? [])
      setHistory(h ?? [])
      setEmails(e ?? [])
      setLoading(false)
    }
    load()
  }, [id, router])

  async function saveField(field: string, value: unknown) {
    if (!contact) return
    setSavingField(field)
    await supabase.from('contacts').update({ [field]: value }).eq('contact_id', contact.contact_id)
    setContact(prev => prev ? { ...prev, [field]: value } : prev)
    setSavingField(null)
  }

  async function addTag(tag: string) {
    if (!contact || !tag.trim()) return
    const trimmed = tag.trim().toLowerCase()
    if (contact.tags.includes(trimmed)) return
    const newTags = [...contact.tags, trimmed]
    await saveField('tags', newTags)
    setNewTag('')
  }

  async function removeTag(tag: string) {
    if (!contact) return
    await saveField('tags', contact.tags.filter(t => t !== tag))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading contact…
      </div>
    )
  }
  if (!contact) return null

  const stageMeta  = STAGE_META[contact.stage]
  const StageIcon  = stageMeta.icon
  const openTasks       = tasks.filter(t => t.status === 'open')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const doneTasks       = tasks.filter(t => t.status === 'done')

  const daysLeft = contact.trial_expires_at
    ? Math.ceil((new Date(contact.trial_expires_at).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div>
      <Header title={contact.full_name} subtitle={contact.email} />
      <div className="p-6 space-y-5">

        {/* ── Status banners ────────────────────────────────────────────────── */}
        {contact.stage === 'customer_paid' && contact.state === 'active' && (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Paying Customer
                {(contact.mrr ?? 0) > 0 && <span className="ml-2 text-emerald-600 font-normal">· MRR ${contact.mrr}/mo</span>}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">Plan: {contact.plan ?? '—'}</p>
            </div>
          </div>
        )}
        {contact.stage === 'customer_paid' && contact.state === 'at_risk' && (
          <div className="flex items-center gap-3 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
            <p className="text-sm font-semibold text-yellow-800">At-Risk Customer — lifecycle will trigger check-in email automatically</p>
          </div>
        )}
        {contact.stage === 'customer_trial' && contact.state === 'expiring' && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-700">Trial expiring in {daysLeft}d — expiry email scheduled automatically</p>
          </div>
        )}
        {contact.stage === 'customer_trial' && contact.state === 'inactive' && (
          <div className="flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <p className="text-sm font-semibold text-orange-700">Trial inactive — activation email scheduled by lifecycle cron</p>
          </div>
        )}
        {contact.payment_failed && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <CreditCard className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-700">Payment failed — Stripe could not charge this customer</p>
          </div>
        )}
        {contact.manual_at_risk_flag && contact.stage === 'customer_paid' && contact.state !== 'at_risk' && (
          <div className="flex items-center gap-3 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
            <p className="text-sm font-semibold text-yellow-700">Manually flagged as at-risk</p>
          </div>
        )}

        {/* Back */}
        <Link href="/contacts"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Contacts
        </Link>

        {/* ── Two-column layout ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left sidebar ─────────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Identity card */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-orange-600">
                    {contact.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{contact.full_name}</p>
                  {contact.company && <p className="text-xs text-slate-400 truncate">{contact.company}</p>}
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { icon: Mail,   value: contact.email   },
                  { icon: Phone,  value: contact.phone   },
                  { icon: MapPin, value: contact.country },
                ].map((row, i) => row.value && (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <row.icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current stage card */}
            <div className={`rounded-xl border-2 p-4 ${stageMeta.bg} ${stageMeta.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${stageMeta.bg}`}>
                  <StageIcon className={`h-4 w-4 ${stageMeta.color}`} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${stageMeta.color}`}>{stageMeta.label}</p>
                  <StatePill state={contact.state} />
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                {contact.stage === 'customer_trial' && (
                  <>
                    {contact.trial_started_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Trial started</span>
                        <span className="text-slate-700 font-medium">{new Date(contact.trial_started_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {contact.trial_expires_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Trial ends</span>
                        <span className={`font-semibold ${daysLeft != null && daysLeft <= 3 ? 'text-red-600' : 'text-slate-700'}`}>
                          {new Date(contact.trial_expires_at).toLocaleDateString()}
                          {daysLeft != null && daysLeft > 0 ? ` (${daysLeft}d left)` : daysLeft != null && daysLeft <= 0 ? ' (expired)' : ''}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {contact.stage === 'customer_paid' && (
                  <>
                    {contact.plan && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plan</span>
                        <span className="text-slate-700 font-medium capitalize">{contact.plan}</span>
                      </div>
                    )}
                    {(contact.mrr ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 flex items-center gap-1"><DollarSign className="h-3 w-3" />MRR</span>
                        <span className="font-semibold text-emerald-600">${contact.mrr}/mo</span>
                      </div>
                    )}
                  </>
                )}
                {contact.activated_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Activated</span>
                    <span className="text-slate-700">{new Date(contact.activated_at).toLocaleDateString()}</span>
                  </div>
                )}
                {contact.converted_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Converted</span>
                    <span className="text-slate-700">{new Date(contact.converted_at).toLocaleDateString()}</span>
                  </div>
                )}
                {contact.customer_source && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source</span>
                    <span className="text-slate-700 capitalize">{contact.customer_source}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-white/50">
                  <span className="text-slate-500">Contact since</span>
                  <span className="text-slate-700">{new Date(contact.created_at).toLocaleDateString()}</span>
                </div>
                {history.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Days in stage</span>
                    <span className="font-semibold text-slate-700">
                      {Math.floor((Date.now() - new Date(history[0].changed_at).getTime()) / 86400000)}d
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Acquisition */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Acquisition
              </p>
              <div className="space-y-2 text-xs">
                {/* Acquisition type badge */}
                {contact.acquisition_type && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Acquisition</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-xs ${
                      contact.acquisition_type === 'lead_nurtured'
                        ? 'bg-amber-50 text-amber-700'
                        : contact.acquisition_type === 'direct_trial'
                        ? 'bg-sky-50 text-sky-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {contact.acquisition_type === 'lead_nurtured'  ? '🌱 Lead nurtured' :
                       contact.acquisition_type === 'direct_trial'   ? '⚡ Direct trial'  :
                       contact.acquisition_type === 'direct_paid'    ? '💳 Direct paid'   :
                       contact.acquisition_type}
                    </span>
                  </div>
                )}
                {[
                  { label: 'Channel',      value: contact.channel      },
                  { label: 'UTM Source',   value: contact.utm_source   },
                  { label: 'UTM Medium',   value: contact.utm_medium   },
                  { label: 'UTM Campaign', value: contact.utm_campaign },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-slate-400">{r.label}</span>
                    <span className="text-slate-700 font-medium truncate max-w-[140px]">{r.value}</span>
                  </div>
                ))}
                {![contact.acquisition_type, contact.channel, contact.utm_source, contact.utm_medium, contact.utm_campaign].some(Boolean) && (
                  <p className="text-slate-300 text-center py-2">No acquisition data</p>
                )}
              </div>
            </div>

            {/* Lead Score */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" /> Lead Score
                </p>
                {!editScore && (
                  <button onClick={() => { setEditScore(true); setScoreVal(String(contact.lead_score ?? '')) }}
                    className="text-slate-300 hover:text-orange-500 transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {editScore ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={100}
                    value={scoreVal}
                    onChange={e => setScoreVal(e.target.value)}
                    placeholder="0–100"
                    className="w-20 px-2 py-1 text-sm border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    onClick={async () => {
                      const n = parseInt(scoreVal)
                      if (!isNaN(n) && n >= 0 && n <= 100) await saveField('lead_score', n)
                      setEditScore(false)
                    }}
                    className="p-1 rounded text-emerald-600 hover:bg-emerald-50">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditScore(false)} className="p-1 rounded text-slate-400 hover:bg-gray-100">
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : contact.lead_score !== null ? (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xl font-bold ${contact.lead_score >= 70 ? 'text-emerald-600' : contact.lead_score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                      {contact.lead_score}<span className="text-xs text-slate-400 font-normal">/100</span>
                    </span>
                    <span className="text-xs text-slate-400">{contact.lead_score >= 70 ? 'Hot' : contact.lead_score >= 40 ? 'Warm' : 'Cold'}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${contact.lead_score >= 70 ? 'bg-emerald-400' : contact.lead_score >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${contact.lead_score}%` }} />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-300 italic">Not set — click ✏️ to score this lead</p>
              )}
              {contact.funnel_level && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Activity className="h-3 w-3" /> Funnel level</span>
                  <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{contact.funnel_level}</span>
                </div>
              )}
              {contact.last_activity_at && (
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-xs text-slate-400">Last active</span>
                  <span className="text-xs text-slate-600">{new Date(contact.last_activity_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Tags
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {contact.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium group">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
                      <XIcon className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                {contact.tags.length === 0 && <span className="text-xs text-slate-300 italic">No tags yet</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text" placeholder="Add tag…" value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag(newTag)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700"
                />
                <button onClick={() => addTag(newTag)}
                  className="p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </p>
                {!editNotes && (
                  <button onClick={() => { setEditNotes(true); setNotesVal(contact.notes ?? '') }}
                    className="text-slate-300 hover:text-orange-500 transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {editNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notesVal} onChange={e => setNotesVal(e.target.value)}
                    rows={4} placeholder="Add notes about this contact…"
                    className="w-full px-3 py-2 text-xs border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditNotes(false)} className="px-3 py-1 text-xs text-slate-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button
                      onClick={async () => { await saveField('notes', notesVal || null); setEditNotes(false) }}
                      disabled={savingField === 'notes'}
                      className="px-3 py-1 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                      {savingField === 'notes' ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : contact.notes ? (
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
              ) : (
                <p className="text-xs text-slate-300 italic">No notes — click ✏️ to add</p>
              )}
            </div>

            {/* Activity summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Activity</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Tasks',    value: tasks.length,   color: 'text-slate-800' },
                  { label: 'Open',  value: openTasks.length, color: openTasks.length > 0 ? 'text-amber-600' : 'text-slate-400' },
                  { label: 'Emails',   value: emails.length,  color: 'text-slate-800' },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-slate-50 py-2">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Right: Tabs ──────────────────────────────────────────────────── */}
          <div id="tabs" className="lg:col-span-2 space-y-4">

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-gray-200">
              {([
                { id: 'tasks'    as TabId, label: `Tasks`,    count: tasks.length,   icon: CheckCircle2 },
                { id: 'pipeline' as TabId, label: `Timeline`, count: history.length, icon: GitBranch    },
                { id: 'emails'   as TabId, label: `Emails`,   count: emails.length,  icon: Mail         },
              ]).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    tab === t.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}>
                  <t.icon className="h-4 w-4" />
                  {t.label}
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${tab === t.id ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-slate-500'}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                TASKS TAB
                Auto-created by lifecycle cron per contact state
            ══════════════════════════════════════════════════════════════ */}
            {tab === 'tasks' && (
              <div className="space-y-5">

                {tasks.length === 0 ? (
                  <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Bot className="h-8 w-8 mx-auto mb-3 text-slate-200" />
                    <p className="text-sm font-medium text-slate-500">No tasks yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Tasks are created automatically by the lifecycle engine when this contact enters a new state
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Open */}
                    {openTasks.length > 0 && (
                      <TaskSection label="Open" count={openTasks.length} status="open" tasks={openTasks} />
                    )}
                    {/* In Progress */}
                    {inProgressTasks.length > 0 && (
                      <TaskSection label="In Progress" count={inProgressTasks.length} status="in_progress" tasks={inProgressTasks} />
                    )}
                    {/* Done */}
                    {doneTasks.length > 0 && (
                      <TaskSection label="Done" count={doneTasks.length} status="done" tasks={doneTasks} dim />
                    )}

                    <p className="text-xs text-slate-300 text-center flex items-center justify-center gap-1 pt-1">
                      <Bot className="h-3 w-3" /> All tasks are auto-generated by the lifecycle engine
                    </p>
                  </>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                PIPELINE / TIMELINE TAB
                Full stage history + aging statistics
            ══════════════════════════════════════════════════════════════ */}
            {tab === 'pipeline' && (() => {
              // Sort ascending for age calculations
              const asc  = [...history].sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())
              const now  = Date.now()

              // Days spent in each state: time until next transition (or now for current)
              const daysInState = (idx: number /* index in asc array */) => {
                const from = new Date(asc[idx].changed_at).getTime()
                const to   = idx < asc.length - 1 ? new Date(asc[idx + 1].changed_at).getTime() : now
                return Math.max(0, Math.floor((to - from) / 86400000))
              }

              // Build a lookup: stageRow.id → daysSpent
              const daysMap: Record<string, number> = {}
              asc.forEach((row, i) => { daysMap[row.id] = daysInState(i) })

              // Summary stats
              const totalDays    = asc.length > 0 ? Math.floor((now - new Date(asc[0].changed_at).getTime()) / 86400000) : 0
              const currentDays  = history.length > 0 ? daysMap[history[0].id] : 0
              const longestState = asc.reduce<{ state: string; days: number } | null>((best, row) => {
                const d = daysMap[row.id]
                return !best || d > best.days ? { state: row.state, days: d } : best
              }, null)

              return (
                <div className="space-y-3">

                  {/* ── Stats bar ── */}
                  {history.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Total in funnel', value: `${totalDays}d`,   sub: `since ${new Date(asc[0].changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, color: 'text-slate-800' },
                        { label: 'In current state', value: `${currentDays}d`, sub: history[0]?.state,  color: currentDays >= 14 ? 'text-red-600' : currentDays >= 7 ? 'text-amber-600' : 'text-blue-600' },
                        { label: 'Longest state',    value: longestState ? `${longestState.days}d` : '—', sub: longestState?.state ?? '—', color: 'text-slate-700' },
                      ].map(s => (
                        <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center">
                          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{s.sub}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Route */}
                  <div className="rounded-xl bg-slate-50 border border-gray-200 px-4 py-2.5 flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Lead</span>
                      <ArrowRight className="h-3 w-3 text-slate-300" />
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Trial</span>
                      <ArrowRight className="h-3 w-3 text-slate-300" />
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Paid</span>
                    </div>
                    <span className="text-xs text-slate-400 ml-auto">{history.length} transitions</span>
                  </div>

                  {history.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-gray-200">
                      No stage history yet
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-5 top-4 bottom-4 w-px bg-gray-200 z-0" />
                      <div className="space-y-3 relative z-10">
                        {history.map((row, idx) => {
                          const sm      = STAGE_META[row.stage]
                          const Icon    = sm.icon
                          const cb      = CHANGED_BY_META[row.changed_by] ?? CHANGED_BY_META.manual
                          const CbIcon  = cb.icon
                          const isCurrent = idx === 0
                          const days    = daysMap[row.id] ?? 0
                          const ageWarn = days >= 14 ? 'text-red-600' : days >= 7 ? 'text-amber-600' : 'text-slate-500'

                          return (
                            <div key={row.id} className="flex gap-4 items-start">
                              {/* Dot */}
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border-2 ${sm.bg} ${sm.border} ${isCurrent ? 'ring-2 ring-offset-1 ring-orange-400' : ''}`}>
                                <Icon className={`h-4 w-4 ${sm.color}`} />
                              </div>

                              {/* Card */}
                              <div className={`flex-1 rounded-xl border p-4 ${isCurrent ? `${sm.bg} ${sm.border}` : 'bg-white border-gray-200'}`}>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-sm font-bold ${sm.color}`}>{sm.label}</span>
                                    <StatePill state={row.state} />
                                    {isCurrent && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-semibold">Current</span>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {/* Aging badge */}
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                      isCurrent
                                        ? days >= 14 ? 'bg-red-50 text-red-600' : days >= 7 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {isCurrent ? `${days}d here` : `${days}d`}
                                    </span>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">
                                      {new Date(row.changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                </div>

                                {/* Transition */}
                                {row.from_state && (
                                  <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                                    <span className="font-medium text-slate-500">{row.from_state}</span>
                                    <ArrowRight className="h-3 w-3 shrink-0" />
                                    <span className={`font-semibold ${sm.color}`}>{row.state}</span>
                                  </div>
                                )}

                                {/* Changed-by */}
                                <div className={`flex items-center gap-1 text-xs ${cb.color}`}>
                                  <CbIcon className="h-3 w-3" />
                                  {cb.label}
                                </div>

                                {/* Extra fields */}
                                {(row.trial_started_at || row.trial_expires_at || row.plan || (row.mrr ?? 0) > 0) && (
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-xs">
                                    {row.trial_started_at && (
                                      <div className="flex justify-between"><span className="text-slate-400">Trial start</span><span className="text-slate-600">{new Date(row.trial_started_at).toLocaleDateString()}</span></div>
                                    )}
                                    {row.trial_expires_at && (
                                      <div className="flex justify-between"><span className="text-slate-400">Trial end</span><span className="text-slate-600">{new Date(row.trial_expires_at).toLocaleDateString()}</span></div>
                                    )}
                                    {row.plan && (
                                      <div className="flex justify-between"><span className="text-slate-400">Plan</span><span className="text-slate-600 capitalize">{row.plan}</span></div>
                                    )}
                                    {(row.mrr ?? 0) > 0 && (
                                      <div className="flex justify-between"><span className="text-slate-400">MRR</span><span className="text-emerald-600 font-semibold">${row.mrr}/mo</span></div>
                                    )}
                                  </div>
                                )}

                                {row.notes && (
                                  <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-gray-100 italic">{row.notes}</p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ══════════════════════════════════════════════════════════════
                EMAILS TAB
                Campaign & lifecycle emails sent to this contact
            ══════════════════════════════════════════════════════════════ */}
            {tab === 'emails' && (
              <div className="space-y-3">

                {emails.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-gray-200">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                    <p className="text-sm">No emails sent yet</p>
                    <p className="text-xs mt-1">Lifecycle emails are sent automatically when this contact changes state</p>
                  </div>
                ) : emails.map(email => {
                  const statusStyle =
                    email.status === 'sent'   ? { bg: 'bg-emerald-100', text: 'text-emerald-700' } :
                    email.status === 'queued' ? { bg: 'bg-amber-100',   text: 'text-amber-700'   } :
                    email.status === 'draft'  ? { bg: 'bg-sky-100',     text: 'text-sky-700'     } :
                                                { bg: 'bg-red-100',     text: 'text-red-600'     }
                  return (
                    <div key={email.id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Send className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <p className="text-sm font-medium text-slate-900 truncate">{email.subject}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {email.status}
                          </span>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {new Date(email.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {email.template_name && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Bot className="h-3 w-3 text-violet-400" />
                          <span className="text-xs text-violet-600 font-medium">{email.template_name}</span>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 pl-5">
                        {email.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

// ── TaskSection ───────────────────────────────────────────────────────────────

function TaskSection({ label, count, status, tasks, dim }: {
  label: string; count: number; status: TaskStatus; tasks: Task[]; dim?: boolean
}) {
  const meta = TASK_STATUS_META[status]
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
        <p className={`text-xs font-semibold uppercase tracking-wide ${meta.section}`}>{label}</p>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${meta.badge}`}>{count}</span>
      </div>
      <div className={`space-y-2 ${dim ? 'opacity-50' : ''}`}>
        {tasks.map(task => <TaskCard key={task.id} task={task} />)}
      </div>
    </div>
  )
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: Task }) {
  const typeMeta   = TASK_TYPE_META[task.type] ?? { color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', label: task.type }
  const statusMeta = TASK_STATUS_META[task.status] ?? TASK_STATUS_META.open
  const isDone     = task.status === 'done'

  return (
    <div className={`rounded-xl border bg-white flex overflow-hidden`}>
      {/* Left accent bar by task type */}
      <div className={`w-1 shrink-0 rounded-l-xl ${
        task.type === 'Lead Follow-up'   ? 'bg-amber-400'  :
        task.type === 'Trial Activation' ? 'bg-blue-400'   :
        task.type === 'Trial Conversion' ? 'bg-violet-400' :
        task.type === 'Win-back'         ? 'bg-red-400'    :
        task.type === 'Retention'        ? 'bg-orange-400' :
        task.type === 'Re-engage'        ? 'bg-slate-300'  : 'bg-gray-200'
      }`} />

      <div className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0">
        {/* Status icon */}
        <div className="mt-0.5 shrink-0">{statusMeta.icon}</div>

        <div className="flex-1 min-w-0">
          {/* Title + type badge */}
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {task.title}
            </p>
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${typeMeta.bg} ${typeMeta.color}`}>
              {typeMeta.label}
            </span>
          </div>

          {/* Due date + status */}
          <div className="flex items-center gap-3 mt-1.5 text-xs">
            {task.due_date && (
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="h-3 w-3" />
                Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full font-medium ${statusMeta.badge}`}>
              {statusMeta.label}
            </span>
          </div>

          {task.notes && (
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{task.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}
