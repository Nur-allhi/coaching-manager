import { describe, expect, it } from 'vitest'
import { type Row, findById, insert, softDelete, update } from '../db/repository'
import { migrate } from '../db/migrate'
import { migrations } from '../db/migrations'
import { createBetterSqliteDb } from '../db/testing/better-sqlite3'
import type { Db } from '../db/types'
import { voidRecord } from '../db/void-restore'
import { writeAudit, type AuditContext } from './write'
import { AuditNotFoundError, listHistory, undo } from './undo'

let sequence = 0

function context(overrides: Partial<AuditContext> = {}): AuditContext {
  sequence += 1
  let n = 0
  return {
    actorId: 'u-1',
    now: 1000 + sequence,
    newId: () => `a-${sequence}-${(n += 1)}`,
    ...overrides,
  }
}

const STUDENT = {
  id: 's-1',
  created_at: 1,
  updated_at: 1,
  deleted_at: null,
  version: 1,
  student_no: '2026-0001',
  full_name: 'Rahim',
  admitted_on: '2026-01-02',
}

const PAYMENT = {
  id: 'p-1',
  created_at: 2,
  updated_at: 2,
  deleted_at: null,
  version: 1,
  receipt_no: 'R-2026-000001',
  student_id: 's-1',
  paid_on: '2026-01-02',
  method: 'cash',
  amount_minor: 100000,
  note: null,
  status: 'valid',
  revision: 0,
}

async function seeded() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  const ctx = context({ now: 1 })
  await insert(db, ctx, 'students', STUDENT)
  return { db, ctx }
}

async function seededPayment() {
  const { db, ctx } = await seeded()
  await insert(db, context({ now: 2 }), 'payments', PAYMENT)
  return { db, ctx }
}

/** An audit row whose redaction markers come from real Uint8Arrays, as in the browser. */
async function photoUpdateAudit(db: Db, before: Row, after: Row): Promise<string> {
  await writeAudit(db, context({ now: 2 }), {
    entity: 'students',
    entityId: 's-1',
    action: 'update',
    before,
    after,
  })
  return latestAudit(db, 'update')
}

async function latestAudit(db: Db, action: string): Promise<string> {
  const rows = await db.query<{ id: string }>(
    'SELECT id FROM audit_log WHERE action = ? ORDER BY rowid DESC LIMIT 1',
    [action],
  )
  const id = rows[0]?.id
  if (!id) throw new Error(`no ${action} audit row`)
  return id
}

describe('void writes', () => {
  it('writes a void audit row whose snapshots match the before and after row', async () => {
    const { db } = await seededPayment()

    await voidRecord(db, context(), 'payments', 'p-1', 1)

    expect(await findById<Row>(db, 'payments', 'p-1')).toMatchObject({
      status: 'void',
      version: 2,
    })
    const history = await listHistory(db, 'payments', 'p-1')
    expect(history).toHaveLength(2)
    expect(history[0]).toMatchObject({ action: 'void' })
    expect(history[0]?.before).toMatchObject({ status: 'valid', version: 1 })
    expect(history[0]?.after).toMatchObject({ status: 'void', version: 2 })
  })

  it('refuses to void a non-voidable table or an already voided row', async () => {
    const { db } = await seededPayment()
    await expect(voidRecord(db, context(), 'students', 's-1', 1)).rejects.toThrow('not voidable')
    await voidRecord(db, context(), 'payments', 'p-1', 1)
    await expect(voidRecord(db, context(), 'payments', 'p-1', 2)).rejects.toThrow('already void')
  })

  it('rolls the void and its audit row back together', async () => {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })
    await insert(db, context({ now: 1, newId: () => 'taken' }), 'students', STUDENT)
    await insert(db, context({ now: 2 }), 'payments', PAYMENT)

    await expect(
      voidRecord(db, context({ now: 3, newId: () => 'taken' }), 'payments', 'p-1', 1),
    ).rejects.toThrow()

    expect(await findById<Row>(db, 'payments', 'p-1')).toMatchObject({
      status: 'valid',
      version: 1,
    })
    expect((await listHistory(db, 'payments', 'p-1')).map((e) => e.action)).toEqual(['create'])
  })
})

describe('undo', () => {
  it('reverses an update with a new audit entry and leaves the original untouched', async () => {
    const { db, ctx } = await seeded()
    await update(db, ctx, 'students', 's-1', { full_name: 'Karim' }, 1)
    const updateId = await latestAudit(db, 'update')
    const original = await db.query<Row>('SELECT * FROM audit_log WHERE id = ?', [updateId])

    await undo(db, context({ now: 99 }), updateId)

    expect(await findById<Row>(db, 'students', 's-1')).toMatchObject({
      full_name: 'Rahim',
      version: 3,
    })
    expect(await db.query<Row>('SELECT * FROM audit_log WHERE id = ?', [updateId])).toEqual(
      original,
    )
    expect((await listHistory(db, 'students', 's-1')).map((e) => e.action)).toEqual([
      'update',
      'update',
      'create',
    ])
  })

  it('refuses to undo a binary-only update instead of binding the redaction marker', async () => {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })
    const photo = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    const nextPhoto = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    await insert(db, context({ now: 1 }), 'students', { ...STUDENT, photo })
    await update(db, context({ now: 2 }), 'students', 's-1', { photo: nextPhoto }, 1)
    const auditId = await photoUpdateAudit(
      db,
      { ...STUDENT, photo },
      { ...STUDENT, updated_at: 2, photo: nextPhoto },
    )

    await expect(undo(db, context({ now: 99 }), auditId)).rejects.toThrow(/binary/)

    expect(await findById<Row>(db, 'students', 's-1')).toMatchObject({
      full_name: 'Rahim',
      version: 2,
    })
    const stored = await findById<Row>(db, 'students', 's-1')
    expect(Array.from(stored?.photo as Uint8Array)).toEqual(Array.from(nextPhoto))
    expect(await listHistory(db, 'students', 's-1')).toHaveLength(3)
  })

  it('undoes the text columns of a mixed update without corrupting the redacted photo', async () => {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })
    const photo = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    const nextPhoto = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    await insert(db, context({ now: 1 }), 'students', { ...STUDENT, photo })
    await update(
      db,
      context({ now: 2 }),
      'students',
      's-1',
      { full_name: 'Karim', photo: nextPhoto },
      1,
    )
    const auditId = await photoUpdateAudit(
      db,
      { ...STUDENT, photo },
      { ...STUDENT, full_name: 'Karim', updated_at: 2, photo: nextPhoto },
    )

    await undo(db, context({ now: 99 }), auditId)

    expect(await findById<Row>(db, 'students', 's-1')).toMatchObject({
      full_name: 'Rahim',
      version: 3,
    })
    const stored = await findById<Row>(db, 'students', 's-1')
    expect(Array.from(stored?.photo as Uint8Array)).toEqual(Array.from(nextPhoto))
  })

  it('reverses a create with a soft delete, never a hard delete', async () => {
    const { db } = await seeded()
    await undo(db, context({ now: 99 }), await latestAudit(db, 'create'))

    expect(await findById(db, 'students', 's-1')).toBeUndefined()
    const stored = await db.query<Row>('SELECT deleted_at FROM students WHERE id = ?', ['s-1'])
    expect(stored[0]?.deleted_at).not.toBeNull()
    expect((await listHistory(db, 'students', 's-1')).map((e) => e.action)).toEqual([
      'delete',
      'create',
    ])
  })

  it('reverses a soft delete with a restore entry', async () => {
    const { db, ctx } = await seeded()
    await softDelete(db, ctx, 'students', 's-1', 1)
    await undo(db, context({ now: 99 }), await latestAudit(db, 'delete'))

    expect(await findById<Row>(db, 'students', 's-1')).toMatchObject({
      full_name: 'Rahim',
      deleted_at: null,
      version: 3,
    })
    expect((await listHistory(db, 'students', 's-1'))[0]?.action).toBe('restore')
  })

  it('reverses a restore with a soft delete', async () => {
    const { db, ctx } = await seeded()
    await softDelete(db, ctx, 'students', 's-1', 1)
    await undo(db, context({ now: 98 }), await latestAudit(db, 'delete'))
    const restoreId = await latestAudit(db, 'restore')

    await undo(db, context({ now: 99 }), restoreId)

    const stored = await db.query<Row>('SELECT deleted_at FROM students WHERE id = ?', ['s-1'])
    expect(stored[0]?.deleted_at).not.toBeNull()
    expect((await listHistory(db, 'students', 's-1'))[0]?.action).toBe('delete')
  })

  it('reverses a void back to the previous status', async () => {
    const { db } = await seededPayment()
    await voidRecord(db, context(), 'payments', 'p-1', 1)
    await undo(db, context({ now: 99 }), await latestAudit(db, 'void'))

    expect(await findById<Row>(db, 'payments', 'p-1')).toMatchObject({
      status: 'valid',
      version: 3,
    })
  })

  it('rolls the inverse write and its new audit row back together', async () => {
    const { db, ctx } = await seeded()
    await update(db, ctx, 'students', 's-1', { full_name: 'Karim' }, 1)
    const taken = await latestAudit(db, 'create')

    await expect(
      undo(db, context({ now: 99, newId: () => taken }), await latestAudit(db, 'update')),
    ).rejects.toThrow()

    expect(await findById<Row>(db, 'students', 's-1')).toMatchObject({
      full_name: 'Karim',
      version: 2,
    })
    expect(await listHistory(db, 'students', 's-1')).toHaveLength(2)
  })

  it('reports a missing audit entry and parses history snapshots', async () => {
    const { db } = await seeded()
    await expect(undo(db, context(), 'missing')).rejects.toBeInstanceOf(AuditNotFoundError)
    const history = await listHistory(db, 'students', 's-1')
    expect(history).toHaveLength(1)
    expect(history[0]?.before).toBeNull()
    expect(history[0]?.after).toMatchObject({ full_name: 'Rahim' })
  })
})
