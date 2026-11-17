/** Unit tests for receipt print data and export rows (T-054, D-050). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { years, classes, batches } from '@/modules/academics/repository'
import { create as createStudent } from '@/modules/students/repository'
import { create as createEnrollment } from '@/modules/enrollments/repository'
import { generateCharges } from './service'
import { recordPayment, voidPayment } from './payment-service'
import { receiptForPrint, receiptsForExport } from './receipt'

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
  const classId = await classes.create(db, ctx, { name: 'Class 11', sort_order: 1 })
  const batchId = await batches.create(db, ctx, {
    academic_year_id: yearId,
    class_id: classId,
    name: 'A',
    days_mask: 2,
    start_time: '09:00',
    end_time: '10:00',
    room: 'A',
    capacity: 10,
    monthly_fee_minor: 100000,
    status: 'active',
  })
  const studentId = await createStudent(db, ctx, {
    student_no: '2026-0142',
    full_name: 'রহিম উদ্দিন',
    admitted_on: '2026-01-01',
    status: 'active',
  })
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
  await generateCharges(db, '2026-02')
  const payment = await recordPayment(db, {
    studentId,
    paidOn: '2026-02-10',
    method: 'cash',
    amountMinor: 6000,
    note: '',
  })
  return { db, studentId, payment }
}

describe('receipt print data', () => {
  it('carries every printed field including the covered months and Bangla name', async () => {
    const { db, payment } = await setup()
    const receipt = await receiptForPrint(db, payment.id)
    expect(receipt).toMatchObject({
      receiptNo: 'R-2026-000001',
      paidOn: '2026-02-10',
      studentName: 'রহিম উদ্দিন',
      studentNo: '2026-0142',
      batchName: 'A',
      centreName: 'Coaching Manager',
      amountMinor: 6000,
      method: 'cash',
      balanceDueMinor: 0,
      status: 'valid',
      revision: 0,
    })
    expect(receipt?.months).toEqual([null, '2026-02'])
  })

  it('returns null for an unknown receipt', async () => {
    const { db } = await setup()
    expect(await receiptForPrint(db, 'missing')).toBeNull()
  })

  it('shows the balance due again when the payment is voided', async () => {
    const { db, payment } = await setup()
    await voidPayment(db, payment.id, 1)
    const receipt = await receiptForPrint(db, payment.id)
    expect(receipt?.status).toBe('void')
    expect(receipt?.balanceDueMinor).toBe(6000)
  })

  it('exports Bangla student names as plain UTF-8 text', async () => {
    const { db } = await setup()
    const rows = await receiptsForExport(db)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      receiptNo: 'R-2026-000001',
      studentName: 'রহিম উদ্দিন',
      studentNo: '2026-0142',
      amountMinor: 6000,
    })
  })
})
