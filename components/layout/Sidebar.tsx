'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, GitBranch, CheckSquare,
  Megaphone, Mail, BarChart2, Settings, ChevronRight, Bell, Share2,
  TrendingUp, DollarSign, BookOpen, CalendarCheck, ListTodo, Anchor,
  ChevronDown, Briefcase, Zap, FlaskConical,
} from 'lucide-react'

const MARKETING_SUB = [
  { label: 'Post Tracker',     href: '/post-tracker',     icon: CalendarCheck },
  { label: 'Posts Library',    href: '/posts-library',    icon: BookOpen },
  { label: 'Hooks Library',    href: '/hooks-library',    icon: Anchor },
  { label: 'Weekly Checklist', href: '/weekly-checklist', icon: ListTodo },
  { label: 'Cohort',           href: '/cohort',           icon: TrendingUp },
  { label: 'Budget',           href: '/budget',           icon: DollarSign },
  { label: 'Analytics',        href: '/analytics',        icon: BarChart2 },
]

const MARKETING_HREFS = MARKETING_SUB.map(s => s.href)
const SOCIAL_HREFS    = ['/social', ...MARKETING_HREFS]

const nav = [
  {
    section: 'CRM',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Contacts',  href: '/contacts',  icon: Users },
      { label: 'Lifecycle', href: '/pipeline',  icon: GitBranch },
      { label: 'Tasks',     href: '/tasks',     icon: CheckSquare },
      { label: 'Alarms',    href: '/alarms',    icon: Bell },
    ],
  },
  {
    section: 'Acquisition',
    items: [
      { label: 'Campaigns', href: '/campaigns', icon: Megaphone },
    ],
  },
  {
    section: 'Communication',
    items: [
      { label: 'Emails', href: '/emails', icon: Mail },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart2 },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const isSocialActive = SOCIAL_HREFS.includes(pathname)

  const SETTINGS_HREFS = ['/email-preview', '/settings/rules', '/settings/demo']
  const isSettingsActive = SETTINGS_HREFS.includes(pathname) || pathname === '/settings'

  const [socialOpen,   setSocialOpen]   = useState(isSocialActive)
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive)

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0a0a0a] border-r border-[#222]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-[#222]">
        <div className="flex h-8 w-8 items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
            <polygon points="4,2 20,12 4,22" fill="#f97316" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-wide">
            AGENTS <span className="text-orange-500">PILOT</span>
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">CRM</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {nav.map(({ section, items }) => (
          <div key={section}>
            <p className="px-3 mb-1.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
              {section}
            </p>
            <div className="space-y-0.5">
              {items.map(({ label, href, icon: Icon, admin }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? 'bg-orange-500 text-white'
                        : 'text-zinc-400 hover:bg-orange-500/10 hover:text-orange-400'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {admin && !active && (
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-medium">Admin</span>
                    )}
                    {active && <ChevronRight className="h-3 w-3 opacity-60" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* ── Admin / Social Manager ── */}
        <div>
          <p className="px-3 mb-1.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider">Admin</p>
          <div className="space-y-0.5">

            {/* Social Manager toggle */}
            <button
              onClick={() => setSocialOpen(v => !v)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isSocialActive
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-zinc-400 hover:bg-orange-500/10 hover:text-orange-400'
              }`}
            >
              <Share2 className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Social Manager</span>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-medium mr-1">Admin</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${socialOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Social Manager sub-items */}
            {socialOpen && (
              <div className="ml-3 pl-3 border-l border-zinc-800 space-y-0.5 mt-0.5">

                {/* Campaign Manager */}
                <Link
                  href="/social"
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    pathname === '/social'
                      ? 'bg-orange-500 text-white'
                      : 'text-zinc-500 hover:bg-orange-500/10 hover:text-orange-400'
                  }`}
                >
                  <Share2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">Campaign Manager</span>
                  {pathname === '/social' && <ChevronRight className="h-3 w-3 opacity-60" />}
                </Link>

                {/* Marketing Manager — always visible when Social is open */}
                <p className="px-3 pt-2 pb-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3" /> Marketing
                </p>
                {MARKETING_SUB.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        active
                          ? 'bg-orange-500 text-white'
                          : 'text-zinc-500 hover:bg-orange-500/10 hover:text-orange-400'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {active && <ChevronRight className="h-3 w-3 opacity-60" />}
                    </Link>
                  )
                })}

              </div>
            )}

          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-[#222] px-3 py-3 space-y-0.5">

        {/* Settings toggle */}
        <button
          onClick={() => setSettingsOpen(v => !v)}
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            isSettingsActive
              ? 'bg-orange-500/10 text-orange-400'
              : 'text-zinc-500 hover:bg-orange-500/10 hover:text-orange-400'
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Settings</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Settings sub-items */}
        {settingsOpen && (
          <div className="ml-3 pl-3 border-l border-zinc-800 space-y-0.5 mt-0.5">
            <Link
              href="/email-preview"
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                pathname === '/email-preview'
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-500 hover:bg-orange-500/10 hover:text-orange-400'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">Email Templates</span>
              {pathname === '/email-preview' && <ChevronRight className="h-3 w-3 opacity-60" />}
            </Link>
            <Link
              href="/settings/rules"
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                pathname === '/settings/rules'
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-500 hover:bg-orange-500/10 hover:text-orange-400'
              }`}
            >
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">Rules</span>
              {pathname === '/settings/rules' && <ChevronRight className="h-3 w-3 opacity-60" />}
            </Link>
            <Link
              href="/settings/demo"
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                pathname === '/settings/demo'
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-500 hover:bg-orange-500/10 hover:text-orange-400'
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">E2E Demo</span>
              {pathname === '/settings/demo' && <ChevronRight className="h-3 w-3 opacity-60" />}
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <div className="h-7 w-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">Admin</p>
            <p className="text-xs text-zinc-600 truncate">agentspilot.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
