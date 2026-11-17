/**
 * Remaining catalogue report loaders (T-072, D-058). Read model only (TAD §2 rule 3): payments and
 * students totals come from those modules' public reads so report sums cannot drift from their
 * screens; attendance and result-sheet shaping uses this module's own parameterized SQL.
 */
import type { Db, DbParam } from '@/core/db/types'
import { formatMinor } from '@/core/money/money'
import { listBatches } from '@/modules/academics'
import { listActive } from '@/modules/enrollments'
import { duesReport, listRecordedPayments, receiptsForExport } from '@/modules/payments'
import { listStudents } from '@/modules/students'
import type { ReportFilter, ReportRow } from '../types'

function inRange(value: string, from: string, to: string): boolean {
  return value >= from && value <= to
}

/** Set of student ids matching the batch/class filter, or null when the filter is "all". */
async function filteredStudentIds(db: Db, filter: ReportFilter): Promise<Set<string> | null> {
  if (filter.batchId === '' && filter.classId === '') return null
  const [batches, active] = await Promise.all([listBatches(db), listActive(db)])
  const wanted = new Set(
    batches
      .filter(
        (batch) =>
          (filter.batchId === '' || String(batch.id) === filter.batchId) &&
          (filter.classId === '' || String(batch.class_id) === filter.classId),
      )
      .map((batch) => String(batch.id)),
  )
  return new Set(
    active.filter((row) => wanted.has(String(row.batch_id))).map((row) => String(row.student_id)),
  )
}

function batchNameByStudent(
  active: ReadonlyArray<{ student_id?: unknown; batch_id?: unknown }>,
  batches: ReadonlyArray<{ id?: unknown; name?: unknown }>,
) {
  const names = new Map(batches.map((batch) => [String(batch.id), String(batch.name)]))
  return new Map(
    active.map((row) => [String(row.student_id), names.get(String(row.batch_id)) ?? '']),
  )
}

export async function admissionsRows(db: Db, filter: ReportFilter): Promise<ReportRow[]> {
  const [students, active, batches] = await Promise.all([
    listStudents(db),
    listActive(db),
    listBatches(db),
  ])
  const ids = await filteredStudentIds(db, filter)
  const batchNames = batchNameByStudent(active, batches)
  return students
    .filter(
      (student) =>
        inRange(String(student.admitted_on), filter.from, filter.to) &&
        (ids === null || ids.has(String(student.id))),
    )
    .map((student) => ({
      studentNo: String(student.student_no),
      studentName: String(student.full_name),
      admittedOn: String(student.admitted_on),
      batchName: batchNames.get(String(student.id)) ?? '',
    }))
}

export async function paymentsRegisterRows(db: Db, filter: ReportFilter): Promise<ReportRow[]> {
  const [payments, students] = await Promise.all([listRecordedPayments(db), listStudents(db)])
  const ids = await filteredStudentIds(db, filter)
  const nameById = new Map(students.map((row) => [String(row.id), String(row.full_name)]))
  return payments
    .filter(
      (payment) =>
        payment.status === 'valid' &&
        inRange(String(payment.paid_on), filter.from, filter.to) &&
        (ids === null || ids.has(String(payment.student_id))),
    )
    .map((payment) => ({
      receiptNo: String(payment.receipt_no),
      paidOn: String(payment.paid_on),
      studentName: nameById.get(String(payment.student_id)) ?? '',
      method: String(payment.method),
      amountTaka: formatMinor(Number(payment.amount_minor)),
      amountMinor: Number(payment.amount_minor),
    }))
}

export async function duesRows(db: Db, filter: ReportFilter): Promise<ReportRow[]> {
  const dues = await duesReport(db)
  const ids = await filteredStudentIds(db, filter)
  return dues
    .filter((row) => ids === null || ids.has(row.studentId))
    .map((row) => ({
      studentNo: row.studentNo,
      studentName: row.studentName,
      batchName: row.batchName,
      className: row.className,
      dueTaka: formatMinor(row.dueMinor),
      dueMinor: row.dueMinor,
    }))
}

export async function receiptsRows(db: Db, filter: ReportFilter): Promise<ReportRow[]> {
  const receipts = await receiptsForExport(db)
  return receipts
    .filter((row) => inRange(row.paidOn, filter.from, filter.to))
    .map((row) => ({
      receiptNo: row.receiptNo,
      paidOn: row.paidOn,
      studentName: row.studentName,
      amountTaka: formatMinor(row.amountMinor),
      amountMinor: row.amountMinor,
      method: row.method,
      status: row.status,
      revision: row.revision,
    }))
}

interface RawAttendance {
  student_no: string
  student_name: string
  present: number
  marked: number
  rate: number
}

export async function attendanceRows(db: Db, filter: ReportFilter): Promise<ReportRow[]> {
  const params: DbParam[] = [filter.from, filter.to]
  let batchClause = ''
  let classClause = ''
  if (filter.batchId !== '') {
    batchClause = 'AND b.id = ?'
    params.push(filter.batchId)
  }
  if (filter.classId !== '') {
    classClause = 'AND b.class_id = ?'
    params.push(filter.classId)
  }
  const rows = await db.query<RawAttendance>(
    `SELECT s.student_no, s.full_name AS student_name,
            SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS present,
            COUNT(*) AS marked,
            ROUND(SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS rate
     FROM attendance_records ar
     JOIN attendance_sessions ses ON ses.id = ar.session_id AND ses.deleted_at IS NULL
     JOIN batches b ON b.id = ses.batch_id AND b.deleted_at IS NULL
     JOIN students s ON s.id = ar.student_id AND s.deleted_at IS NULL
     WHERE ses.held_on BETWEEN ? AND ? ${batchClause} ${classClause}
     GROUP BY ar.student_id
     ORDER BY rate DESC, s.student_no`,
    params,
  )
  return rows.map((row) => ({
    studentNo: row.student_no,
    studentName: row.student_name,
    present: Number(row.present),
    marked: Number(row.marked),
    rate: Number(row.rate),
  }))
}

interface RawResult {
  exam_name: string
  held_on: string
  student_name: string
  marks: number | null
  absent: number
}

export async function resultSheetRows(db: Db, filter: ReportFilter): Promise<ReportRow[]> {
  const params: DbParam[] = [filter.from, filter.to]
  let batchClause = ''
  let classClause = ''
  if (filter.batchId !== '') {
    batchClause = 'AND b.id = ?'
    params.push(filter.batchId)
  }
  if (filter.classId !== '') {
    classClause = 'AND b.class_id = ?'
    params.push(filter.classId)
  }
  const rows = await db.query<RawResult>(
    `SELECT e.name AS exam_name, e.held_on, s.full_name AS student_name, er.marks, er.absent
     FROM exam_results er
     JOIN exams e ON e.id = er.exam_id AND e.deleted_at IS NULL
     JOIN batches b ON b.id = e.batch_id AND b.deleted_at IS NULL
     JOIN students s ON s.id = er.student_id AND s.deleted_at IS NULL
     WHERE e.held_on BETWEEN ? AND ? ${batchClause} ${classClause}
     ORDER BY e.held_on, s.full_name`,
    params,
  )
  return rows.map((row) => ({
    examName: row.exam_name,
    heldOn: row.held_on,
    studentName: row.student_name,
    marks: row.marks === null ? null : Number(row.marks),
    status: row.absent === 1 ? 'A' : '',
  }))
}
