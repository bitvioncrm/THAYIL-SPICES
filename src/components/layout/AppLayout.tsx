import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/navigation/Sidebar'
import { BottomNav } from '@/components/navigation/BottomNav'
import { TopBar } from '@/components/navigation/TopBar'

function warmRoutes() {
  void import('@/pages/FarmersPage')
  void import('@/pages/BillingPage')
  void import('@/pages/FarmerBillingPage')
  void import('@/pages/DailyEntryPage')
}

export function AppLayout() {
  useEffect(() => {
    const ric = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(cb, 120))
    const id = ric(() => warmRoutes())
    return () => {
      if (typeof id === 'number') window.clearTimeout(id)
      else window.cancelIdleCallback?.(id)
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-28 pt-4 sm:px-5 md:pb-10 md:pt-6">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
