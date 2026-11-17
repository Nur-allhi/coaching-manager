/**
 * Audit-log read model for the T-082 viewer. One parameterized query, bound filters, and parsed
 * before/after snapshots shared with the History panel (D-062 A1).
 */
import { assertPermission } from '../auth/authorize'
import type { Session } from '../auth/session'
import { dhakaDayStart, isDate } from '../dates/dates'
import type { Db, DbParam } from '../db/types'
import type { Row } from '../db/repository'
import { parseSnapshot, type StoredAudit } from './undo'
import type { AuditAction } from './write'

export const AUDIT_ACTIONS: readonly AuditAction[] = [
  'create',
  'update',
  'delete',
  'restore',
  'void',
]

export interface AuditFilter {
  entity?: string
  action?: AuditAction
  /** Inclusive YYYY-MM-DD. */
  from?: string
  /** Inclusive YYYY-MM-DD. */
  to?: string
}

export interface AuditEntry {
  id: string
  at: number
  actorId: string | null
  entity: string
  entityId: string
  action: AuditAction
  before: Row | null
  after: Row | null
  undone: number
}

export async function listAudit(db: Db, filter: AuditFilter = {}): Promise<AuditEntry[]> {
  const clauses: string[] = []
  const params: DbParam[] = []
  if (filter.entity) {
    clauses.push('entity = ?')
    params.push(filter.entity)
  }
  if (filter.action) {
    clauses.push('action = ?')
    params.push(filter.action)
  }
  // Dates are Dhaka calendar days (TAD §5): every timestamp is epoch ms UTC, so the boundary is
  // the Dhaka start of the day, not the runner's local midnight. Invalid dates are ignored.
  if (filter.from && isDate(filter.from)) {
    clauses.push('at >= ?')
    params.push(dhakaDayStart(filter.from))
  }
  if (filter.to && isDate(filter.to)) {
    clauses.push('at < ?')
    params.push(dhakaDayStart(filter.to) + 86_400_000)
  }
  const where = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : ''
  const rows = await db.query<StoredAudit>(
    `SELECT * FROM audit_log${where} ORDER BY at DESC, rowid DESC`,
    params,
  )
  return rows.map((entry) => ({
    id: String(entry.id),
    at: Number(entry.at),
    actorId: entry.user_id,
    entity: String(entry.entity),
    entityId: String(entry.entity_id),
    action: entry.action,
    before: parseSnapshot(entry.before_json) ?? null,
    after: parseSnapshot(entry.after_json) ?? null,
    undone: Number(entry.undone),
  }))
}

/** Distinct entities come from the data, so new modules appear without editing the UI. */
export async function listAuditEntities(db: Db): Promise<string[]> {
  const rows = await db.query<{ entity: string }>(
    'SELECT DISTINCT entity FROM audit_log ORDER BY entity',
  )
  return rows.map((row) => String(row.entity))
}

/** Service-side gate (SECURITY §4): audit rows can contain personal and financial data. */
export async function listAuditAs(
  session: Session | null,
  db: Db,
  filter: AuditFilter = {},
): Promise<AuditEntry[]> {
  assertPermission(session, 'audit.read')
  return listAudit(db, filter)
}
