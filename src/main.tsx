import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from '@/app/App'
import { LockScreen } from '@/app/LockScreen'
import { acquireDbOwnerLock } from '@/app/single-tab'
import { requestPersistenceOnFirstRun } from '@/app/persistent-storage'
import { initI18n } from '@/core/i18n'
import '@/index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root was not found in index.html')
}

initI18n()

// T-018: acquire the single-tab owner lock before rendering anything. A second tab gets the
// lock screen and never constructs the router, Worker or Db client, so it makes no DB call.
const ownsDb = await acquireDbOwnerLock()

if (ownsDb) void requestPersistenceOnFirstRun()

const queryClient = new QueryClient()

createRoot(container).render(
  <StrictMode>
    {ownsDb ? (
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    ) : (
      <LockScreen />
    )}
  </StrictMode>,
)
