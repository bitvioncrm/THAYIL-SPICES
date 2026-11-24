import { useEffect, useState, type ReactNode } from 'react'
import { ensureSimpleDb } from '@/db/simple-db'
import { ensureDemoIfEmpty } from '@/services/simple/demo'

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <aside className="hidden w-56 shrink-0 border-r border-line bg-surface md:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-14 border-b border-line bg-surface/90" />
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-3 pt-4 sm:px-5">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-mist" />
          <div className="h-28 animate-pulse rounded-2xl bg-mist/80" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-mist/70" />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

/** Opens IndexedDB after first paint so the shell appears instantly. */
export function BootGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensureSimpleDb()
        await ensureDemoIfEmpty()
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) return <ShellSkeleton />
  return children
}
