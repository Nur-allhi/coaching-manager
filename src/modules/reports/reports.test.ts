/** Unit tests for the reports framework (T-071, D-057). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { insert } from '@/core/db/repository'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { formatMinor } from '@/core/money/money'
import { keyedRows, reportCsv } from './export'
import {
  admissionsRows,
  attendanceRows,
  duesRows,
  paymentsRegisterRows,
  receiptsRows,
  resultSheetRows,
} from './queries/catalogue'
import { studentListRows } from './queries/students'
import { getReport } from './registry'
import type { ReportColumn, ReportFilter } from './types'
import { listRecordedPayments, duesReport, receiptsForExport } from '@/modules/payments'
import { listStudents } from '@/modules/students'

const columns: ReportColumn[] = [
  { key: 'studentNo', labelKey: 'reports.studentNo' },
  { key: 'studentName', labelKey: 'reports.studentName' },
]
const labels = { 'reports.studentNo': 'Student no', 'reports.studentName': 'Student' }
const all: ReportFilter = { from: '2000-01-01', to: '2100-12-31', batchId: '', classId: '' }

describe('report exports', () => {
  it('writes a UTF-8 BOM, the labels and exactly the preview rows', () => {
    const rows = [
      { studentNo: '2026-0001', studentName: 'Rahim' },
      { studentNo: '2026-0002', studentName: 'অ্যাশা' },
    ]
    const csv = reportCsv(rows, columns, labels)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"Student no","Student"')
    expect(csv).toContain('"2026-0001","Rahim"')
    expect(csv).toContain('"2026-0002","অ্যাশা"')
    expect(csv.trim().split('\r\n')).toHaveLength(3)
    expect(keyedRows(rows, columns)).toEqual([
      { studentNo: '2026-0001', studentName: 'Rahim' },
      { studentNo: '2026-0002', studentName: 'অ্যাশা' },
    ])
  })
})

describe('student list report', () => {
  async function seeded() {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })
    const c = makeAuditContext('reports-test')
    const base = { created_at: 1, updated_at: 1, deleted_at: null, version: 1 }
    await insert(db, c, 'academic_years', {
      ...base,
      id: 'ay-1',
      name: '2026',
      starts_on: '2026-01-01',
      ends_on: '2026-12-31',
      is_current: 1,
    })
    for (const [id, name] of [
      ['c-1', 'Class 10'],
      ['c-2', 'Class 9'],
    ] as const) {
      await insert(db, c, 'classes', { ...base, id, name, sort_order: 1 })
    }
    for (const [id, classId] of [
      ['b-1', 'c-1'],
      ['b-2', 'c-2'],
    ] as const) {
      await insert(db, c, 'batches', {
        ...base,
        id,
        academic_year_id: 'ay-1',
        class_id: classId,
        name: id,
        days_mask: 62,
        start_time: '09:00',
        end_time: '10:00',
        capacity: 30,
        monthly_fee_minor: 1000,
        status: 'active',
      })
    }
    for (const [id, name, admittedOn, batchId] of [
      ['s-1', 'Rahim', '2026-03-01', 'b-1'],
      ['s-2', 'Karim', '2026-04-01', 'b-2'],
      ['s-3', 'Asha', '2026-03-15', 'b-1'],
    ] as const) {
      await insert(db, c, 'students', {
        ...base,
        id,
        student_no: `2026-${id}`,
        full_name: name,
        admitted_on: admittedOn,
      })
      await insert(db, c, 'enrollments', {
        ...base,
        id: `e-${id}`,
        student_id: id,
        batch_id: batchId,
        enrolled_on: admittedOn,
        monthly_fee_minor: 1000,
        discount_kind: 'none',
        discount_value: 0,
      })
    }
    return db
  }

  it('returns all rows for the full range, in order', async () => {
    const rows = await studentListRows(await seeded(), all)
    expect(rows.map((row) => row.studentName)).toEqual(['Rahim', 'Asha', 'Karim'])
  })

  it('applies the date range, batch and class filters', async () => {
    const db = await seeded()
    const march = await studentListRows(db, { ...all, from: '2026-03-01', to: '2026-03-31' })
    expect(march.map((row) => row.studentName)).toEqual(['Rahim', 'Asha'])

    const byBatch = await studentListRows(db, { ...all, batchId: 'b-2' })
    expect(byBatch.map((row) => row.studentName)).toEqual(['Karim'])

    const byClass = await studentListRows(db, { ...all, classId: 'c-1' })
    expect(byClass.map((row) => row.studentName)).toEqual(['Rahim', 'Asha'])
  })
})

describe('report catalogue (T-072)', () => {
  const base = { created_at: 1, updated_at: 1, deleted_at: null, version: 1 }

  async function seeded() {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })
    const c = makeAuditContext('catalogue-test')
    await insert(db, c, 'academic_years', {
      ...base,
      id: 'ay-1',
      name: '2026',
      starts_on: '2026-01-01',
      ends_on: '2026-12-31',
      is_current: 1,
    })
    await insert(db, c, 'classes', { ...base, id: 'c-1', name: 'Class 10', sort_order: 1 })
    await insert(db, c, 'batches', {
      ...base,
      id: 'b-1',
      academic_year_id: 'ay-1',
      class_id: 'c-1',
      name: 'Morning',
      days_mask: 62,
      start_time: '09:00',
      end_time: '10:00',
      capacity: 30,
      monthly_fee_minor: 1000,
      status: 'active',
    })
    for (const [id, name] of [
      ['s-1', 'Rahim'],
      ['s-2', 'Karim'],
    ] as const) {
      await insert(db, c, 'students', {
        ...base,
        id,
        student_no: `2026-${id}`,
        full_name: name,
        admitted_on: '2026-03-01',
      })
      await insert(db, c, 'enrollments', {
        ...base,
        id: `e-${id}`,
        student_id: id,
        batch_id: 'b-1',
        enrolled_on: '2026-01-01',
        monthly_fee_minor: 1000,
        discount_kind: 'none',
        discount_value: 0,
      })
      await insert(db, c, 'charges', {
        ...base,
        id: `ch-${id}`,
        enrollment_id: `e-${id}`,
        student_id: id,
        month: null,
        kind: 'admission',
        amount_minor: 1000,
        discount_minor: 0,
      })
    }
    await insert(db, c, 'payments', {
      ...base,
      id: 'p-1',
      receipt_no: 'R-2026-000001',
      student_id: 's-1',
      paid_on: '2026-03-02',
      amount_minor: 400,
      status: 'valid',
      revision: 0,
    })
    await db.run(
      'INSERT INTO payment_allocations (payment_id, charge_id, amount_minor) VALUES (?, ?, ?)',
      ['p-1', 'ch-s-1', 40000],
    )
    await insert(db, c, 'attendance_sessions', {
      ...base,
      id: 'as-1',
      batch_id: 'b-1',
      held_on: '2026-03-02',
    })
    for (const [student, status] of [
      ['s-1', 'present'],
      ['s-2', 'absent'],
    ] as const) {
      await db.run(
        'INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)',
        ['as-1', student, status],
      )
    }
    await insert(db, c, 'exams', {
      ...base,
      id: 'x-1',
      batch_id: 'b-1',
      subject_id: null,
      name: 'Test',
      held_on: '2026-03-03',
      full_marks: 100,
      pass_marks: 33,
    })
    for (const [student, marks] of [
      ['s-1', 90],
      ['s-2', 70],
    ] as const) {
      await db.run(
        'INSERT INTO exam_results (exam_id, student_id, marks, absent, updated_at) VALUES (?, ?, ?, 0, 1)',
        ['x-1', student, marks],
      )
    }
    return db
  }

  it('registers every catalogue report except the admin report (T-073)', () => {
    expect(getReport('students')).toBeDefined()
    expect(getReport('admissions')).toBeDefined()
    expect(getReport('payments')).toBeDefined()
    expect(getReport('dues')).toBeDefined()
    expect(getReport('receipts')).toBeDefined()
    expect(getReport('attendance')).toBeDefined()
    expect(getReport('results')).toBeDefined()
    expect(getReport('admin')).toBeUndefined()
  })

  it('matches the payments module for collections, dues and receipts', async () => {
    const db = await seeded()
    const payments = await paymentsRegisterRows(db, all)
    const valid = (await listRecordedPayments(db)).filter((row) => row.status === 'valid')
    expect(getReport('payments')?.total?.(payments)).toBe('400')
    expect(payments).toHaveLength(valid.length)

    const dues = await duesRows(db, all)
    const moduleDues = await duesReport(db)
    expect(getReport('dues')?.total?.(dues)).toBe(
      formatMinor(moduleDues.reduce((sum, row) => sum + row.dueMinor, 0)),
    )

    const receipts = await receiptsRows(db, all)
    expect(receipts).toHaveLength((await receiptsForExport(db)).length)
  })

  it('matches admissions to the students module and shapes attendance/results', async () => {
    const db = await seeded()
    const admissions = await admissionsRows(db, all)
    expect(admissions).toHaveLength((await listStudents(db)).length)

    const attendance = await attendanceRows(db, all)
    expect(attendance.map((row) => row.rate)).toEqual([100, 0])

    const results = await resultSheetRows(db, all)
    expect(results.map((row) => row.marks)).toEqual([70, 90])
    expect(getReport('results')?.total?.(results)).toBe('80')
  })

  it('filters catalogue reports by batch and class', async () => {
    const db = await seeded()
    expect(await admissionsRows(db, { ...all, batchId: 'b-1' })).toHaveLength(2)
    expect(await paymentsRegisterRows(db, { ...all, classId: 'c-1' })).toHaveLength(1)
    expect(await attendanceRows(db, { ...all, batchId: '' })).toHaveLength(2)
  })
})
