import { Link } from 'react-router-dom'
import {
  Fan,
  Warehouse,
  FileText,
  Receipt,
  ShoppingCart,
  Wallet,
  PiggyBank,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const items = [
  { to: '/dryers', label: 'Dryers', icon: Fan, desc: 'Dryer status & capacity' },
  { to: '/inventory', label: 'Inventory', icon: Warehouse, desc: 'Stock balances' },
  { to: '/billing', label: 'Billing', icon: FileText, desc: 'Create invoices' },
  { to: '/invoices', label: 'Invoices', icon: Receipt, desc: 'Invoice history' },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart, desc: 'Buy from farmers' },
  { to: '/payments', label: 'Payments', icon: Wallet, desc: 'Record payments' },
  { to: '/expenses', label: 'Expenses', icon: PiggyBank, desc: 'Operating costs' },
  { to: '/reports', label: 'Reports', icon: BarChart3, desc: 'Export data' },
  { to: '/notifications', label: 'Notifications', icon: Bell, desc: 'Alerts' },
  { to: '/settings', label: 'Settings', icon: Settings, desc: 'Business profile' },
]

export function MorePage() {
  return (
    <div className="space-y-4 pb-6">
      <PageHeader title="More" subtitle="Finance, inventory &amp; settings" />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map(({ to, label, icon: Icon, desc }) => (
          <li key={to}>
            <Link to={to} className="block touch-target">
              <Card className="flex h-full flex-col items-center p-4 text-center transition-colors hover:border-emerald/40 hover:bg-light-green/40">
                <div
                  className={cn(
                    'mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-light-green text-emerald',
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <p className="font-display text-sm font-semibold text-forest">{label}</p>
                <p className="mt-1 text-[11px] leading-snug text-soft">{desc}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}