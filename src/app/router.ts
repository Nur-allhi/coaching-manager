/**
 * Data router built from the module registry (T-017, decision D-029 B1).
 *
 * Uses createBrowserRouter/RouterProvider instead of BrowserRouter so `useBlocker` can guard
 * unsaved changes. One route per module manifest, all lazy; the spike harness and 404 stay.
 * This file deliberately contains no JSX and exports no components, so react-refresh stays
 * satisfied. `routeDefinitions` lets tests mount the same tree on a memory router.
 */
import { lazy, createElement } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { NotFound, RootLayout } from './router-layout'
import { routes } from './registry'

const DbSpikeHarness = lazy(() =>
  import('@/app/dev/DbSpikeHarness').then((m) => ({ default: m.DbSpikeHarness })),
)
const CrashProbe = lazy(() => import('./dev/CrashProbe').then((m) => ({ default: m.CrashProbe })))
const SnapshotHarness = lazy(() =>
  import('./dev/SnapshotHarness').then((m) => ({ default: m.SnapshotHarness })),
)
const FileTransferHarness = lazy(() =>
  import('./dev/FileTransferHarness').then((m) => ({ default: m.FileTransferHarness })),
)

export function routeDefinitions(): RouteObject[] {
  return [
    {
      element: createElement(RootLayout),
      children: [
        ...routes.map((route) => ({
          path: route.path,
          element: createElement(route.component),
        })),
        { path: '/__db-spike', element: createElement(DbSpikeHarness) },
        { path: '/__crash-probe', element: createElement(CrashProbe) },
        { path: '/__snapshots', element: createElement(SnapshotHarness) },
        { path: '/__file-transfer', element: createElement(FileTransferHarness) },
        { path: '*', element: createElement(NotFound) },
      ],
    },
  ]
}

export const router = createBrowserRouter(routeDefinitions())
