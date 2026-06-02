'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import {
  UserPlus, Clock, AlertTriangle, XCircle, Flame, RotateCcw,
  Mail, CheckCircle2, Loader2, Snowflake,
} from 'lucide-react'

const RULES = [
  { id: 'new_lead_followup',       label: 'New Lead → 24h Follow-up (task → In Progress)',  icon: UserPlus,      color: 'text-amber-600',  bg: 'bg-amber-50'  },
  { id: 'lead_reminder_7d',        label: 'Lead No Response — 7-day Reminder Email',        icon: Mail,          color: 'text-sky-600',    bg: 'bg-sky-50'    },
  { id: 'lead_reminder_21d',       label: 'Lead No Response — 21-day Final Reminder',       icon: Mail,          color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'lead_cold_30d',           label: 'Lead Cold — 30 days, no trial signup',           icon: Snowflake,     color: 'text-slate-500',  bg: 'bg-slate-50'  },
  { id: 'trial_signup_welcome',    label: 'Trial Day 0 → Welcome Email',                   icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50'  },
  { id: 'trial_day1',              label: 'Trial Day 1 → Get Started Tips Email',           icon: Mail,          color: 'text-green-600',  bg: 'bg-green-50'  },
  { id: 'trial_day3',              label: 'Trial Day 3 → Feature Spotlight / Use Case',     icon: Mail,          color: 'text-teal-600',   bg: 'bg-teal-50'   },
  { id: 'trial_no_activation_3d',  label: 'Trial Day 3 — No Activation → Mark Inactive',   icon: Clock,         color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'trial_midpoint_7d',       label: 'Trial Day 7 → Mid-point Check-in + Demo Offer', icon: Mail,          color: 'text-sky-600',    bg: 'bg-sky-50'    },
  { id: 'trial_inactive_2d',       label: 'Trial Inactive → Activation Nudge Email',        icon: Clock,         color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'trial_expiring_3d',       label: 'Trial Day 11 → Expiring in 3 Days Warning',      icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50'    },
  { id: 'trial_expired',           label: 'Trial Expired → Win-back Email',                 icon: XCircle,       color: 'text-red-700',    bg: 'bg-red-50'    },
  { id: 'at_risk_alert',           label: 'At-Risk Customer → Check-in Email',              icon: Flame,         color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { id: 'churned_winback',         label: 'Churned → Win-back Sequence',                    icon: RotateCcw,     color: 'text-slate-500',  bg: 'bg-slate-50'  },
]

type RuleSetting = { rule_id: string; enabled: boolean; last_run_at: string | null; last_run_count: number }

function fmtRel(ts: string | null) {
  if (!ts) return null
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 60)   return m + 'm ago'
  if (m < 1440) return Math.floor(m / 60) + 'h ago'
  return Math.floor(m / 1440) + 'd ago'
}

export default function RulesPage() {
  const [settings, setSettings] = useState<Record<string, RuleSetting>>({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)

  useEffect(() => {
    supabase.from('automation_settings').select('*').then(({ data }) => {
      const map: Record<string, RuleSetting> = {}
      RULES.forEach(r => { map[r.id] = { rule_id: r.id, enabled: true, last_run_at: null, last_run_count: 0 } })
      data?.forEach((row: RuleSetting) => { map[row.rule_id] = row })
      setSettings(map)
      setLoading(false)
    })
  }, [])

  async function toggle(ruleId: string) {
    const next = !settings[ruleId]?.enabled
    setSaving(ruleId)
    setSettings(prev => ({ ...prev, [ruleId]: { ...prev[ruleId], enabled: next } }))
    await supabase.from('automation_settings').upsert({ rule_id: ruleId, enabled: next }, { onConflict: 'rule_id' })
    setSaving(null)
  }

  return (
    <div>
      <Header title="Rules" subtitle="Enable or disable automation rules for each lifecycle stage" />
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin h-6 w-6 text-orange-500" />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
            {RULES.map(rule => {
              const Icon    = rule.icon
              const setting = settings[rule.id] ?? { enabled: true, last_run_at: null, last_run_count: 0 }
              const lastRun = fmtRel(setting.last_run_at)
              return (
                <div key={rule.id} className="px-5 py-4 flex items-center gap-4">
                  <div className={['h-8 w-8 rounded-lg flex items-center justify-center shrink-0', rule.bg].join(' ')}>
                    <Icon className={['h-4 w-4', rule.color].join(' ')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{rule.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lastRun
                        ? <>Last run {lastRun}{setting.last_run_count > 0 && <> · {setting.last_run_count} contacts</>}</>
                        : 'Never triggered yet'
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => toggle(rule.id)}
                    disabled={saving === rule.id || loading}
                    className={[
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0',
                      setting.enabled ? 'bg-orange-500' : 'bg-gray-200',
                      saving === rule.id ? 'opacity-50' : '',
                    ].join(' ')}
                  >
                    {saving === rule.id
                      ? <Loader2 className="h-3 w-3 animate-spin text-white absolute left-1" />
                      : <span className={['inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', setting.enabled ? 'translate-x-4' : 'translate-x-0.5'].join(' ')} />
                    }
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
