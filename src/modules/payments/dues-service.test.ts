/** Unit tests for the dues report (T-053, D-049). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { years, classes, batches } from '@/modules/academics/repository'
import { create as createStudent } from '@/modules/students/repository'
import { create as createEnrollment } from '@/modules/enrollments/repository'
import { generateCharges } from './service'
import { recordPayment, duesForStudent, voidPayment } from './payment-service'
import { duesReport } from './dues-service'

async function setup() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  const ctx = makeAuditContext('test-actor')
  const yearId = await years.create(db, ctx, {
    name: '2026',
    starts_on: '2026-01-01',
    ends_on: '2026-12-31',
    is_current: 1,
  })
  const alpha = await classes.create(db, ctx, { name: 'Alpha', sort_order: 1 })
  const beta = await classes.create(db, ctx, { name: 'Beta', sort_order: 2 })
  const batchA = await batches.create(db, ctx, {
    academic_year_id: yearId,
    class_id: alpha,
    name: 'A',
    days_mask: 2,
    start_time: '09:00',
    end_time: '10:00',
    room: 'A',
    capacity: 10,
    monthly_fee_minor: 100000,
    status: 'active',
  })
  const batchB = await batches.create(db, ctx, {
    academic_year_id: yearId,
    class_id: beta,
    name: 'B',
    days_mask: 4,
    start_time: '11:00',
    end_time: '12:00',
    room: 'B',
    capacity: 10,
    monthly_fee_minor: 100000,
    status: 'active',
  })
  const ids: string[] = []
  for (const [index, name, batchId] of [
    [1, 'Dues One', batchA],
    [2, 'Dues Two', batchB],
    [3, 'Paid Three', batchA],
  ] as const) {
    const studentId = await createStudent(db, ctx, {
      student_no: `2026-000${index}`,
      full_name: name,
      admitted_on: '2026-01-01',
      status: 'active',
    })
    ids.push(studentId)
    await createEnrollment(db, {
      student_id: studentId,
      batch_id: batchId,
      enrolled_on: '2026-01-01',
      left_on: null,
      admission_fee_minor: 5000,
      monthly_fee_minor: 1000,
      discount_kind: 'none',
      discount_value: 0,
      status: 'active',
    })
  }
  await generateCharges(db, '2026-02')
  await recordPayment(db, {
    studentId: ids[2] ?? '',
    paidOn: '2026-02-10',
    method: 'cash',
    amountMinor: 6000,
    note: '',
  })
  return { db, ids }
}

describe('the dues report', () => {
  it('excludes students with no dues and carries batch and class labels', async () => {
    const { db } = await setup()
    const report = await duesReport(db)
    expect(report).toHaveLength(2)
    expect(report.map((row) => row.studentNo).sort()).toEqual(['2026-0001', '2026-0002'])
    expect(report.find((row) => row.studentNo === '2026-0001')).toMatchObject({
      batchName: 'A',
      className: 'Alpha',
      dueMinor: 6000,
    })
    expect(report.find((row) => row.studentNo === '2026-0002')).toMatchObject({
      batchName: 'B',
      className: 'Beta',
      dueMinor: 6000,
    })
  })

  it('totals exactly the sum of the per-student dues rule', async () => {
    const { db, ids } = await setup()
    const report = await duesReport(db)
    const reportTotal = report.reduce((sum, row) => sum + row.dueMinor, 0)
    const expected = await Promise.all(ids.map((id) => duesForStudent(db, id)))
    expect(reportTotal).toBe(expected.reduce((sum, dues) => sum + dues.totalDueMinor, 0))
  })

  it('reincludes a student when their payment is voided', async () => {
    const { db, ids } = await setup()
    const rows = await db.query<{ id: string }>('SELECT id FROM payments WHERE student_id = ?', [
      ids[2] ?? '',
    ])
    await voidPayment(db, String(rows[0]?.id), 1)
    expect(await duesReport(db)).toHaveLength(3)
  })
})
