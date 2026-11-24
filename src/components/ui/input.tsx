import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-soft placeholder:text-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-gold/40',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
