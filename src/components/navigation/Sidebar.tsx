import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Receipt, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark, BRAND_IMAGE } from '@/components/brand/BrandMark'
import { ThemeToggle } from '@/components/navigation/ThemeToggle'

const links = [
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

export function Sidebar() {
  return (
    <aside className="relative sticky top-0 hidden h-screen w-[15.75rem] shrink-0 flex-col overflow-hidden bg-forest text-white md:flex">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/15 to-transparent" />
      <div
        className="pointer-events-none absolute bottom-24 left-3 h-16 w-16 rounded-full opacity-[0.18]"
        style={{
          backgroundImage: `url(${BRAND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          maskImage: 'radial-gradient(circle, black 40%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 75%)',
        }}
      />

      <div className="relative border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3">
          <BrandMark size="md" />
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold leading-tight">Thayil</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Cardamom Spices</p>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 px-2.5 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
          Menu
        </p>
        <ul className="space-y-1">
          {links.map(({ to, label, icon: Icon, end, warm }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onPointerEnter={warm}
                onFocus={warm}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/12 text-gold shadow-soft ring-1 ring-gold/25'
                      : 'text-white/70 hover:bg-white/8 hover:text-white',
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="relative space-y-3 border-t border-white/10 p-2.5">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Appearance
            </p>
            <span
              className="h-4 w-4 overflow-hidden rounded-full opacity-80 ring-1 ring-gold/30"
              aria-hidden
            >
              <img src={BRAND_IMAGE} alt="" className="h-full w-full object-cover" />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-white/65">Light / Dark</span>
            <ThemeToggle compact />
          </div>
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
              isActive ? 'bg-white/12 text-gold' : 'text-white/55 hover:bg-white/8 hover:text-white',
            )
          }
        >
          <Settings className="h-5 w-5" />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
