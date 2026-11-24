import { cn } from '@/lib/utils'

const SRC = '/brand/cardamom.jpg'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const sizeMap: Record<Size, string> = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
}

/** Small circular cardamom brand mark — keep usage sparse and compact. */
export function BrandMark({
  size = 'md',
  className,
  ring = true,
}: {
  size?: Size
  className?: string
  ring?: boolean
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full shadow-[0_4px_14px_rgba(18,59,42,0.28)]',
        sizeMap[size],
        ring && 'ring-1 ring-gold/40 ring-offset-1 ring-offset-forest dark:ring-offset-[#0B1611]',
        className,
      )}
      aria-hidden
    >
      <img
        src={SRC}
        alt=""
        className="h-full w-full scale-110 object-cover"
        draggable={false}
      />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-forest/35" />
    </span>
  )
}

/** Tiny cardamom chip for inline accents (toggle, empty states, etc.). */
export function BrandChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-block h-5 w-5 overflow-hidden rounded-full ring-1 ring-white/30',
        className,
      )}
      aria-hidden
    >
      <img src={SRC} alt="" className="h-full w-full object-cover" draggable={false} />
    </span>
  )
}

export const BRAND_IMAGE = SRC
