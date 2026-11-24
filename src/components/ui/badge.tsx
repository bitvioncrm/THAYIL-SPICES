import { cn } from '@/lib/utils'

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'gold'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
        variant === 'default' && 'bg-light-green text-forest',
        variant === 'success' && 'bg-emerald/15 text-emerald',
        variant === 'warning' && 'bg-amber-100 text-amber-800',
        variant === 'danger' && 'bg-red-100 text-red-700',
        variant === 'muted' && 'bg-muted text-muted-foreground',
        variant === 'gold' && 'bg-gold/20 text-forest',
        className,
      )}
      {...props}
    />
  )
}
