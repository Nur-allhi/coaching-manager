/** Unit tests for the academics repository (T-041, D-042 A1). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { ChildrenExistError, VersionConflictError } from '@/core/db/repository'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { batches, classes, subjects, years } from './repository'

async function freshDb() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  return db
}

const ctx = () => makeAuditContext('test-actor')

async function parents(db: Awaited<ReturnType<typeof freshDb>>) {
  const yearId = await years.create(db, ctx(), {
    name: '2026',
    starts_on: '2026-01-01',
    ends_on: '2026-12-31',
    is_current: 1,
  })
  const classId = await classes.create(db, ctx(), { name: 'Class 11', sort_order: 1 })
  return { yearId, classId }
}

describe('academics repository', () => {
  it('creates, reads, updates and soft-deletes an academic year', async () => {
    const db = await freshDb()
    const id = await years.create(db, ctx(), {
      name: '2026',
      starts_on: '2026-01-01',
      ends_on: '2026-12-31',
      is_current: 1,
    })
    expect((await years.byId(db, id))?.name).toBe('2026')

    await years.update(db, ctx(), id, { name: '2027' }, 1)
    expect((await years.byId(db, id))?.name).toBe('2027')
    expect((await years.byId(db, id))?.version).toBe(2)

    await years.remove(db, ctx(), id, 2)
    expect(await years.byId(db, id)).toBeUndefined()
    expect(await years.list(db)).toEqual([])
  })

  it('writes an audit row with before and after snapshots for each write', async () => {
    const db = await freshDb()
    const id = await classes.create(db, ctx(), { name: 'Class 9', sort_order: 1 })
    await classes.update(db, ctx(), id, { name: 'Class 10' }, 1)
    await classes.remove(db, ctx(), id, 2)

    const rows = await db.query<{
      action: string
      before_json: string | null
      after_json: string | null
    }>(
      "SELECT action, before_json, after_json FROM audit_log WHERE entity = 'classes' ORDER BY at, id",
    )
    expect(rows.map((row) => row.action)).toEqual(['create', 'update', 'delete'])
    expect(rows[1]?.before_json).toContain('Class 9')
    expect(rows[1]?.after_json).toContain('Class 10')
  })

  it('refuses a stale version and leaves the row unchanged', async () => {
    const db = await freshDb()
    const id = await subjects.create(db, ctx(), { name: 'Physics', code: 'PHY' })
    await expect(subjects.update(db, ctx(), id, { name: 'Chemistry' }, 9)).rejects.toBeInstanceOf(
      VersionConflictError,
    )
    expect((await subjects.byId(db, id))?.name).toBe('Physics')
  })

  it('refuses to delete a parent that still has live batches', async () => {
    const db = await freshDb()
    const { yearId, classId } = await parents(db)
    const batchId = await batches.create(db, ctx(), {
      academic_year_id: yearId,
      class_id: classId,
      name: 'Morning',
      days_mask: 2,
      start_time: '09:00',
      end_time: '10:00',
      room: '101',
      capacity: 40,
      monthly_fee_minor: 100000,
      status: 'active',
    })

    await expect(years.remove(db, ctx(), yearId, 1)).rejects.toBeInstanceOf(ChildrenExistError)
    await expect(classes.remove(db, ctx(), classId, 1)).rejects.toBeInstanceOf(ChildrenExistError)

    await batches.remove(db, ctx(), batchId, 1)
    await years.remove(db, ctx(), yearId, 1)
    expect(await years.byId(db, yearId)).toBeUndefined()
  })

  it('stores the monthly fee as integer paisa', async () => {
    const db = await freshDb()
    const { yearId, classId } = await parents(db)
    const id = await batches.create(db, ctx(), {
      academic_year_id: yearId,
      class_id: classId,
      name: 'Evening',
      days_mask: 64,
      start_time: '17:00',
      end_time: '18:30',
      room: null,
      capacity: null,
      monthly_fee_minor: 125050,
      status: 'active',
    })
    const row = await batches.byId(db, id)
    expect(row?.monthly_fee_minor).toBe(125050)
    expect(Number.isInteger(row?.monthly_fee_minor)).toBe(true)
  })
})
