import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  {
    to: '/',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
    warm: () => void import('@/pages/OverviewPage'),
  },
  {
    to: '/farmers',
    label: 'Farmers',
    icon: Users,
    warm: () => void import('@/pages/FarmersPage'),
  },
  {
    to: '/billing',
    label: 'Billing',
    icon: Receipt,
    warm: () => void import('@/pages/BillingPage'),
  },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DCE6DE] bg-[#FFFEFA]/95 backdrop-blur safe-bottom dark:border-line dark:bg-surface/95 md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-3">
        {items.map(({ to, label, icon: Icon, end, warm }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onPointerEnter={warm}
              onFocus={warm}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold touch-target',
                  isActive ? 'text-forest dark:text-gold' : 'text-soft',
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
