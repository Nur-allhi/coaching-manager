/**
 * Attendance repository (T-060, D-051). The `attendance_records` junction table has no
 * version/deleted_at, so the generic versioned repo helpers do not apply — this module owns its
 * parameterized SQL. All writes run through the caller's transaction handle; UI never runs SQL.
 */
import { makeAuditContext, type AuditContext } from '@/core/audit/write'
import { repoWithin, type Row } from '@/core/db/repository'
import type { Db } from '@/core/db/types'
import type { AttendanceStatus } from './types'

export interface SessionRow extends Row {
  id: string
  batch_id: string
  held_on: string
  version: number
}

function stamp(ctx: AuditContext): Row {
  return { id: ctx.newId(), created_at: ctx.now, updated_at: ctx.now, deleted_at: null }
}

/** Return the session for a batch+date, creating it once if absent. Call inside a transaction. */
export async function getOrCreateSession(
  t: Db,
  ctx: AuditContext,
  batchId: string,
  heldOn: string,
): Promise<SessionRow> {
  const found = await t.query<SessionRow>(
    'SELECT * FROM attendance_sessions WHERE batch_id = ? AND held_on = ? AND deleted_at IS NULL',
    [batchId, heldOn],
  )
  const existing = found[0]
  if (existing) return existing

  const id = await repoWithin(t, ctx).insert('attendance_sessions', {
    ...stamp(ctx),
    version: 1,
    batch_id: batchId,
    held_on: heldOn,
  })
  // The shared insert helper already writes the single create audit row (BUG-010).
  const rows = await t.query<SessionRow>('SELECT * FROM attendance_sessions WHERE id = ?', [id])
  const created = rows[0]
  if (!created) throw new Error('failed to read created attendance session')
  return created
}

/** Upsert one student's status in a session. Call inside a transaction. */
export async function setStatusWithin(
  t: Db,
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
): Promise<void> {
  await t.run(
    'INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?) ' +
      'ON CONFLICT(session_id, student_id) DO UPDATE SET status = excluded.status',
    [sessionId, studentId, status],
  )
}

/** Mark every listed student present in one statement set. Call inside a transaction. */
export async function markAllPresentWithin(
  t: Db,
  sessionId: string,
  studentIds: readonly string[],
): Promise<void> {
  for (const studentId of studentIds) {
    await setStatusWithin(t, sessionId, studentId, 'present')
  }
}

export interface StatusRow extends Row {
  session_id: string
  student_id: string
  status: AttendanceStatus
}

export async function statusesFor(t: Db, sessionId: string): Promise<StatusRow[]> {
  return t.query<StatusRow>(
    'SELECT session_id, student_id, status FROM attendance_records WHERE session_id = ?',
    [sessionId],
  )
}

export async function findSession(
  db: Db,
  batchId: string,
  heldOn: string,
): Promise<SessionRow | undefined> {
  const rows = await db.query<SessionRow>(
    'SELECT * FROM attendance_sessions WHERE batch_id = ? AND held_on = ? AND deleted_at IS NULL',
    [batchId, heldOn],
  )
  return rows[0]
}

export { makeAuditContext }
