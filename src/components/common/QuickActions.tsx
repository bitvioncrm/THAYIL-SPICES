import { Link } from 'react-router-dom'
import { Plus, Receipt, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const actions = [
  {
    to: '/farmers',
    label: 'Add daily entry',
    icon: Plus,
    tone: 'primary' as const,
  },
  {
    to: '/farmers',
    label: 'View farmers',
    icon: Users,
    tone: 'secondary' as const,
  },
  {
    to: '/billing',
    label: 'Create bill',
    icon: Receipt,
    tone: 'gold' as const,
  },
]

const toneClass = {
  primary: 'bg-forest text-white hover:bg-[#163226] shadow-[0_8px_20px_rgba(27,60,45,0.22)]',
  secondary:
    'border border-[#D7E0D4] bg-[#F7F4EC] text-forest hover:bg-white dark:border-line dark:bg-surface dark:text-gold',
  gold: 'bg-gradient-to-b from-[#D4B56E] to-gold text-forest hover:brightness-105 shadow-[0_8px_18px_rgba(198,164,92,0.28)]',
}

/** Mockup-style quick action strip used on main pages. */
export function QuickActions({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'sticky bottom-20 z-20 -mx-1 rounded-2xl border border-[#D9E2D6] bg-[#FBF8F1]/95 p-2 shadow-card backdrop-blur md:bottom-4 dark:border-line dark:bg-surface/95',
        className,
      )}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {actions.map(({ to, label, icon: Icon, tone }) => (
          <Link
            key={`${to}-${label}`}
            to={to}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition',
              toneClass[tone],
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
