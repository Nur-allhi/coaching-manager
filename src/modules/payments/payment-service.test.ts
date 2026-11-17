/** Unit tests for payment recording and allocation (T-051, D-047). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { VersionConflictError } from '@/core/db/repository'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { years, classes, batches } from '@/modules/academics/repository'
import { create as createStudent } from '@/modules/students/repository'
import { create as createEnrollment } from '@/modules/enrollments/repository'
import { generateCharges } from './service'
import {
  allocateAdvances,
  duesForStudent,
  editPayment,
  recordPayment,
  voidPayment,
  type PaymentInput,
} from './payment-service'

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
    student_no: '2026-0001',
    full_name: 'Rahim',
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
  await generateCharges(db, '2026-02') // admission 5000 + monthly 1000 = 6000 due
  const payment = (overrides: Partial<PaymentInput> = {}): PaymentInput => ({
    studentId,
    paidOn: '2026-02-10',
    method: 'cash',
    amountMinor: 2000,
    note: '',
    ...overrides,
  })
  return { db, studentId, payment }
}

describe('recording a payment', () => {
  it('allocates a partial payment to the oldest charge and leaves the correct remainder', async () => {
    const { db, payment } = await setup()
    const result = await recordPayment(db, payment({ amountMinor: 6000 }))
    expect(result.receiptNo).toBe('R-2026-000001')
    expect(result.advanceMinor).toBe(0)
    expect(result.allocatedMinor).toBe(6000)
    expect(await duesForStudent(db, payment().studentId)).toMatchObject({ totalDueMinor: 0 })

    const allocations = await db.query<{ amount_minor: number }>(
      'SELECT amount_minor FROM payment_allocations WHERE payment_id = ?',
      [result.id],
    )
    expect(allocations.reduce((sum, row) => sum + row.amount_minor, 0)).toBe(6000)
  })

  it('never allocates more than the payment amount', async () => {
    const { db, payment } = await setup()
    const result = await recordPayment(db, payment({ amountMinor: 2500 }))
    const sum = await db.query<{ n: number }>(
      'SELECT COALESCE(SUM(amount_minor),0) AS n FROM payment_allocations WHERE payment_id = ?',
      [result.id],
    )
    expect(sum[0]?.n).toBe(2500)
    expect(result.advanceMinor).toBe(0)
    expect((await duesForStudent(db, payment().studentId)).totalDueMinor).toBe(3500)
  })

  it('keeps receipt numbers unique and gapless across payments', async () => {
    const { db, payment } = await setup()
    const a = await recordPayment(db, payment({ amountMinor: 1000 }))
    const b = await recordPayment(db, payment({ amountMinor: 1000 }))
    const c = await recordPayment(db, payment({ amountMinor: 1000 }))
    expect([a.receiptNo, b.receiptNo, c.receiptNo]).toEqual([
      'R-2026-000001',
      'R-2026-000002',
      'R-2026-000003',
    ])
  })

  it('keeps an overpayment as an advance and applies it to later charges', async () => {
    const { db, payment } = await setup()
    const advance = await recordPayment(db, payment({ amountMinor: 9000 }))
    expect(advance.advanceMinor).toBe(3000)
    expect((await duesForStudent(db, payment().studentId)).totalDueMinor).toBe(0)

    // A new monthly charge appears; the advance is applied automatically on generation.
    await generateCharges(db, '2026-03')
    expect((await duesForStudent(db, payment().studentId)).totalDueMinor).toBe(0)
    const advanceAllocations = await db.query<{ amount_minor: number }>(
      'SELECT amount_minor FROM payment_allocations WHERE payment_id = ?',
      [advance.id],
    )
    expect(advanceAllocations.reduce((sum, row) => sum + row.amount_minor, 0)).toBe(7000)
  })

  it('exposes a no-op advance allocator when nothing is outstanding', async () => {
    const { db } = await setup()
    expect(await allocateAdvances(db)).toBe(0)
  })

  it('applies a later advance even when an earlier payment is fully used', async () => {
    const { db, payment } = await setup()
    await recordPayment(db, payment({ amountMinor: 6000 })) // exactly covers the current dues
    await recordPayment(db, payment({ amountMinor: 5000 })) // pure advance, spare 5000
    await generateCharges(db, '2026-03') // new 1000 charge
    expect((await duesForStudent(db, payment().studentId)).totalDueMinor).toBe(0)
  })

  it('audits every allocation in the same transaction', async () => {
    const { db, payment } = await setup()
    await recordPayment(db, payment({ amountMinor: 2000 }))
    const rows = await db.query<{ entity: string }>(
      "SELECT entity FROM audit_log WHERE entity = 'payment_allocations'",
    )
    expect(rows.length).toBeGreaterThan(0)
  })

  it('rejects a zero or negative amount at the boundary', async () => {
    const { db, payment } = await setup()
    await expect(recordPayment(db, payment({ amountMinor: 0 }))).rejects.toThrow()
    await expect(recordPayment(db, payment({ amountMinor: -1 }))).rejects.toThrow()
  })
})

describe('editing and voiding a payment', () => {
  const edit = (amountMinor: number) => ({
    paidOn: '2026-02-10',
    method: 'cash' as const,
    amountMinor,
    note: 'edited',
  })

  it('keeps the receipt number and increments the revision on edit', async () => {
    const { db, payment } = await setup()
    const recorded = await recordPayment(db, payment({ amountMinor: 2000 }))
    const edited = await editPayment(db, recorded.id, edit(3000), 1)

    expect(edited.receiptNo).toBe('R-2026-000001')
    expect(edited.revision).toBe(1)
    const rows = await db.query<{ receipt_no: string; revision: number; version: number; amount_minor: number }>(
      'SELECT receipt_no, revision, version, amount_minor FROM payments WHERE id = ?',
      [recorded.id],
    )
    expect(rows[0]).toMatchObject({
      receipt_no: 'R-2026-000001',
      revision: 1,
      version: 2,
      amount_minor: 3000,
    })
  })

  it('re-runs allocation so dues reflect the edited amount', async () => {
    const { db, payment, studentId } = await setup()
    const recorded = await recordPayment(db, payment({ amountMinor: 2000 }))
    expect((await duesForStudent(db, studentId)).totalDueMinor).toBe(4000)

    const first = await editPayment(db, recorded.id, edit(3000), 1)
    expect((await duesForStudent(db, studentId)).totalDueMinor).toBe(3000)
    await editPayment(db, recorded.id, edit(1000), 2)
    const rows = await db.query<{ revision: number }>('SELECT revision FROM payments WHERE id = ?', [recorded.id])
    expect(rows[0]?.revision).toBe(2)
    expect((await duesForStudent(db, studentId)).totalDueMinor).toBe(5000)
    expect(first.allocatedMinor).toBe(3000)
  })

  it('keeps the row and allocations but stops them counting when voided', async () => {
    const { db, payment, studentId } = await setup()
    const recorded = await recordPayment(db, payment({ amountMinor: 6000 }))
    expect((await duesForStudent(db, studentId)).totalDueMinor).toBe(0)

    await voidPayment(db, recorded.id, 1)
    expect((await duesForStudent(db, studentId)).totalDueMinor).toBe(6000)
    const rows = await db.query<{ status: string; receipt_no: string }>(
      'SELECT status, receipt_no FROM payments WHERE id = ?',
      [recorded.id],
    )
    expect(rows[0]).toMatchObject({ status: 'void', receipt_no: 'R-2026-000001' })
    const allocations = await db.query<{ n: number }>(
      'SELECT COUNT(*) AS n FROM payment_allocations WHERE payment_id = ?',
      [recorded.id],
    )
    expect(allocations[0]?.n).toBeGreaterThan(0)
  })

  it('refuses to edit a void payment', async () => {
    const { db, payment } = await setup()
    const recorded = await recordPayment(db, payment({ amountMinor: 2000 }))
    await voidPayment(db, recorded.id, 1)
    await expect(editPayment(db, recorded.id, edit(3000), 2)).rejects.toMatchObject({
      key: 'payments.cannotEdit',
    })
  })

  it('rolls back the allocation deletion and revision on a stale version', async () => {
    const { db, payment, studentId } = await setup()
    const recorded = await recordPayment(db, payment({ amountMinor: 2000 }))
    await expect(editPayment(db, recorded.id, edit(3000), 99)).rejects.toBeInstanceOf(VersionConflictError)
    expect((await duesForStudent(db, studentId)).totalDueMinor).toBe(4000)
    const rows = await db.query<{ revision: number }>('SELECT revision FROM payments WHERE id = ?', [recorded.id])
    expect(rows[0]?.revision).toBe(0)
  })
})
