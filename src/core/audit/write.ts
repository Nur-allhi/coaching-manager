/**
 * Audit row writer (T-015; the audit-log viewer and undo land in T-030/T-031).
 *
 * The caller passes the transaction handle, so the audit row and the change it describes are
 * committed or rolled back together. There is deliberately no `db.tx` call here: opening a
 * transaction is the repository helper's job, not the writer's.
 */
import type { Db, DbParam } from '../db/types'
import { newId } from '../db/uuid'

/** Who performed a write, when, and the id generator for the audit row. */
export interface AuditContext {
  actorId: string | null
  now: number
  newId: () => string
}

/** The production audit context: current time, UUIDv7 audit ids, no authenticated actor yet (P6-1). */
export function makeAuditContext(actorId: string | null = null): AuditContext {
  return { actorId, now: Date.now(), newId }
}

export type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'void'

export interface AuditEntry {
  entity: string
  entityId: string
  action: AuditAction
  before: unknown
  after: unknown
}

/** A row snapshot is stored as JSON; `undefined` has no meaning in a stored row. */
function snapshot(value: unknown): string | null {
  if (value === null || value === undefined) return null
  // Binary columns would serialise as one key-per-byte object. Keep a small marker instead, so a
  // bounded photo blob cannot multiply into a huge audit row (T-042, security review).
  return JSON.stringify(value, (_key, part) =>
    part instanceof Uint8Array ? `<blob:${part.byteLength} bytes>` : part,
  )
}

export async function writeAudit(db: Db, ctx: AuditContext, entry: AuditEntry): Promise<void> {
  const params: DbParam[] = [
    ctx.newId(),
    ctx.now,
    ctx.actorId,
    entry.entity,
    entry.entityId,
    entry.action,
    snapshot(entry.before),
    snapshot(entry.after),
  ]
  await db.run(
    'INSERT INTO audit_log (id, at, user_id, entity, entity_id, action, before_json, after_json, undone) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
    params,
  )
}
