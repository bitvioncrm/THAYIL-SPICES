import { BRAND_IMAGE } from '@/components/brand/BrandMark'
import { cn } from '@/lib/utils'

export function PageHero({
  eyebrow = 'Thayil Cardamom Spices',
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] border border-[#D9E2D6] bg-forest text-white shadow-card',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(105deg, rgba(27,60,45,0.94) 0%, rgba(27,60,45,0.78) 48%, rgba(27,60,45,0.42) 100%), url(${BRAND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
        }}
      />
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-gold/15 blur-2xl" />
      <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-[2.15rem]">
            {title}
          </h2>
          {description && (
            <p className="mt-2.5 max-w-md text-sm leading-relaxed text-white/75">{description}</p>
          )}
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  )
}

export function HeroStat({
  label,
  value,
  gold = false,
}: {
  label: string
  value: string
  gold?: boolean
}) {
  return (
    <div className="min-w-[7.5rem] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-wide text-white/55">{label}</p>
      <p
        className={cn(
          'mt-0.5 font-display text-2xl font-semibold tabular-nums',
          gold ? 'text-gold' : 'text-white',
        )}
      >
        {value}
      </p>
    </div>
  )
}
