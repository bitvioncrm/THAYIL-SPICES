import { BrandMark } from '@/components/brand/BrandMark'

export function EmptyState({
  title = 'No records yet',
  description = 'Create the first entry to get started.',
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/70 px-6 py-12 text-center">
      <BrandMark size="md" className="mb-3 ring-offset-surface dark:ring-offset-[#122019]" />
      <h3 className="font-display text-lg text-forest dark:text-gold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-soft">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
