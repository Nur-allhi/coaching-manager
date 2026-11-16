/**
 * Layout and fallback components for the data router (T-017).
 * Kept separate from router.tsx so react-refresh only sees component exports there.
 */
import { lazy, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from './AppShell'
import { ErrorBoundary } from './ErrorBoundary'

const DevFeedback = import.meta.env.DEV
  ? lazy(() => import('@/app/dev/DevFeedback').then((m) => ({ default: m.DevFeedback })))
  : null

function RouteFallback() {
  return (
    <div role="status" className="text-muted-foreground px-4 py-8 text-sm" aria-busy="true">
      Loading…
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-2 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground text-sm">That screen does not exist.</p>
    </div>
  )
}

export function RootLayout() {
  return (
    <TooltipProvider delayDuration={200}>
      <ErrorBoundary>
        <AppShell>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
            {DevFeedback && (
              <Suspense fallback={null}>
                <DevFeedback />
              </Suspense>
            )}
          </Suspense>
        </AppShell>
      </ErrorBoundary>
    </TooltipProvider>
  )
}

export { NotFound }
