import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { BootGate } from './components/layout/BootGate'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { ThemeProvider } from './context/theme'
import './index.css'

function prefetchRoutes() {
  void import('@/pages/OverviewPage')
  void import('@/pages/FarmersPage')
  void import('@/pages/BillingPage')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <BootGate>
            <App />
          </BootGate>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)

const ric = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(cb, 1))
ric(() => prefetchRoutes())
