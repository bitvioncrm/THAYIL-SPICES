import { BrandMark } from '@/components/brand/BrandMark'
import { ThemeToggle } from '@/components/navigation/ThemeToggle'

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-surface/90 backdrop-blur md:hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark size="sm" className="ring-offset-surface dark:ring-offset-[#122019]" />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold leading-tight text-forest dark:text-gold">
              Thayil Cardamom Spices
            </p>
            <p className="text-[10px] uppercase tracking-wider text-soft">Overview · Farmers · Billing</p>
          </div>
        </div>
        <ThemeToggle compact />
      </div>
    </header>
  )
}
