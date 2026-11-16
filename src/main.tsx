import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { requestPersistenceOnFirstRun } from '@/app/persistent-storage'
import '@/index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root was not found in index.html')
}

void requestPersistenceOnFirstRun()

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
