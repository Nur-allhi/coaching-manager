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
const UndoHarness = lazy(() =>
  import('./dev/UndoHarness').then((m) => ({ default: m.UndoHarness })),
)
const BackupFixture = lazy(() =>
  import('./dev/BackupFixture').then((m) => ({ default: m.BackupFixture })),
)
const AttendanceFixture = lazy(() =>
  import('./dev/AttendanceFixture').then((m) => ({ default: m.AttendanceFixture })),
)
const EnrollmentFixture = lazy(() =>
  import('./dev/EnrollmentFixture').then((m) => ({ default: m.EnrollmentFixture })),
)
const SeedFixture = lazy(() =>
  import('./dev/SeedFixture').then((m) => ({ default: m.SeedFixture })),
)
const PaymentFixture = lazy(() =>
  import('./dev/PaymentFixture').then((m) => ({ default: m.PaymentFixture })),
)
const DuesFixture = lazy(() =>
  import('./dev/DuesFixture').then((m) => ({ default: m.DuesFixture })),
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
        { path: '/__undo', element: createElement(UndoHarness) },
        { path: '/__backup-fixture', element: createElement(BackupFixture) },
        { path: '/__enrollment-fixture', element: createElement(EnrollmentFixture) },
        { path: '/__seed-fixture', element: createElement(SeedFixture) },
        { path: '/__payment-fixture', element: createElement(PaymentFixture) },
        { path: '/__dues-fixture', element: createElement(DuesFixture) },
        { path: '/__attendance-fixture', element: createElement(AttendanceFixture) },
        { path: '*', element: createElement(NotFound) },
      ],
    },
  ]
}

export const router = createBrowserRouter(routeDefinitions())
