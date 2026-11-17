/** Unit tests for the admin report (T-073, D-059). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { insert } from '@/core/db/repository'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { listRecordedPayments, duesReport } from '@/modules/payments'
import { listStudents } from '@/modules/students'
import { adminExportRows } from './admin-export'
import { adminReport, type AdminScope } from './queries/admin'

const scope: AdminScope = { kind: 'month', month: '2026-03' }
const base = { created_at: 1, updated_at: 1, deleted_at: null, version: 1 }

async function seeded() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  const c = makeAuditContext('admin-test')
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
    monthly_fee_minor: 100000,
    status: 'active',
  })
  for (const [id, name, admittedOn] of [
    ['s-1', 'Rahim', '2026-03-01'],
    ['s-2', 'Karim', '2026-03-01'],
    ['s-3', 'Old', '2025-12-01'],
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
      batch_id: 'b-1',
      enrolled_on: admittedOn,
      monthly_fee_minor: 100000,
      discount_kind: 'none',
      discount_value: 0,
      status: id === 's-3' ? 'closed' : 'active',
      left_on: id === 's-3' ? '2026-03-15' : null,
    })
    if (id !== 's-3') {
      await insert(db, c, 'charges', {
        ...base,
        id: `ch-${id}`,
        enrollment_id: `e-${id}`,
        student_id: id,
        month: null,
        kind: 'admission',
        amount_minor: 100000,
        discount_minor: 0,
      })
    }
  }
  await insert(db, c, 'payments', {
    ...base,
    id: 'p-1',
    receipt_no: 'R-2026-000001',
    student_id: 's-1',
    paid_on: '2026-03-02',
    amount_minor: 40000,
    status: 'valid',
    revision: 0,
  })
  await insert(db, c, 'payments', {
    ...base,
    id: 'p-2',
    receipt_no: 'R-2026-000002',
    student_id: 's-2',
    paid_on: '2026-03-02',
    amount_minor: 50000,
    status: 'void',
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
    ['s-2', 80],
  ] as const) {
    await db.run(
      'INSERT INTO exam_results (exam_id, student_id, marks, absent, updated_at) VALUES (?, ?, ?, 0, 1)',
      ['x-1', student, marks],
    )
  }
  return db
}

describe('admin report', () => {
  it('includes every section and matches the payments and students modules', async () => {
    const db = await seeded()
    const report = await adminReport(db, scope)
    const payments = await listRecordedPayments(db)
    const due = await duesReport(db)
    const students = await listStudents(db)

    expect(report.admissions).toBe(2)
    expect(report.admissions).toBe(
      students.filter((student) => String(student.admitted_on).startsWith('2026-03')).length,
    )
    expect(report.dropouts).toBe(1)
    expect(report.collectedMinor).toBe(40000)
    expect(report.collectedMinor).toBe(
      payments
        .filter((payment) => payment.status === 'valid')
        .reduce((sum, p) => sum + Number(p.amount_minor), 0),
    )
    expect(report.dueMinor).toBe(due.reduce((sum, row) => sum + row.dueMinor, 0))
    expect(report.methodSplit).toEqual([{ method: 'cash', amountMinor: 40000 }])
    expect(report.attendanceRate).toBe(50)
    expect(report.topPerformers).toEqual([
      { name: 'Rahim', marks: 90 },
      { name: 'Karim', marks: 80 },
    ])
    expect(report.netMinor).toBe(40000 - report.dueMinor)
    expect(report.admissionsByClass).toEqual([{ name: 'Class 10', count: 2 }])
    expect(report.admissionsByBatch).toEqual([{ name: 'Morning', count: 2 }])
  })

  it('resolves an academic-year scope to its stored range', async () => {
    const db = await seeded()
    const report = await adminReport(db, { kind: 'year', academicYearId: 'ay-1' })
    expect(report.from).toBe('2026-01-01')
    expect(report.to).toBe('2026-12-31')
  })

  it('exports every section as a row', async () => {
    const report = await adminReport(await seeded(), scope)
    const rows = adminExportRows(report, {
      range: 'Range',
      from: 'From',
      to: 'To',
      admissions: 'Admissions',
      total: 'Total',
      className: 'Class',
      batchName: 'Batch',
      dropouts: 'Drop-outs',
      collected: 'Collected',
      dues: 'Dues',
      methodSplit: 'Method',
      attendanceRate: 'Rate',
      topPerformers: 'Top',
      net: 'Net',
      section: 'Section',
      detail: 'Detail',
      value: 'Value',
    })
    expect(rows.map((row) => row.section)).toEqual(
      expect.arrayContaining([
        'Admissions',
        'Drop-outs',
        'Collected',
        'Dues',
        'Method',
        'Rate',
        'Top',
        'Net',
      ]),
    )
    expect(rows.some((row) => row.value === '400')).toBe(true)
  })
})
