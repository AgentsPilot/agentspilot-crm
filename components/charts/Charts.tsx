'use client'
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend,
  XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { weeklyPerformance, channelPerformance, budgetData, funnelData, channelBudget } from '@/lib/mock-data'

const COLORS = {
  indigo: '#6366F1',
  sky: '#0EA5E9',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',
  violet: '#8B5CF6',
}

const fmt = (v: unknown) => Number(v)
const fmtMoney = (v: unknown) => `$${fmt(v).toLocaleString()}`

// ─── Performance Line Chart (CR + Leads over 12 weeks) ───────────────────────
export function PerformanceLineChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={weeklyPerformance} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.15} />
            <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="leads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.15} />
            <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
          formatter={(value, name) =>
            name === 'cr'
              ? [`${fmt(value)}%`, 'CR Rate']
              : [fmt(value).toLocaleString(), name === 'leads' ? 'Leads' : String(name)]
          }
        />
        <Legend formatter={(value) => value === 'cr' ? 'CR Rate' : value === 'leads' ? 'Leads' : value} />
        <Area yAxisId="left" type="monotone" dataKey="cr" stroke={COLORS.indigo} strokeWidth={2} fill="url(#cr)" dot={false} />
        <Area yAxisId="right" type="monotone" dataKey="leads" stroke={COLORS.emerald} strokeWidth={2} fill="url(#leads)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── CPL Trend Chart ──────────────────────────────────────────────────────────
export function CplLineChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={weeklyPerformance} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[30, 60]} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
          formatter={(v) => [`$${fmt(v)}`, 'CPL']} />
        <Line type="monotone" dataKey="cpl" stroke={COLORS.amber} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Channel Bar Chart ────────────────────────────────────────────────────────
export function ChannelBarChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={channelPerformance} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
        <Legend />
        <Bar dataKey="leads" name="Leads" fill={COLORS.indigo} radius={[4, 4, 0, 0]} />
        <Bar dataKey="conversions" name="Conversions" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Budget Donut Chart ───────────────────────────────────────────────────────
const DONUT_COLORS = [COLORS.indigo, COLORS.sky, COLORS.rose, COLORS.amber, COLORS.emerald]

export function BudgetDonutChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={channelBudget}
          dataKey="spent"
          nameKey="channel"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={100}
          paddingAngle={3}
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {channelBudget.map((_, i) => (
            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
          formatter={(v) => [fmtMoney(v), 'Spent']}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Budget vs Revenue Bar Chart ──────────────────────────────────────────────
export function BudgetRevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={budgetData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
          formatter={(v) => [fmtMoney(v)]}
        />
        <Legend />
        <Bar dataKey="allocated" name="Allocated" fill="#E0E7FF" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spent" name="Spent" fill={COLORS.indigo} radius={[4, 4, 0, 0]} />
        <Bar dataKey="revenue" name="Revenue" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Cohort CR Chart ──────────────────────────────────────────────────────────
export function CohortCrChart({ data }: { data: typeof weeklyPerformance }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cohortCr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.violet} stopOpacity={0.2} />
            <stop offset="95%" stopColor={COLORS.violet} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
          formatter={(v) => [`${fmt(v)}%`, 'CR']} />
        <Area type="monotone" dataKey="cr" stroke={COLORS.violet} strokeWidth={2} fill="url(#cohortCr)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── ROI Bar Chart ────────────────────────────────────────────────────────────
export function RoiChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={budgetData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v}%`} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
          formatter={(v) => [`${fmt(v)}%`, 'ROI']} />
        <Bar dataKey="roi" name="ROI %" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Funnel Visualisation (custom, not recharts) ──────────────────────────────
export function FunnelViz({ data }: { data: typeof funnelData }) {
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.level} className="flex items-center gap-3">
          <span className="w-28 text-xs text-slate-500 text-right shrink-0">{item.level}</span>
          <div className="flex-1 relative h-8 rounded overflow-hidden bg-slate-100">
            <div
              className="h-full rounded flex items-center pl-3 transition-all duration-700"
              style={{ width: `${item.pct}%`, backgroundColor: item.color }}
            >
              <span className="text-xs font-semibold text-white whitespace-nowrap">
                {item.count.toLocaleString()}
              </span>
            </div>
          </div>
          <span className="w-12 text-xs font-medium text-slate-500 shrink-0">{item.pct}%</span>
        </div>
      ))}
    </div>
  )
}
