import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  subtitle,
  backTo,
  actions,
  className,
}: {
  title: string
  subtitle?: string
  backTo?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-1 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {backTo && (
            <Link
              to={backTo}
              className="touch-target inline-flex items-center justify-center rounded-lg text-forest hover:bg-[#EAF0E6] dark:text-gold dark:hover:bg-mist"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          <h1 className="truncate font-display text-[1.75rem] font-semibold tracking-tight text-forest dark:text-gold sm:text-3xl">
            {title}
          </h1>
        </div>
        {subtitle && <p className="mt-1 text-sm text-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
