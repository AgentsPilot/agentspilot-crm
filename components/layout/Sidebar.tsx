'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Target, DollarSign, Calendar,
  BookImage, Zap, CheckSquare, GitBranch, BarChart2,
  Settings, ChevronRight, Rocket,
} from 'lucide-react'

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Cohort Program', href: '/cohort', icon: Target },
  { label: 'Budget & Revenue', href: '/budget', icon: DollarSign },
  { label: 'Post Tracker', href: '/post-tracker', icon: Calendar },
  { label: 'Posts Library', href: '/posts-library', icon: BookImage },
  { label: 'Hooks Library', href: '/hooks-library', icon: Zap },
  { label: 'Weekly Checklist', href: '/weekly-checklist', icon: CheckSquare },
  { label: 'Lead Pipeline', href: '/pipeline', icon: GitBranch },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Rocket className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">AgentsPilot</p>
          <p className="text-xs text-slate-400 mt-0.5">CRM Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Settings + user */}
      <div className="border-t border-slate-800 px-3 py-3 space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">Admin</p>
            <p className="text-xs text-slate-500 truncate">agentspilot.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
