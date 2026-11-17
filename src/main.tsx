import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from '@/app/App'
import { AuthGate } from '@/app/auth/AuthGate'
import { LockScreen } from '@/app/LockScreen'
import { RecoveryScreen } from '@/app/RecoveryScreen'
import { bootstrapApp } from '@/app/bootstrap'
import { acquireDbOwnerLock } from '@/app/single-tab'
import { requestPersistenceOnFirstRun } from '@/app/persistent-storage'
import { initI18n } from '@/core/i18n'
import { startIdleWatcher } from '@/core/auth'
import '@/index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root was not found in index.html')
}

initI18n()
startIdleWatcher()

// T-018: acquire the single-tab owner lock before rendering anything. A second tab gets the
// lock screen and never constructs the router, Worker or Db client, so it makes no DB call.
const ownsDb = await acquireDbOwnerLock()

// T-040: run migrations at startup (after a pre-migration snapshot) before any real screen reads
// a table. A failure shows a recovery screen instead of a broken app (PLAN §7.4).
const boot = ownsDb ? await bootstrapApp() : { ok: true }

if (ownsDb && boot.ok) void requestPersistenceOnFirstRun()

const queryClient = new QueryClient()

createRoot(container).render(
  <StrictMode>
    {!ownsDb ? (
      <LockScreen />
    ) : !boot.ok ? (
      <RecoveryScreen message={boot.error ?? 'unknown error'} />
    ) : (
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <App />
        </AuthGate>
      </QueryClientProvider>
    )}
  </StrictMode>,
)
