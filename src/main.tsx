import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { ThemeProvider } from './context/theme'
import { ensureSimpleDb } from './db/simple-db'
import { ensureDemoIfEmpty } from './services/simple/demo'
import './index.css'

async function boot() {
  await ensureSimpleDb()
  await ensureDemoIfEmpty()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}

boot().catch((err) => {
  console.error(err)
  document.body.innerHTML = `<div style="padding:2rem;font-family:sans-serif"><h1>Failed to start</h1><p>${String(err)}</p></div>`
})
