/**
 * Admin report read model (T-073, D-059). Monthly and per-academic-year sections over one range.
 * Money totals come from the payments module's public reads and admission counts from students, so
 * the report matches those screens (TAD §2 rule 3 allows this module to read its own query tables).
 */
import type { Db } from '@/core/db/types'
import { listBatches, listClasses } from '@/modules/academics'
import { duesReport, listRecordedPayments } from '@/modules/payments'
import { listStudents } from '@/modules/students'

export type AdminScope = { kind: 'month'; month: string } | { kind: 'year'; academicYearId: string }

export interface AdminReportData {
  from: string
  to: string
  admissions: number
  admissionsByClass: Array<{ name: string; count: number }>
  admissionsByBatch: Array<{ name: string; count: number }>
  dropouts: number
  collectedMinor: number
  dueMinor: number
  methodSplit: Array<{ method: string; amountMinor: number }>
  attendanceRate: number | null
  topPerformers: Array<{ name: string; marks: number }>
  netMinor: number
}

function monthRange(month: string): { from: string; to: string } {
  const parts = month.split('-').map(Number)
  const year = parts[0] ?? 2026
  const monthNumber = parts[1] ?? 1
  const last = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
  return { from: `${month}-01`, to: last }
}

async function rangeFor(db: Db, scope: AdminScope): Promise<{ from: string; to: string }> {
  if (scope.kind === 'month') return monthRange(scope.month)
  const rows = await db.query<{ starts_on: string; ends_on: string }>(
    'SELECT starts_on, ends_on FROM academic_years WHERE id = ? AND deleted_at IS NULL',
    [scope.academicYearId],
  )
  const row = rows[0]
  return row ? { from: row.starts_on, to: row.ends_on } : { from: '0000-01-01', to: '9999-12-31' }
}

function inRange(value: string, from: string, to: string): boolean {
  return value >= from && value <= to
}

export async function academicYearOptions(db: Db): Promise<Array<{ id: string; name: string }>> {
  const rows = await db.query<{ id: string; name: string }>(
    'SELECT id, name FROM academic_years WHERE deleted_at IS NULL ORDER BY starts_on DESC',
  )
  return rows.map((row) => ({ id: row.id, name: row.name }))
}

export async function adminReport(db: Db, scope: AdminScope): Promise<AdminReportData> {
  const { from, to } = await rangeFor(db, scope)
  const [students, batches, classes, payments, dues, drops] = await Promise.all([
    listStudents(db),
    listBatches(db),
    listClasses(db),
    listRecordedPayments(db),
    duesReport(db),
    db.query<{ student_id: string; left_on: string }>(
      `SELECT student_id, left_on FROM enrollments
       WHERE deleted_at IS NULL AND status = 'closed' AND left_on BETWEEN ? AND ?`,
      [from, to],
    ),
  ])

  const admitted = students.filter((student) => inRange(String(student.admitted_on), from, to))
  const batchById = new Map(batches.map((batch) => [String(batch.id), batch]))
  const classById = new Map(classes.map((entry) => [String(entry.id), entry]))
  const enrollmentRows = await db.query<{ student_id: string; batch_id: string }>(
    'SELECT student_id, batch_id FROM enrollments WHERE deleted_at IS NULL',
  )
  const batchForStudent = new Map(
    enrollmentRows.map((row) => [row.student_id, String(row.batch_id)]),
  )

  const classCounts = new Map<string, number>()
  const batchCounts = new Map<string, number>()
  for (const student of admitted) {
    const batch = batchById.get(batchForStudent.get(String(student.id)) ?? '')
    const className = batch ? String(classById.get(String(batch.class_id))?.name ?? '—') : '—'
    const batchName = batch ? String(batch.name) : '—'
    classCounts.set(className, (classCounts.get(className) ?? 0) + 1)
    batchCounts.set(batchName, (batchCounts.get(batchName) ?? 0) + 1)
  }

  const valid = payments.filter(
    (payment) => payment.status === 'valid' && inRange(String(payment.paid_on), from, to),
  )
  const collectedMinor = valid.reduce((sum, payment) => sum + Number(payment.amount_minor), 0)
  const dueMinor = dues.reduce((sum, row) => sum + row.dueMinor, 0)
  const methods = new Map<string, number>()
  for (const payment of valid) {
    const method = String(payment.method)
    methods.set(method, (methods.get(method) ?? 0) + Number(payment.amount_minor))
  }

  const attendance = await db.query<{ present: number; marked: number }>(
    `SELECT
       SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS present,
       COUNT(*) AS marked
     FROM attendance_records ar
     JOIN attendance_sessions ses ON ses.id = ar.session_id AND ses.deleted_at IS NULL
     WHERE ses.held_on BETWEEN ? AND ?`,
    [from, to],
  )
  const marked = Number(attendance[0]?.marked ?? 0)
  const attendanceRate =
    marked === 0 ? null : Math.round((Number(attendance[0]?.present ?? 0) / marked) * 1000) / 10

  const topperRows = await db.query<{ name: string; marks: number }>(
    `SELECT s.full_name AS name, er.marks
     FROM exam_results er
     JOIN exams e ON e.id = er.exam_id AND e.deleted_at IS NULL
     JOIN students s ON s.id = er.student_id AND s.deleted_at IS NULL
     WHERE er.absent = 0 AND er.marks IS NOT NULL AND e.held_on BETWEEN ? AND ?
     ORDER BY er.marks DESC, s.full_name ASC LIMIT 3`,
    [from, to],
  )

  return {
    from,
    to,
    admissions: admitted.length,
    admissionsByClass: [...classCounts].map(([name, count]) => ({ name, count })),
    admissionsByBatch: [...batchCounts].map(([name, count]) => ({ name, count })),
    dropouts: new Set(drops.map((row) => row.student_id)).size,
    collectedMinor,
    dueMinor,
    methodSplit: [...methods].map(([method, amountMinor]) => ({ method, amountMinor })),
    attendanceRate,
    topPerformers: topperRows.map((row) => ({ name: row.name, marks: Number(row.marks) })),
    netMinor: collectedMinor - dueMinor,
  }
}
