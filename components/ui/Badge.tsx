type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'indigo'

interface BadgeProps {
  label: string
  variant?: Variant
}

const styles: Record<Variant, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 ring-amber-500/20',
  danger: 'bg-red-500/15 text-red-400 ring-red-500/20',
  info: 'bg-sky-500/15 text-sky-400 ring-sky-500/20',
  neutral: 'bg-zinc-700/50 text-zinc-400 ring-zinc-600/30',
  indigo: 'bg-orange-500/15 text-orange-400 ring-orange-500/20',
}

export default function Badge({ label, variant = 'neutral' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[variant]}`}>
      {label}
    </span>
  )
}
