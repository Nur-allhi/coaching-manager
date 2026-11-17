/**
 * Dashboard cross-module reads (T-070, D-056). TAD §2 rule 3 lets a read-model module read any
 * table from files in its own `queries/` folder; this module never writes. Payments/students KPIs
 * come from those modules' public services in `service.ts` so the numbers cannot drift.
 */
import type { Db } from '@/core/db/types'
import type { DashboardExtras, LowAttendanceRow, Topper } from '../types'

/** Below this share of marked sessions a student is flagged as low attendance. */
export const LOW_ATTENDANCE_THRESHOLD = 0.75

interface RawLow {
  student_id: string
  student_name: string
  rate: number
}

export async function dashboardExtras(db: Db, weekday: number): Promise<DashboardExtras> {
  const [batchRows, lowRows, topperRows] = await Promise.all([
    db.query<{ n: number }>(
      'SELECT COUNT(*) AS n FROM batches WHERE deleted_at IS NULL AND (days_mask & ?) != 0',
      [1 << weekday],
    ),
    db.query<RawLow>(
      `SELECT ar.student_id, s.full_name AS student_name,
              SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS rate
       FROM attendance_records ar
       JOIN attendance_sessions ses ON ses.id = ar.session_id AND ses.deleted_at IS NULL
       JOIN students s ON s.id = ar.student_id AND s.deleted_at IS NULL
       GROUP BY ar.student_id
       HAVING rate < ?
       ORDER BY rate ASC, ar.student_id ASC`,
      [LOW_ATTENDANCE_THRESHOLD],
    ),
    db.query<{ name: string; marks: number }>(
      `SELECT s.full_name AS name, er.marks
       FROM exam_results er
       JOIN exams e ON e.id = er.exam_id AND e.deleted_at IS NULL
       JOIN students s ON s.id = er.student_id AND s.deleted_at IS NULL
       WHERE er.absent = 0 AND er.marks IS NOT NULL
         AND e.id = (
           SELECT id FROM exams WHERE deleted_at IS NULL
           ORDER BY held_on DESC, created_at DESC LIMIT 1
         )
       ORDER BY er.marks DESC, s.full_name ASC LIMIT 3`,
    ),
  ])

  const lowAttendance: LowAttendanceRow[] = lowRows.map((row) => ({
    studentId: row.student_id,
    studentName: row.student_name,
    rate: Math.round(Number(row.rate) * 100) / 100,
  }))
  const recentToppers: Topper[] = topperRows.map((row) => ({
    name: row.name,
    marks: Number(row.marks),
  }))
  return {
    todaysBatches: Number(batchRows[0]?.n ?? 0),
    lowAttendance,
    recentToppers,
  }
}
