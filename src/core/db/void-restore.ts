/**
 * Void and restore write helpers (T-030, D-034).
 *
 * Siblings of repository.ts: they follow the same T-015 convention — one transaction, one
 * audit row written inside it, allowlisted table names and bound values only. They live in a
 * separate file so repository.ts stays under the 300 LOC limit.
 */
import type { AuditContext } from '../audit/write'
import { writeAudit } from '../audit/write'
import { type Row, type TableName, assertVersion, tableName as requireTable } from './repository'
import type { Db } from './types'

/** Only tables with a `status` column can be voided. */
const VOIDABLE = new Set<string>(['payments'])

/** Unlike findById this also sees soft-deleted rows, which restore needs. */
async function readAny(db: Db, table: TableName, id: string): Promise<Row | undefined> {
  const rows = await db.query<Row>(`SELECT * FROM ${table} WHERE id = ?`, [id])
  return rows[0]
}

export async function voidRecordWithin(
  db: Db,
  ctx: AuditContext,
  table: TableName,
  id: string,
  expectedVersion: number,
): Promise<void> {
  const name = requireTable(table)
  if (!VOIDABLE.has(name)) throw new Error(`table is not voidable: ${name}`)
  assertVersion(expectedVersion)
  const before = await readAny(db, name, id)
  if (!before) throw new Error(`record not found: ${id}`)
  if (before.deleted_at !== null) throw new Error(`cannot void a deleted record: ${id}`)
  if (before.status === 'void') throw new Error(`record already void: ${id}`)

  const result = await db.run(
    `UPDATE ${name} SET status = 'void', updated_at = ?, version = version + 1 ` +
      'WHERE id = ? AND version = ? AND deleted_at IS NULL',
    [ctx.now, id, expectedVersion],
  )
  if (result.changes === 0) throw new Error(`version conflict for ${id}`)

  const after = await readAny(db, name, id)
  await writeAudit(db, ctx, { entity: name, entityId: id, action: 'void', before, after })
}

export async function voidRecord(
  db: Db,
  ctx: AuditContext,
  table: TableName,
  id: string,
  expectedVersion: number,
): Promise<void> {
  return db.tx((t) => voidRecordWithin(t, ctx, table, id, expectedVersion))
}

export async function restoreRecordWithin(
  db: Db,
  ctx: AuditContext,
  table: TableName,
  id: string,
  expectedVersion: number,
): Promise<void> {
  const name = requireTable(table)
  assertVersion(expectedVersion)
  const before = await readAny(db, name, id)
  if (!before) throw new Error(`record not found: ${id}`)
  if (before.deleted_at === null) throw new Error(`record is not deleted: ${id}`)

  const result = await db.run(
    `UPDATE ${name} SET deleted_at = NULL, updated_at = ?, version = version + 1 ` +
      'WHERE id = ? AND version = ? AND deleted_at IS NOT NULL',
    [ctx.now, id, expectedVersion],
  )
  if (result.changes === 0) throw new Error(`version conflict for ${id}`)

  const after = await readAny(db, name, id)
  await writeAudit(db, ctx, { entity: name, entityId: id, action: 'restore', before, after })
}
