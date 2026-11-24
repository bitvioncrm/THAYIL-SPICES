import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 rounded-2xl border border-red-100 bg-gradient-to-b from-red-50 to-white px-6 py-12 text-center shadow-soft">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <h3 className="font-display text-lg text-forest">Couldn’t load this view</h3>
        <p className="mt-1 text-sm text-soft">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
