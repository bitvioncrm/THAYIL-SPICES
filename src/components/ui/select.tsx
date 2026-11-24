import * as React from 'react'
import { cn } from '@/lib/utils'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    className={cn(
      'flex h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-gold/40',
      className,
    )}
    ref={ref}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'
