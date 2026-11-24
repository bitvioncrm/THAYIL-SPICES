import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'default',
  className,
}: {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  accent?: 'default' | 'emerald' | 'gold' | 'forest'
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] p-4 shadow-soft transition-colors dark:border-line dark:bg-surface',
        className,
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          accent === 'emerald' && 'bg-emerald',
          accent === 'gold' && 'bg-gold',
          accent === 'forest' && 'bg-forest',
          accent === 'default' && 'bg-spice-light',
        )}
      />
      <div className="flex items-start justify-between gap-2 pl-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-soft">{label}</p>
        {Icon && (
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
              accent === 'gold' && 'bg-gold/15 text-forest',
              accent === 'emerald' && 'bg-emerald/10 text-emerald',
              accent === 'forest' && 'bg-forest/10 text-forest',
              accent === 'default' && 'bg-spice-soft/40 text-spice',
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-1.5 pl-2 font-display text-xl font-semibold tabular-nums tracking-tight text-forest dark:text-gold sm:text-2xl">
        {value}
      </p>
      {hint && <p className="mt-1 pl-2 text-xs text-soft">{hint}</p>}
    </div>
  )
}
