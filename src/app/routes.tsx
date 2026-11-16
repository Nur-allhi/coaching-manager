/**
 * React Router tree. One route per module manifest, all lazy. The spike harness lives at
 * its own lazy path until it is removed; the DevFeedback toolbar is dev-only.
 */
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from './AppShell'
import { routes } from './registry'

const DevFeedback = import.meta.env.DEV
  ? lazy(() => import('@/app/dev/DevFeedback').then((m) => ({ default: m.DevFeedback })))
  : null
const DbSpikeHarness = lazy(() =>
  import('@/app/dev/DbSpikeHarness').then((m) => ({ default: m.DbSpikeHarness })),
)

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

export function AppRoutes() {
  return (
    <TooltipProvider delayDuration={200}>
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {routes.map((route) => (
              <Route key={route.path} path={route.path} element={<route.component />} />
            ))}
            <Route path="/__db-spike" element={<DbSpikeHarness />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          {DevFeedback && (
            <Suspense fallback={null}>
              <DevFeedback />
            </Suspense>
          )}
        </Suspense>
      </AppShell>
    </TooltipProvider>
  )
}
