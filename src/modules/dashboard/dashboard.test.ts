/** Unit tests for the dashboard read model (T-070, D-056). */
import { describe, expect, it } from 'vitest'
import { recordFileExport } from '@/core/backup/health'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { insert } from '@/core/db/repository'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { sumMinor } from '@/core/money/money'
import { duesReport, listRecordedPayments } from '@/modules/payments'
import { listActive } from '@/modules/enrollments'
import { listStudents } from '@/modules/students'
import { dashboardData } from './service'

/** 2026-03-02 is a Monday in Dhaka; days_mask 62 covers Monday–Friday. */
const NOW = Date.UTC(2026, 2, 2, 12, 0, 0)
const base = { created_at: 1, updated_at: 1, deleted_at: null, version: 1 }

async function seeded() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  const c = makeAuditContext('dashboard-test')
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
  const roster: Array<[string, string, string]> = [
    ['d-1', 'Rahim', '2026-03-01'],
    ['d-2', 'Karim', '2026-03-01'],
    ['d-3', 'Asha', '2026-03-01'],
    ['d-4', 'Old Student', '2025-12-01'],
  ]
  for (const [id, name, admittedOn] of roster) {
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
      enrolled_on: '2026-01-01',
      monthly_fee_minor: 100000,
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
      amount_minor: 100000,
      discount_minor: 0,
    })
  }
  await insert(db, c, 'payments', {
    ...base,
    id: 'p-1',
    receipt_no: 'R-2026-000001',
    student_id: 'd-1',
    paid_on: '2026-03-02',
    amount_minor: 40000,
    status: 'valid',
    revision: 0,
  })
  await insert(db, c, 'payments', {
    ...base,
    id: 'p-2',
    receipt_no: 'R-2026-000002',
    student_id: 'd-2',
    paid_on: '2026-03-02',
    amount_minor: 50000,
    status: 'void',
    revision: 0,
  })
  await db.run(
    'INSERT INTO payment_allocations (payment_id, charge_id, amount_minor) VALUES (?, ?, ?)',
    ['p-1', 'ch-d-1', 40000],
  )
  // One attendance session: Rahim present twice, Karim present once of two (50% -> low).
  await insert(db, c, 'attendance_sessions', {
    ...base,
    id: 'as-1',
    batch_id: 'b-1',
    held_on: '2026-03-02',
  })
  for (const [student, status] of [
    ['d-1', 'present'],
    ['d-2', 'present'],
    ['d-3', 'absent'],
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
    held_on: '2026-03-01',
    full_marks: 100,
    pass_marks: 33,
  })
  for (const [student, marks] of [
    ['d-1', 90],
    ['d-2', 80],
  ] as const) {
    await db.run(
      'INSERT INTO exam_results (exam_id, student_id, marks, absent, updated_at) VALUES (?, ?, ?, 0, 1)',
      ['x-1', student, marks],
    )
  }
  return db
}

describe('dashboard data', () => {
  it('matches the payments and students modules for the same data', async () => {
    const db = await seeded()
    const data = await dashboardData(db, NOW)
    const payments = await listRecordedPayments(db)
    const dues = await duesReport(db)
    const students = await listStudents(db)
    const active = await listActive(db)

    expect(data.collectedMinor).toBe(40000)
    expect(data.collectedMinor).toBe(
      sumMinor(payments.filter((p) => p.status === 'valid').map((p) => Number(p.amount_minor))),
    )
    expect(data.dueMinor).toBe(360000)
    expect(data.dueMinor).toBe(sumMinor(dues.map((row) => row.dueMinor)))
    expect(data.admissionsThisMonth).toBe(3)
    expect(data.admissionsThisMonth).toBe(
      students.filter((s) => String(s.admitted_on).startsWith('2026-03')).length,
    )
    expect(data.activeStudents).toBe(4)
    expect(data.activeStudents).toBe(new Set(active.map((row) => String(row.student_id))).size)
  })

  it('reports today’s batches, low attendance and recent toppers', async () => {
    const data = await dashboardData(await seeded(), NOW)
    expect(data.todaysBatches).toBe(1)
    expect(data.lowAttendance).toBe(1)
    expect(data.recentToppers).toEqual([
      { name: 'Rahim', marks: 90 },
      { name: 'Karim', marks: 80 },
    ])
  })

  it('warns when the last file export is missing or stale, and clears after an export', async () => {
    const db = await seeded()
    expect((await dashboardData(db, NOW)).backupStale).toBe(true)
    await recordFileExport(db, NOW)
    expect((await dashboardData(db, NOW)).backupStale).toBe(false)
  })
})
