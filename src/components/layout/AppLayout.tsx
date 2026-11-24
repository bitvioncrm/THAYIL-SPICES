import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/navigation/Sidebar'
import { BottomNav } from '@/components/navigation/BottomNav'
import { TopBar } from '@/components/navigation/TopBar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-canvas text-ink transition-colors duration-300">
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
