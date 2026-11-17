/** Unit tests for academics business rules and service commands (T-041, D-042 B1/C1). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { batches, classes, years } from './repository'
import {
  AcademicsValidationError,
  capacityWarning,
  executeDelete,
  executeSave,
  findBatchClashes,
  getAll,
  toBatchPatch,
} from './service'
import { daysToMask, maskToDays, type BatchForm } from './types'

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
  const form = (overrides: Partial<BatchForm> = {}): BatchForm => ({
    academicYearId: yearId,
    classId,
    name: 'Morning',
    days: [false, true, false, false, false, false, false],
    startTime: '09:00',
    endTime: '10:00',
    room: '101',
    capacity: '40',
    monthlyFee: '1000',
    ...overrides,
  })
  return { db, form, yearId, classId }
}

async function insertBatch(
  db: Awaited<ReturnType<typeof setup>>['db'],
  patch: ReturnType<typeof toBatchPatch>,
  name: string,
) {
  return batches.create(db, makeAuditContext('test-actor'), { ...patch, name, status: 'active' })
}

describe('academics warnings', () => {
  it('flags occupancy above capacity, but never for an unlimited batch', () => {
    expect(capacityWarning(40, 41)).toBe(true)
    expect(capacityWarning(40, 40)).toBe(false)
    expect(capacityWarning(null, 10_000)).toBe(false)
  })

  it('round-trips the days bit mask (bit 0 = Sunday)', () => {
    const days = [true, false, true, false, false, false, true]
    expect(maskToDays(daysToMask(days))).toEqual(days)
    expect(daysToMask(days)).toBe(69)
  })

  it('converts form values to bound SQL values exactly once', () => {
    const patch = toBatchPatch({
      academicYearId: 'year',
      classId: 'class',
      name: '  Evening  ',
      days: [false, false, false, false, false, true, false],
      startTime: '17:00',
      endTime: '18:30',
      room: '  ',
      capacity: '',
      monthlyFee: '1250.50',
    } as BatchForm)
    expect(patch.monthly_fee_minor).toBe(125050)
    expect(patch.days_mask).toBe(32)
    expect(patch.room).toBeNull()
    expect(patch.capacity).toBeNull()
    expect(patch.name).toBe('Evening')
  })

  it('rejects an inverted time range and an empty day selection', () => {
    const { form } = setupSync()
    expect(() => toBatchPatch(form({ startTime: '11:00', endTime: '10:00' }))).toThrow(
      AcademicsValidationError,
    )
    expect(() =>
      toBatchPatch(form({ days: [false, false, false, false, false, false, false] })),
    ).toThrow(AcademicsValidationError)
  })
})

// Validation-only tests need no database; a fixed form is enough.
function setupSync() {
  const form = (overrides: Partial<BatchForm> = {}): BatchForm => ({
    academicYearId: 'year',
    classId: 'class',
    name: 'Morning',
    days: [false, true, false, false, false, false, false],
    startTime: '09:00',
    endTime: '10:00',
    room: '101',
    capacity: '40',
    monthlyFee: '1000',
    ...overrides,
  })
  return { form }
}

describe('schedule clash detection', () => {
  it('warns only for the same room, a shared day and an overlapping time span', async () => {
    const { db, form } = await setup()
    const patch = toBatchPatch(form())
    await insertBatch(db, patch, 'Existing Morning')

    expect(await findBatchClashes(db, patch)).toEqual(['Existing Morning'])
    expect(await findBatchClashes(db, toBatchPatch(form({ room: '102' })))).toEqual([])
    expect(
      await findBatchClashes(
        db,
        toBatchPatch(form({ days: [false, false, true, false, false, false, false] })),
      ),
    ).toEqual([])
    expect(
      await findBatchClashes(db, toBatchPatch(form({ startTime: '10:00', endTime: '11:00' }))),
    ).toEqual([])
  })

  it('ignores soft-deleted batches and the batch being edited', async () => {
    const { db, form } = await setup()
    const patch = toBatchPatch(form())
    const otherId = await insertBatch(db, patch, 'Other Batch')
    const selfId = await insertBatch(db, patch, 'This Batch')

    expect(await findBatchClashes(db, patch, selfId)).toEqual(['Other Batch'])
    await batches.remove(db, makeAuditContext('test-actor'), otherId, 1)
    expect(await findBatchClashes(db, patch, selfId)).toEqual([])
  })
})

describe('service commands', () => {
  it('creates, updates and deletes through the audited repository', async () => {
    const { db, form } = await setup()
    await executeSave(db, { kind: 'batches', values: form() })
    const created = (await getAll(db)).batches
    expect(created).toHaveLength(1)
    const id = String(created[0]?.id)

    await executeSave(db, { kind: 'batches', values: form({ name: 'Renamed' }), id, version: 1 })
    expect((await getAll(db)).batches[0]?.name).toBe('Renamed')

    await executeDelete(db, { kind: 'batches', id, version: 2 })
    expect((await getAll(db)).batches).toEqual([])
  })

  it('creates a year, class and subject through the same command shape', async () => {
    const { db } = await setup()
    await executeSave(db, {
      kind: 'years',
      values: { name: '2027', startsOn: '2027-01-01', endsOn: '2027-12-31', isCurrent: true },
    })
    await executeSave(db, { kind: 'classes', values: { name: 'Class 12', sortOrder: '12' } })
    await executeSave(db, { kind: 'subjects', values: { name: 'Math', code: 'MTH' } })

    const all = await getAll(db)
    expect(all.years).toHaveLength(2)
    expect(all.classes).toHaveLength(2)
    expect(all.subjects.map((row) => row.name)).toContain('Math')
  })
})
