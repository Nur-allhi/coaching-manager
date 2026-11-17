/**
 * T-083 budget harness (D-063 A1/B1). Builds a real migrated SQLite database with 5,000 students,
 * 60,000 payments and 200,000 marks, then times the *shipped* read functions. Run with `pnpm perf`.
 * It is a dedicated file outside `pnpm check`: timing assertions do not belong in CI's unit job.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import type { Db } from '@/core/db/types'
import { dashboardExtras } from '@/modules/dashboard/queries/dashboard'
import { adminReport } from '@/modules/reports/queries/admin'
import {
  admissionsRows,
  attendanceRows,
  duesRows,
  paymentsRegisterRows,
  receiptsRows,
  resultSheetRows,
} from '@/modules/reports/queries/catalogue'
import { studentListRows } from '@/modules/reports/queries/students'
import type { ReportFilter } from '@/modules/reports/types'
import { all, search } from '@/modules/students/repository'
import { generateMarks, generatePayments, generateStudents } from './seed-data.ts'

const STUDENTS = 5_000
const PAYMENTS = 60_000
const MARKS = 200_000
const EXAMS = 40
const YEAR = 2026
const FILTER: ReportFilter = {
  from: '2026-01-01',
  to: '2026-12-31',
  batchId: '',
  classId: '',
}

const pad = (value: number, length: number): string => String(value).padStart(length, '0')
let db: Db
let directory: string

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'ccm-perf-'))
  const file = join(directory, 'perf.sqlite')
  db = createBetterSqliteDb(file)
  await migrate({ db, migrations })

  const students = generateStudents(STUDENTS, 1, YEAR)
  const payments = generatePayments(PAYMENTS, 2, STUDENTS, YEAR)
  const marks = generateMarks(MARKS, 3, STUDENTS, EXAMS, YEAR)
  const studentId = new Map(
    students.map((row, index) => [row.student_no, `s-${pad(index + 1, 5)}`]),
  )
  const chargeId = new Map(students.map((_, index) => [index, `c-${pad(index + 1, 5)}`]))
  const stamp = Date.UTC(YEAR, 0, 1)

  const raw = new Database(file)
  raw.pragma('foreign_keys = ON')
  raw.transaction(() => {
    const run = (sql: string, row: unknown[]) => raw.prepare(sql).run(...row)
    const base = '(id, created_at, updated_at, deleted_at, version'

    run(
      `INSERT INTO academic_years ${base}, name, starts_on, ends_on, is_current) VALUES (?,?,?,?,?,?,?,?,?)`,
      ['ay-1', stamp, stamp, null, 1, '2026', '2026-01-01', '2026-12-31', 1],
    )
    run(`INSERT INTO classes ${base}, name, sort_order) VALUES (?,?,?,?,?,?,?)`, [
      'cl-1',
      stamp,
      stamp,
      null,
      1,
      'Class 11',
      1,
    ])
    run(`INSERT INTO subjects ${base}, name, code) VALUES (?,?,?,?,?,?,?)`, [
      'sub-1',
      stamp,
      stamp,
      null,
      1,
      'Mathematics',
      'MATH',
    ])
    run(
      `INSERT INTO batches ${base}, academic_year_id, class_id, name, days_mask, start_time, end_time, room, capacity, monthly_fee_minor, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        'b-1',
        stamp,
        stamp,
        null,
        1,
        'ay-1',
        'cl-1',
        'A',
        2,
        '09:00',
        '10:00',
        'Room 1',
        60,
        100000,
        'active',
      ],
    )

    const addStudent = raw.prepare(
      `INSERT INTO students ${base}, student_no, full_name, gender, dob, phone, guardian_name, guardian_phone, admitted_on, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    const addEnrollment = raw.prepare(
      `INSERT INTO enrollments ${base}, student_id, batch_id, enrolled_on, left_on, admission_fee_minor, monthly_fee_minor, discount_kind, discount_value, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    const addCharge = raw.prepare(
      `INSERT INTO charges ${base}, enrollment_id, student_id, month, kind, description, amount_minor, discount_minor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    students.forEach((row, index) => {
      const id = `s-${pad(index + 1, 5)}`
      addStudent.run(
        id,
        stamp,
        stamp,
        null,
        1,
        row.student_no,
        row.full_name,
        row.gender,
        row.dob,
        row.phone,
        row.guardian_name,
        row.guardian_phone,
        row.admitted_on,
        row.status,
      )
      addEnrollment.run(
        `en-${pad(index + 1, 5)}`,
        stamp,
        stamp,
        null,
        1,
        id,
        'b-1',
        row.admitted_on,
        null,
        5000,
        100000,
        'none',
        0,
        'active',
      )
      addCharge.run(
        chargeId.get(index),
        stamp,
        stamp,
        null,
        1,
        `en-${pad(index + 1, 5)}`,
        id,
        '2026-01',
        'monthly',
        'January',
        100000,
        0,
      )
    })

    const addPayment = raw.prepare(
      `INSERT INTO payments ${base}, receipt_no, student_id, paid_on, method, amount_minor, note, status, revision) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    const addAllocation = raw.prepare(
      'INSERT INTO payment_allocations (payment_id, charge_id, amount_minor) VALUES (?,?,?)',
    )
    payments.forEach((row, index) => {
      const studentIndex = index % STUDENTS
      addPayment.run(
        row.id,
        stamp + index,
        stamp + index,
        null,
        1,
        row.receipt_no,
        studentId.get(row.student_no),
        row.paid_on,
        row.method,
        row.amount_minor,
        null,
        'valid',
        0,
      )
      addAllocation.run(row.id, chargeId.get(studentIndex), row.amount_minor)
    })

    const addExam = raw.prepare(
      `INSERT INTO exams ${base}, batch_id, subject_id, name, held_on, full_marks, pass_marks) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    for (let index = 0; index < EXAMS; index += 1) {
      addExam.run(
        `e-${pad(index + 1, 3)}`,
        stamp,
        stamp,
        null,
        1,
        'b-1',
        'sub-1',
        `Exam ${index + 1}`,
        `2026-${pad((index % 12) + 1, 2)}-15`,
        100,
        33,
      )
    }

    const addMark = raw.prepare(
      'INSERT INTO exam_results (exam_id, student_id, marks, absent, remark, updated_at) VALUES (?,?,?,?,?,?)',
    )
    marks.forEach((row) => {
      addMark.run(
        `e-${pad(row.exam_index + 1, 3)}`,
        studentId.get(row.student_no),
        row.marks,
        row.absent,
        '',
        row.updated_at,
      )
    })

    const addSession = raw.prepare(
      `INSERT INTO attendance_sessions ${base}, batch_id, held_on) VALUES (?,?,?,?,?,?,?)`,
    )
    const addRecord = raw.prepare(
      'INSERT INTO attendance_records (session_id, student_id, status) VALUES (?,?,?)',
    )
    for (const [index, day] of ['2026-01-20', '2026-02-20'].entries()) {
      const sessionId = `as-${index + 1}`
      addSession.run(sessionId, stamp, stamp, null, 1, 'b-1', day)
      students.forEach((_, studentIndex) => {
        addRecord.run(
          sessionId,
          `s-${pad(studentIndex + 1, 5)}`,
          studentIndex % 10 === 0 ? 'absent' : 'present',
        )
      })
    }
  })()
  raw.close()
}, 600_000)

afterAll(() => {
  if (directory) rmSync(directory, { recursive: true, force: true })
})

async function timed<T>(label: string, fn: () => Promise<T>): Promise<number> {
  const started = performance.now()
  const result = await fn()
  const elapsed = performance.now() - started
  console.log(
    `${label}: ${elapsed.toFixed(1)} ms (${Array.isArray(result) ? result.length : 1} rows)`,
  )
  return elapsed
}

describe('PLAN §10 budgets at full scale', () => {
  it('lists and searches 5,000 students under 100 ms', async () => {
    expect(await timed('students.list', () => all(db))).toBeLessThan(100)
    expect(await timed('students.search', () => search(db, { query: 'Rahim' }))).toBeLessThan(100)
  })

  it('runs every report under 2 s at 60,000 payments and 200,000 marks', async () => {
    const reports: Array<[string, () => Promise<unknown>]> = [
      ['report.students', () => studentListRows(db, FILTER)],
      ['report.admissions', () => admissionsRows(db, FILTER)],
      ['report.payments', () => paymentsRegisterRows(db, FILTER)],
      ['report.dues', () => duesRows(db, FILTER)],
      ['report.receipts', () => receiptsRows(db, FILTER)],
      ['report.attendance', () => attendanceRows(db, FILTER)],
      ['report.results', () => resultSheetRows(db, FILTER)],
      ['report.admin', () => adminReport(db, { kind: 'month', month: '2026-01' })],
      ['dashboard.extras', () => dashboardExtras(db, 1)],
    ]
    for (const [label, load] of reports) {
      expect(await timed(label, load), label).toBeLessThan(2_000)
    }
  })
})
