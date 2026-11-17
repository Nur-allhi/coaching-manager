/** Unit tests for fee rules and idempotent charge generation (T-050, D-046). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { years, classes, batches } from '@/modules/academics/repository'
import { create as createStudent } from '@/modules/students/repository'
import { create as createEnrollment } from '@/modules/enrollments/repository'
import { generateCharges, generateChargesForEnrollment, listGeneratedCharges } from './service'

async function setup(discountKind: 'none' | 'fixed' | 'percent' = 'none', discountValue = 0) {
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
  const enrollmentId = await createEnrollment(db, {
    student_id: studentId,
    batch_id: batchId,
    enrolled_on: '2026-01-01',
    left_on: null,
    admission_fee_minor: 5000,
    monthly_fee_minor: 3333,
    discount_kind: discountKind,
    discount_value: discountValue,
    status: 'active',
  })
  return { db, ctx, enrollmentId, studentId }
}

describe('monthly charge generation', () => {
  it('generates an admission and a monthly charge per enrollment', async () => {
    const { db } = await setup()
    const first = await generateCharges(db, '2026-02')
    expect(first).toEqual({ created: 2, skipped: 0 })

    const charges = await listGeneratedCharges(db)
    expect(charges).toHaveLength(2)
    expect(charges.find((c) => c.kind === 'admission')).toMatchObject({
      month: null,
      amount_minor: 5000,
      discount_minor: 0,
    })
    expect(charges.find((c) => c.kind === 'monthly')).toMatchObject({
      month: '2026-02',
      amount_minor: 3333,
      discount_minor: 0,
    })
  })

  it('is idempotent: a second run creates no duplicates, even for a NULL-month charge', async () => {
    const { db } = await setup()
    await generateCharges(db, '2026-02')
    const second = await generateCharges(db, '2026-02')
    expect(second).toEqual({ created: 0, skipped: 2 })
    expect(await listGeneratedCharges(db)).toHaveLength(2)

    // Another month adds only the monthly charge; the admission charge stays unique.
    const third = await generateCharges(db, '2026-03')
    expect(third).toEqual({ created: 1, skipped: 1 })
    expect(await listGeneratedCharges(db)).toHaveLength(3)
  })

  it('rounds a percent discount exactly once to the paisa', async () => {
    const { db } = await setup('percent', 15)
    await generateCharges(db, '2026-02')
    const monthly = (await listGeneratedCharges(db)).find((c) => c.kind === 'monthly')
    expect(monthly).toMatchObject({ amount_minor: 3333, discount_minor: 500 })

    const { db: db2 } = await setup('fixed', 1000)
    await generateCharges(db2, '2026-02')
    const fixed = (await listGeneratedCharges(db2)).find((c) => c.kind === 'monthly')
    expect(fixed).toMatchObject({ amount_minor: 3333, discount_minor: 1000 })
  })

  it('the unique key, not a flag, refuses a duplicate insert', async () => {
    const { db, ctx, enrollmentId, studentId } = await setup()
    await generateCharges(db, '2026-02')
    const charge = (await listGeneratedCharges(db)).find((c) => c.kind === 'admission')
    expect(charge).toBeDefined()

    // Bypass the ON CONFLICT guard: the database key itself must reject the duplicate.
    await expect(
      db.run(
        'INSERT INTO charges (id, created_at, updated_at, deleted_at, version, ' +
          'enrollment_id, student_id, month, kind, amount_minor, discount_minor) ' +
          'VALUES (?, ?, ?, NULL, 1, ?, ?, NULL, ?, ?, ?)',
        [ctx.newId(), ctx.now, ctx.now, enrollmentId, studentId, 'admission', 5000, 0],
      ),
    ).rejects.toThrow()
  })

  it('generates for a single enrollment and validates the month', async () => {
    const { db, enrollmentId } = await setup()
    expect(await generateChargesForEnrollment(db, enrollmentId, '2026-02')).toEqual({
      created: 2,
      skipped: 0,
    })
    await expect(generateChargesForEnrollment(db, enrollmentId, '02-2026')).rejects.toThrow()
    await expect(generateCharges(db, '2026-13')).rejects.toThrow() // out-of-range month
  })
})
