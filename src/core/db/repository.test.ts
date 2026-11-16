import { describe, expect, it } from 'vitest'
import type { AuditContext } from '../audit/write'
import { migrate } from './migrate'
import { migrations } from './migrations'
import {
  ChildrenExistError,
  findById,
  insert,
  list,
  NotFoundError,
  repoWithin,
  softDelete,
  update,
  VersionConflictError,
} from './repository'
import { createBetterSqliteDb } from './testing/better-sqlite3'
import type { Db } from './types'

let sequence = 0

function context(overrides: Partial<AuditContext> = {}): AuditContext {
  sequence += 1
  return {
    actorId: 'user-1',
    now: 100 + sequence,
    newId: () => `audit-${sequence}-${Math.random().toString(36).slice(2, 8)}`,
    ...overrides,
  }
}

async function seeded() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  const ctx = context({ now: 1 })
  const id = await insert(db, ctx, 'students', {
    id: 's-1',
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    version: 1,
    student_no: '2026-0001',
    full_name: 'Rahim',
    admitted_on: '2026-01-02',
  })
  return { db, ctx, id }
}

/** Insert the academic chain an enrollment needs, with foreign keys enabled. */
async function seedEnrollment(db: Db, ctx: AuditContext, studentId: string) {
  for (const [table, row] of [
    [
      'academic_years',
      { id: 'ay-1', name: '2026', starts_on: '2026-01-01', ends_on: '2026-12-31' },
    ],
    ['classes', { id: 'c-1', name: 'Class 10' }],
  ] as const) {
    await insert(db, ctx, table, {
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
      version: 1,
      ...row,
    })
  }
  await insert(db, ctx, 'batches', {
    id: 'b-1',
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    version: 1,
    academic_year_id: 'ay-1',
    class_id: 'c-1',
    name: 'Batch A',
    days_mask: 62,
    start_time: '16:00',
    end_time: '18:00',
    monthly_fee_minor: 100000,
  })
  await insert(db, ctx, 'enrollments', {
    id: 'e-1',
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    version: 1,
    student_id: studentId,
    batch_id: 'b-1',
    enrolled_on: '2026-01-02',
    monthly_fee_minor: 100000,
  })
}

async function audits(db: Db) {
  return db.query<{
    user_id: string | null
    entity: string
    entity_id: string
    action: string
    before_json: string | null
    after_json: string | null
    undone: number
  }>('SELECT * FROM audit_log ORDER BY rowid')
}

describe('repository writes', () => {
  it('inserts a row and writes a create audit with a full after snapshot', async () => {
    const { db, id } = await seeded()
    expect(id).toBe('s-1')
    expect(await findById(db, 'students', id)).toMatchObject({ full_name: 'Rahim', version: 1 })

    const rows = await audits(db)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      user_id: 'user-1',
      entity: 'students',
      entity_id: 's-1',
      action: 'create',
      before_json: null,
      undone: 0,
    })
    expect(JSON.parse(rows[0]?.after_json ?? '{}')).toMatchObject({
      full_name: 'Rahim',
      version: 1,
    })
  })

  it('bumps version and updated_at on an update, with before and after snapshots', async () => {
    const { db, ctx, id } = await seeded()
    await update(db, ctx, 'students', id, { full_name: 'Karim' }, 1)

    expect(await findById(db, 'students', id)).toMatchObject({
      full_name: 'Karim',
      version: 2,
      updated_at: ctx.now,
      deleted_at: null,
    })
    const rows = await audits(db)
    expect(rows[1]?.action).toBe('update')
    expect(JSON.parse(rows[1]?.before_json ?? '{}')).toMatchObject({
      full_name: 'Rahim',
      version: 1,
    })
    expect(JSON.parse(rows[1]?.after_json ?? '{}')).toMatchObject({
      full_name: 'Karim',
      version: 2,
    })
  })

  it('aborts a stale update and writes no audit row', async () => {
    const { db, ctx, id } = await seeded()
    await expect(update(db, ctx, 'students', id, { full_name: 'Karim' }, 5)).rejects.toBeInstanceOf(
      VersionConflictError,
    )
    expect(await findById(db, 'students', id)).toMatchObject({ full_name: 'Rahim', version: 1 })
    expect(await audits(db)).toHaveLength(1) // only the insert
  })

  it('loses a race instead of overwriting a concurrent edit', async () => {
    const { db, ctx, id } = await seeded()
    await update(db, ctx, 'students', id, { full_name: 'Karim' }, 1)
    await expect(update(db, ctx, 'students', id, { full_name: 'Jamal' }, 1)).rejects.toBeInstanceOf(
      VersionConflictError,
    )
    await update(db, ctx, 'students', id, { full_name: 'Jamal' }, 2)
    expect(await findById(db, 'students', id)).toMatchObject({ full_name: 'Jamal', version: 3 })
  })

  it('reports a missing record as NotFound, not a conflict', async () => {
    const { db, ctx } = await seeded()
    await expect(
      update(db, ctx, 'students', 'missing', { full_name: 'X' }, 1),
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(softDelete(db, ctx, 'students', 'missing', 1)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('soft-deletes, hides the row from lists, and records its after state', async () => {
    const { db, ctx, id } = await seeded()
    await softDelete(db, ctx, 'students', id, 1)

    expect(await findById(db, 'students', id)).toBeUndefined()
    expect(await list(db, 'students')).toEqual([])
    const after = await db.query('SELECT deleted_at, version FROM students WHERE id = ?', [id])
    expect(after).toEqual([{ deleted_at: ctx.now, version: 2 }])

    const rows = await audits(db)
    expect(rows[1]?.action).toBe('delete')
    expect(JSON.parse(rows[1]?.after_json ?? '{}')).toMatchObject({
      deleted_at: ctx.now,
      version: 2,
    })
  })

  it('refuses to delete a parent that has live children, with a readable message', async () => {
    const { db, ctx, id } = await seeded()
    await seedEnrollment(db, ctx, id)

    const error = await softDelete(db, ctx, 'students', id, 1).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ChildrenExistError)
    expect((error as Error).message).toContain('1 live enrollments')
    expect(await findById(db, 'students', id)).toMatchObject({ deleted_at: null })
    expect((await audits(db)).some((row) => row.action === 'delete')).toBe(false)
  })

  it('allows the delete once the child is soft-deleted', async () => {
    const { db, ctx, id } = await seeded()
    await seedEnrollment(db, ctx, id)

    await softDelete(db, ctx, 'enrollments', 'e-1', 1)
    await softDelete(db, ctx, 'students', id, 1)
    expect(await findById(db, 'students', id)).toBeUndefined()
  })

  it('writes the change and its audit row together', async () => {
    const { db, id } = await seeded()
    expect(await findById(db, 'students', id)).toMatchObject({ full_name: 'Rahim' })
    expect(await audits(db)).toHaveLength(1) // one create audit for the one insert
  })

  it('rolls both back when the audit insert fails', async () => {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })
    let calls = 0
    const ctx = context({
      newId: () => {
        calls += 1
        return 'same-id'
      },
    })
    await insert(db, ctx, 'students', {
      id: 's-1',
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
      version: 1,
      student_no: '2026-0001',
      full_name: 'First',
      admitted_on: '2026-01-02',
    })
    // The first audit already used `same-id`, so the second write's audit insert conflicts.
    await expect(
      insert(db, ctx, 'students', {
        id: 's-9',
        created_at: 1,
        updated_at: 1,
        deleted_at: null,
        version: 1,
        student_no: '2026-0009',
        full_name: 'Second',
        admitted_on: '2026-01-02',
      }),
    ).rejects.toThrow()
    expect(calls).toBe(2)
    expect(await findById(db, 'students', 's-9')).toBeUndefined()
    expect(await audits(db)).toHaveLength(1)
  })

  it('composes several writes in one transaction without nesting', async () => {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })
    const ctx = context()

    await db.tx(async (t) => {
      const repo = repoWithin(t, ctx)
      await repo.insert('students', {
        id: 's-1',
        created_at: 1,
        updated_at: 1,
        deleted_at: null,
        version: 1,
        student_no: '2026-0001',
        full_name: 'Rahim',
        admitted_on: '2026-01-02',
      })
      await repo.update('students', 's-1', { full_name: 'Karim' }, 1)
    })

    expect(await findById(db, 'students', 's-1')).toMatchObject({ full_name: 'Karim', version: 2 })
    expect((await audits(db)).map((row) => row.action)).toEqual(['create', 'update'])
  })

  it('rolls back every composed write when one fails', async () => {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })
    const ctx = context()

    await expect(
      db.tx(async (t) => {
        const repo = repoWithin(t, ctx)
        await repo.insert('students', {
          id: 's-1',
          created_at: 1,
          updated_at: 1,
          deleted_at: null,
          version: 1,
          student_no: '2026-0001',
          full_name: 'Rahim',
          admitted_on: '2026-01-02',
        })
        await repo.update('students', 's-1', { full_name: 'Karim' }, 99) // stale
      }),
    ).rejects.toBeInstanceOf(VersionConflictError)

    expect(await findById(db, 'students', 's-1')).toBeUndefined()
    expect(await audits(db)).toEqual([])
  })

  it('is not an escape hatch: unknown tables, bad identifiers and guarded columns are refused', async () => {
    const { db, ctx, id } = await seeded()

    await expect(insert(db, ctx, 'sqlite_master' as 'students', { id: 'x' })).rejects.toThrow(
      'unknown table',
    )
    await expect(insert(db, ctx, 'students', { 'bad name': 'x' })).rejects.toThrow(
      'invalid SQL identifier',
    )
    await expect(insert(db, ctx, 'students', { full_name: 'no id' })).rejects.toThrow('string id')
    await expect(update(db, ctx, 'students', id, { version: 9 }, 1)).rejects.toThrow(
      'cannot be patched',
    )
    await expect(update(db, ctx, 'students', id, { created_at: 0 }, 1)).rejects.toThrow(
      'cannot be patched',
    )
    await expect(update(db, ctx, 'students', id, { full_name: 'X' }, 0)).rejects.toThrow(
      'positive whole number',
    )
    await expect(update(db, ctx, 'students', id, {}, 1)).rejects.toThrow('at least one column')
  })

  it('binds values rather than interpolating them', async () => {
    const { db, ctx, id } = await seeded()
    const hostile = `Robert'); DROP TABLE students;--`
    await update(db, ctx, 'students', id, { full_name: hostile }, 1)

    expect(await findById(db, 'students', id)).toMatchObject({ full_name: hostile })
    expect((await db.query("SELECT name FROM sqlite_master WHERE name = 'students'")).length).toBe(
      1,
    )
  })
})
