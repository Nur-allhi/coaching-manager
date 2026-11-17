/**
 * Dashboard service (T-070, D-056). Money and student KPIs come from the owning modules' public
 * reads over the same live dataset, so each number matches the module behind its link. The stale
 * backup warning reuses the core health helper; only cross-module read-model bits use `queries/`.
 */
import { isExportStale, lastFileExport } from '@/core/backup/health'
import { today } from '@/core/dates/dates'
import type { Db } from '@/core/db/types'
import { sumMinor } from '@/core/money/money'
import { listActive } from '@/modules/enrollments'
import { duesReport, listRecordedPayments } from '@/modules/payments'
import { listStudents } from '@/modules/students'
import { dashboardExtras } from './queries/dashboard'
import type { DashboardData } from './types'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function dashboardData(db: Db, now: number = Date.now()): Promise<DashboardData> {
  const clock = () => now
  const [payments, dues, students, active] = await Promise.all([
    listRecordedPayments(db),
    duesReport(db),
    listStudents(db),
    listActive(db),
  ])
  const day = today(clock)
  const extras = await dashboardExtras(db, new Date(`${day}T00:00:00.000Z`).getUTCDay())
  const stale = isExportStale(await lastFileExport(db), now, SEVEN_DAYS_MS)

  return {
    collectedMinor: sumMinor(
      payments
        .filter((payment) => payment.status === 'valid')
        .map((payment) => Number(payment.amount_minor)),
    ),
    dueMinor: sumMinor(dues.map((row) => row.dueMinor)),
    admissionsThisMonth: students.filter((student) =>
      String(student.admitted_on).startsWith(day.slice(0, 7)),
    ).length,
    activeStudents: new Set(active.map((row) => String(row.student_id))).size,
    todaysBatches: extras.todaysBatches,
    lowAttendance: extras.lowAttendance.length,
    recentToppers: extras.recentToppers,
    backupStale: stale,
  }
}
