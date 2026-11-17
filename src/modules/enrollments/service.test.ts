/** Unit tests for enrollment service rules (T-043, D-044). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { batches, classes, years } from '@/modules/academics/repository'
import { create as createStudent } from '@/modules/students/repository'
import * as repo from './repository'
import {
  capacityWarningFor,
  discountedMonthlyFee,
  enroll,
  feeDefaultsForBatch,
  listForStudent,
  removeEnrollment,
  setLeaveDate,
  transfer,
} from './service'
import type { EnrollmentForm } from './types'

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
  const mkBatch = (name: string, capacity: number) =>
    batches.create(db, ctx, {
      academic_year_id: yearId,
      class_id: classId,
      name,
      days_mask: 2,
      start_time: '09:00',
      end_time: '10:00',
      room: name,
      capacity,
      monthly_fee_minor: 100000,
      status: 'active',
    })
  const batchA = await mkBatch('A', 1)
  const batchB = await mkBatch('B', 10)
  const studentId = await createStudent(db, ctx, {
    student_no: '2026-0001',
    full_name: 'Rahim',
    admitted_on: '2026-01-01',
    status: 'active',
  })
  const form = (overrides: Partial<EnrollmentForm> = {}): EnrollmentForm => ({
    studentId,
    batchId: batchA,
    enrolledOn: '2026-01-10',
    leftOn: '',
    admissionFee: '0',
    monthlyFee: '100000',
    discountKind: 'none',
    discountValue: '0',
    ...overrides,
  })
  return { db, ctx, batchA, batchB, studentId, form }
}

describe('enrollments service', () => {
  it('enrolls a student with a fixed or percent discount in integer paisa', async () => {
    const { db, form } = await setup()
    const fixed = await enroll(db, form({ discountKind: 'fixed', discountValue: '5000' }))
    const percent = await enroll(db, form({ discountKind: 'percent', discountValue: '10' }))

    const rows = await listForStudent(db, form().studentId)
    const byId = (id: string) => rows.find((row) => row.id === id)
    expect(byId(fixed)).toMatchObject({ discount_kind: 'fixed', discount_value: 5000 })
    expect(byId(percent)).toMatchObject({ discount_kind: 'percent', discount_value: 10 })
    expect(discountedMonthlyFee(100000, 'percent', 10)).toBe(90000)
    expect(discountedMonthlyFee(100000, 'fixed', 5000)).toBe(95000)
    expect(discountedMonthlyFee(100000, 'none', 0)).toBe(100000)
  })

  it('transfers in one transaction: the old enrollment closes and stays in history', async () => {
    const { db, form, batchB } = await setup()
    const oldId = await enroll(db, form())
    const newId = await transfer(db, oldId, 1, form({ batchId: batchB, enrolledOn: '2026-02-01' }))

    const rows = await listForStudent(db, form().studentId)
    expect(rows.find((row) => row.id === oldId)).toMatchObject({
      status: 'closed',
      left_on: '2026-02-01',
    })
    expect(rows.find((row) => row.id === newId)).toMatchObject({ status: 'active' })

    const actions = await db.query<{ action: string }>(
      "SELECT action FROM audit_log WHERE entity = 'enrollments' ORDER BY at, id",
    )
    expect(actions.map((a) => a.action)).toEqual(['create', 'update', 'create'])
  })

  it('warns when the target batch is over capacity, without blocking the save', async () => {
    const { db, form, batchA } = await setup() // batch A has capacity 1
    expect(await capacityWarningFor(db, batchA)).toBe(false)
    // One enrollment makes the capacity-1 batch full; adding another would exceed it, so warn.
    await enroll(db, form({ batchId: batchA }))
    expect(await capacityWarningFor(db, batchA)).toBe(true)
  })

  it('defaults fees from the batch through academics public data', async () => {
    const { db, batchA } = await setup()
    expect(await feeDefaultsForBatch(db, batchA)).toEqual({
      monthlyFee: '100000',
      admissionFee: '0',
    })
  })

  it('sets a leave date and soft-deletes an enrollment', async () => {
    const { db, form } = await setup()
    const id = await enroll(db, form())
    await setLeaveDate(db, id, 1, '2026-03-01')
    expect((await repo.byId(db, id))?.left_on).toBe('2026-03-01')
    await removeEnrollment(db, id, 2)
    expect(await repo.byId(db, id)).toBeUndefined()
  })

  it('rejects invalid discounts and leave dates at the boundary', async () => {
    const { db, form } = await setup()
    await expect(enroll(db, form({ leftOn: '2026-01-01' }))).rejects.toThrow()
    await expect(
      enroll(db, form({ discountKind: 'percent', discountValue: '0' })),
    ).rejects.toThrow()
    await expect(
      enroll(db, form({ discountKind: 'percent', discountValue: '150' })),
    ).rejects.toThrow()
    // A defensive net-fee helper never throws, even for a corrupt legacy row.
    expect(discountedMonthlyFee(100000, 'percent', 150)).toBe(100000)
    expect(discountedMonthlyFee(100000, 'percent', Number.NaN)).toBe(100000)
  })

  it('closing via a leave date marks the enrollment closed', async () => {
    const { db, form } = await setup()
    const id = await enroll(db, form())
    await setLeaveDate(db, id, 1, '2026-03-01')
    expect(await repo.byId(db, id)).toMatchObject({ status: 'closed', left_on: '2026-03-01' })
    await expect(setLeaveDate(db, id, 2, '2026-01-01')).rejects.toThrow()
  })
})
