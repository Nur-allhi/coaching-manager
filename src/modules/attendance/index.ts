import { lazy } from 'react'
import { CheckSquare } from 'lucide-react'
import type { AppModule } from '@/app/module-contract'

/** Public surface for attendance reads, used by reports/leaderboard later (TAD §2). */
export { summaryFor, rosterFor } from './service'
export type { AttendanceSummary, AttendanceStatus } from './types'

export const attendanceModule: AppModule = {
  id: 'attendance',
  nav: { labelKey: 'nav.attendance', icon: CheckSquare, order: 6, path: '/attendance' },
  permissions: ['attendance.read'],
  routes: [
    {
      path: '/attendance',
      titleKey: 'nav.attendance',
      component: lazy(() => import('./Screen').then((mod) => ({ default: mod.Screen }))),
    },
    {
      path: '/attendance/:batchId/:date',
      titleKey: 'attendance.sessionTitle',
      component: lazy(() =>
        import('./AttendanceGrid').then((mod) => ({ default: mod.AttendanceGrid })),
      ),
    },
  ],
}
