/**
 * Undo and History plumbing (T-030, D-034).
 *
 * Undo reads an audit entry and applies its inverse through the same audited write helpers the
 * original change used. Every inverse write creates a NEW audit row inside the same transaction;
 * the entry being undone is never modified. No new action kind is needed — the inverse writes
 * carry the existing delete/update/restore actions.
 */
import { type Row, type TableName, repoWithin, tableName } from '../db/repository'
import { restoreRecordWithin } from '../db/void-restore'
import type { Db } from '../db/types'
import type { AuditAction, AuditContext } from './write'

/** Stored actions use the same vocabulary the writer accepts. */
export type StoredAction = AuditAction

export interface StoredAudit {
  id: string
  at: number
  user_id: string | null
  entity: string
  entity_id: string
  action: StoredAction
  before_json: string | null
  after_json: string | null
  undone: number
}

export class AuditNotFoundError extends Error {
  readonly auditId: string

  constructor(auditId: string) {
    super(`audit entry not found: ${auditId}`)
    this.name = 'AuditNotFoundError'
    this.auditId = auditId
  }
}

export class InvalidAuditEntryError extends Error {
  readonly auditId: string

  constructor(auditId: string, reason: string) {
    super(`cannot undo ${auditId}: ${reason}`)
    this.name = 'InvalidAuditEntryError'
    this.auditId = auditId
  }
}

export function parseSnapshot(value: string | null): Row | undefined {
  if (value === null) return undefined
  const parsed: unknown = JSON.parse(value)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('audit snapshot is not a row object')
  }
  return parsed as Row
}

const METADATA_COLUMNS = new Set(['id', 'version', 'created_at', 'updated_at', 'deleted_at'])
const BLOB_MARKER = /^<blob:\d+ bytes>$/

function inversePatch(before: Row, after: Row | undefined, auditId: string): Row {
  const patch: Row = {}
  const redacted: string[] = []
  for (const [key, value] of Object.entries(before)) {
    if (METADATA_COLUMNS.has(key)) continue
    // Snapshots redact binary to a marker; binding it would store the text in a BLOB column.
    if (typeof value === 'string' && BLOB_MARKER.test(value)) {
      redacted.push(key)
      continue
    }
    patch[key] = value
  }
  const restoredText = Object.keys(patch).some(
    (key) => JSON.stringify(patch[key]) !== JSON.stringify(after?.[key]),
  )
  if (redacted.length > 0 && !restoredText) {
    throw new InvalidAuditEntryError(
      auditId,
      'binary columns cannot be restored from a redacted snapshot',
    )
  }
  if (Object.keys(patch).length === 0) {
    throw new InvalidAuditEntryError(auditId, 'no reversible columns in the before snapshot')
  }
  return patch
}

/** Use inside a transaction the caller already holds. */
export async function undoWithin(db: Db, ctx: AuditContext, auditId: string): Promise<void> {
  const found = await db.query<StoredAudit>('SELECT * FROM audit_log WHERE id = ?', [auditId])
  const entry = found[0]
  if (!entry) throw new AuditNotFoundError(auditId)

  const table = tableName(entry.entity)
  const current = await db.query<Row>(`SELECT * FROM ${table} WHERE id = ?`, [entry.entity_id])
  const row = current[0]
  if (!row) throw new InvalidAuditEntryError(auditId, 'the record no longer exists')
  const version = Number(row.version)
  const repo = repoWithin(db, ctx)

  switch (entry.action) {
    case 'create':
    case 'restore':
      // A create or a restore is reversed with a soft delete; the child-refusal rule applies.
      await repo.softDelete(table, entry.entity_id, version)
      return
    case 'update': {
      const before = parseSnapshot(entry.before_json)
      if (!before) throw new InvalidAuditEntryError(auditId, 'update entry has no before snapshot')
      const after = parseSnapshot(entry.after_json)
      await repo.update(table, entry.entity_id, inversePatch(before, after, auditId), version)
      return
    }
    case 'delete':
      await restoreRecordWithin(db, ctx, table, entry.entity_id, version)
      return
    case 'void': {
      const before = parseSnapshot(entry.before_json)
      const status = before?.status
      if (typeof status !== 'string') {
        throw new InvalidAuditEntryError(auditId, 'void entry has no previous status')
      }
      await repo.update(table, entry.entity_id, { status }, version)
      return
    }
    default:
      throw new InvalidAuditEntryError(auditId, `unknown action ${String(entry.action)}`)
  }
}

/** Open one transaction for the inverse write and its new audit row. */
export async function undo(db: Db, ctx: AuditContext, auditId: string): Promise<void> {
  return db.tx((t) => undoWithin(t, ctx, auditId))
}

export interface HistoryEntry {
  id: string
  at: number
  actorId: string | null
  action: StoredAction
  before: Row | null
  after: Row | null
  undone: number
}

/** Newest first; snapshots are parsed for the T-034 History panel. */
export async function listHistory(db: Db, table: TableName, id: string): Promise<HistoryEntry[]> {
  const name = tableName(table)
  const rows = await db.query<StoredAudit>(
    'SELECT * FROM audit_log WHERE entity = ? AND entity_id = ? ORDER BY at DESC, rowid DESC',
    [name, id],
  )
  return rows.map((entry) => ({
    id: entry.id,
    at: entry.at,
    actorId: entry.user_id,
    action: entry.action,
    before: parseSnapshot(entry.before_json) ?? null,
    after: parseSnapshot(entry.after_json) ?? null,
    undone: entry.undone,
  }))
}
