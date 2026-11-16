/**
 * Repository helpers (PLAN.md §5, ticket T-015).
 *
 * Every business table carries `id`, `created_at`, `updated_at`, `deleted_at` and `version`.
 * These helpers are the only sanctioned way to write one, so the conventions cannot drift:
 * `version` always goes up, `updated_at` always moves, a delete is always a soft delete, and
 * every write leaves an audit row in the same transaction.
 *
 * SQL identifiers cannot be bound as parameters, so table and column names are checked
 * against an allowlist and a strict pattern. Values are always bound; no caller-supplied
 * string is ever interpolated into SQL.
 *
 * Each public helper opens one transaction and writes the change plus its audit row inside
 * it. Services that need several writes in one transaction use `repoWithin(t, ctx)` with the
 * transaction handle they already hold; the `Within` variants never open a second one.
 */
import type { Db, DbParam } from './types'
import type { AuditContext } from '../audit/write'
import { writeAudit } from '../audit/write'
import { CHILDREN } from './relationships'

export const TABLES = [
  'academic_years',
  'classes',
  'subjects',
  'batches',
  'students',
  'enrollments',
  'charges',
  'payments',
  'payment_allocations',
  'attendance_sessions',
  'attendance_records',
  'exams',
  'exam_results',
] as const

export type TableName = (typeof TABLES)[number]

/** The row shape these helpers accept and return. */
export type Row = Record<string, DbParam>

/** The row lost a race: someone else wrote it since this caller read it. */
export class VersionConflictError extends Error {
  readonly entityId: string

  constructor(entityId: string) {
    super(`version conflict for ${entityId}`)
    this.name = 'VersionConflictError'
    this.entityId = entityId
  }
}

/** No live row with that id; it never existed, or it was soft-deleted. */
export class NotFoundError extends Error {
  readonly entityId: string

  constructor(entityId: string) {
    super(`record not found: ${entityId}`)
    this.name = 'NotFoundError'
    this.entityId = entityId
  }
}

/** A parent still has live children, so deleting it would orphan them. */
export class ChildrenExistError extends Error {
  readonly entityId: string
  readonly details: readonly string[]

  constructor(entityId: string, details: readonly string[]) {
    super(`cannot delete ${entityId}: ${details.join(', ')}`)
    this.name = 'ChildrenExistError'
    this.entityId = entityId
    this.details = details
  }
}

function identifier(name: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error(`invalid SQL identifier: ${name}`)
  return name
}

export function tableName(table: string): TableName {
  if (!(TABLES as readonly string[]).includes(table)) {
    throw new Error(`unknown table: ${table}`)
  }
  identifier(table) // keep the strict pattern check as well as the allowlist
  return table as TableName
}

export function assertVersion(version: number): void {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('expectedVersion must be a positive whole number')
  }
}

async function readRow(
  db: Db,
  table: TableName,
  id: string,
  liveOnly = true,
): Promise<Row | undefined> {
  const filter = liveOnly ? ' AND deleted_at IS NULL' : ''
  const rows = await db.query<Row>(`SELECT * FROM ${tableName(table)} WHERE id = ?${filter}`, [id])
  return rows[0]
}

/** Both failure modes leave `changes` at 0, so the reason has to be discovered. */
async function fail(db: Db, table: TableName, id: string): Promise<never> {
  const live = await readRow(db, table, id)
  throw live ? new VersionConflictError(id) : new NotFoundError(id)
}

async function liveChildren(db: Db, table: TableName, id: string): Promise<string[]> {
  const refs = CHILDREN[table] ?? []
  const found: string[] = []
  for (const ref of refs) {
    const where = ref.softDeletable ? ' AND deleted_at IS NULL' : ''
    const rows = await db.query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${ref.table} WHERE ${identifier(ref.column)} = ?${where}`,
      [id],
    )
    const count = rows[0]?.n ?? 0
    if (count > 0) found.push(`${count} live ${ref.label}`)
  }
  return found
}

async function insertWithin(
  db: Db,
  ctx: AuditContext,
  table: TableName,
  row: Row,
): Promise<string> {
  const columns = Object.keys(row)
  if (columns.length === 0) throw new Error('insert requires at least one column')
  const names = columns.map(identifier).join(', ')
  if (typeof row.id !== 'string' || row.id === '') throw new Error('insert requires a string id')

  const slots = columns.map(() => '?').join(', ')
  await db.run(`INSERT INTO ${tableName(table)} (${names}) VALUES (${slots})`, Object.values(row))
  await writeAudit(db, ctx, {
    entity: table,
    entityId: row.id,
    action: 'create',
    before: null,
    after: row,
  })
  return row.id
}

async function updateWithin(
  db: Db,
  ctx: AuditContext,
  table: TableName,
  id: string,
  patch: Row,
  expectedVersion: number,
): Promise<void> {
  assertVersion(expectedVersion)
  const before = await readRow(db, table, id)
  if (!before) throw new NotFoundError(id)

  const entries = Object.entries(patch)
  if (entries.length === 0) throw new Error('update requires at least one column')
  for (const [key] of entries) {
    if (key === 'id' || key === 'version' || key === 'created_at') {
      throw new Error(`${key} cannot be patched`)
    }
  }

  const sets = [
    ...entries.map(([key]) => `${identifier(key)} = ?`),
    'updated_at = ?',
    'version = version + 1',
  ].join(', ')
  const params = [...entries.map(([, value]) => value), ctx.now, id, expectedVersion]

  const result = await db.run(
    `UPDATE ${tableName(table)} SET ${sets} WHERE id = ? AND version = ? AND deleted_at IS NULL`,
    params,
  )
  if (result.changes === 0) await fail(db, table, id)

  const after = await readRow(db, table, id)
  await writeAudit(db, ctx, { entity: table, entityId: id, action: 'update', before, after })
}

async function softDeleteWithin(
  db: Db,
  ctx: AuditContext,
  table: TableName,
  id: string,
  expectedVersion: number,
): Promise<void> {
  assertVersion(expectedVersion)
  const before = await readRow(db, table, id)
  if (!before) throw new NotFoundError(id)

  const details = await liveChildren(db, table, id)
  if (details.length > 0) throw new ChildrenExistError(id, details)

  const result = await db.run(
    `UPDATE ${tableName(table)} ` +
      'SET deleted_at = ?, updated_at = ?, version = version + 1 ' +
      'WHERE id = ? AND version = ? AND deleted_at IS NULL',
    [ctx.now, ctx.now, id, expectedVersion],
  )
  if (result.changes === 0) await fail(db, table, id)

  const after = await readRow(db, table, id, false)
  await writeAudit(db, ctx, {
    entity: table,
    entityId: id,
    action: 'delete',
    before,
    after,
  })
}

/** Read one live row by id, or `undefined` when there is none. */
export async function findById<T = Row>(
  db: Db,
  table: TableName,
  id: string,
): Promise<T | undefined> {
  const rows = await db.query<T>(
    `SELECT * FROM ${tableName(table)} WHERE id = ? AND deleted_at IS NULL`,
    [id],
  )
  return rows[0]
}

/** List every live row in a table. Every default list query filters `deleted_at IS NULL`. */
export async function list<T = Row>(db: Db, table: TableName): Promise<T[]> {
  return db.query<T>(`SELECT * FROM ${tableName(table)} WHERE deleted_at IS NULL`)
}

export async function insert(
  db: Db,
  ctx: AuditContext,
  table: TableName,
  row: Row,
): Promise<string> {
  return db.tx((t) => insertWithin(t, ctx, table, row))
}

export async function update(
  db: Db,
  ctx: AuditContext,
  table: TableName,
  id: string,
  patch: Row,
  expectedVersion: number,
): Promise<void> {
  return db.tx((t) => updateWithin(t, ctx, table, id, patch, expectedVersion))
}

export async function softDelete(
  db: Db,
  ctx: AuditContext,
  table: TableName,
  id: string,
  expectedVersion: number,
): Promise<void> {
  return db.tx((t) => softDeleteWithin(t, ctx, table, id, expectedVersion))
}

/**
 * Bind a set of write helpers to a transaction handle. A service that writes several rows
 * atomically holds one `t` from `db.tx(...)` and calls these instead, so no nested transaction
 * is ever opened and all the audit rows join the same commit.
 */
export function repoWithin(t: Db, ctx: AuditContext) {
  return {
    insert: (table: TableName, row: Row) => insertWithin(t, ctx, table, row),
    update: (table: TableName, id: string, patch: Row, expectedVersion: number) =>
      updateWithin(t, ctx, table, id, patch, expectedVersion),
    softDelete: (table: TableName, id: string, expectedVersion: number) =>
      softDeleteWithin(t, ctx, table, id, expectedVersion),
  }
}
