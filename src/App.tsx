import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingState } from '@/components/common/LoadingState'

const OverviewPage = lazy(() =>
  import('@/pages/OverviewPage').then((m) => ({ default: m.OverviewPage })),
)
const FarmersPage = lazy(() =>
  import('@/pages/FarmersPage').then((m) => ({ default: m.FarmersPage })),
)
const FarmerFormPage = lazy(() =>
  import('@/pages/FarmerFormPage').then((m) => ({ default: m.FarmerFormPage })),
)
const FarmerDetailPage = lazy(() =>
  import('@/pages/FarmerDetailPage').then((m) => ({ default: m.FarmerDetailPage })),
)
const DailyEntryPage = lazy(() =>
  import('@/pages/DailyEntryPage').then((m) => ({ default: m.DailyEntryPage })),
)
const BillingPage = lazy(() =>
  import('@/pages/BillingPage').then((m) => ({ default: m.BillingPage })),
)
const FarmerBillingPage = lazy(() =>
  import('@/pages/FarmerBillingPage').then((m) => ({ default: m.FarmerBillingPage })),
)
const BillDetailPage = lazy(() =>
  import('@/pages/BillDetailPage').then((m) => ({ default: m.BillDetailPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

export function App() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="farmers" element={<FarmersPage />} />
          <Route path="farmers/new" element={<FarmerFormPage />} />
          <Route path="farmers/:id" element={<FarmerDetailPage />} />
          <Route path="farmers/:id/edit" element={<FarmerFormPage />} />
          <Route path="farmers/:id/entry" element={<DailyEntryPage />} />
          <Route path="farmers/:id/entry/:entryId" element={<DailyEntryPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="billing/:farmerId" element={<FarmerBillingPage />} />
          <Route path="bills/:id" element={<BillDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
