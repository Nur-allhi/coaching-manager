/**
 * The single source of truth for what the app can navigate to.
 *
 * Modules register here; the shell and router read this list. Nothing in the shell names a
 * module directly. `nav` and `routes` are sorted here so the contract files stay declarative.
 */
import type { AppModule } from './module-contract'
import { dashboardModule } from '@/modules/dashboard'
import { studentsModule } from '@/modules/students'
import { academicsModule } from '@/modules/academics'
import { enrollmentsModule } from '@/modules/enrollments'
import { paymentsModule } from '@/modules/payments'
import { attendanceModule } from '@/modules/attendance'
import { examsModule } from '@/modules/exams'
import { leaderboardModule } from '@/modules/leaderboard'
import { reportsModule } from '@/modules/reports'
import { dataToolsModule } from '@/modules/data-tools'
import { settingsModule } from '@/modules/settings'

export const modules: readonly AppModule[] = [
  dashboardModule,
  studentsModule,
  academicsModule,
  enrollmentsModule,
  paymentsModule,
  attendanceModule,
  examsModule,
  leaderboardModule,
  reportsModule,
  dataToolsModule,
  settingsModule,
]

/** The sidebar order, 1-based, ascending. */
export const navigation = [...modules]
  .sort((a, b) => a.nav.order - b.nav.order)
  .map((module) => module.nav)

/** Every route from every module, flat, for the router to mount. */
export const routes = modules.flatMap((module) => module.routes)
