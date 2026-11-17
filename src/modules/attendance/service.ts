/**
 * Attendance service (T-060, D-051). Session creation, one-action mark-all-present, per-student
 * toggling and percentage summaries. Roster and names come from public module surfaces (TAD §2);
 * all writes go through the attendance repository inside one transaction.
 */
import { makeAuditContext, writeAudit } from '@/core/audit/write'
import type { Db } from '@/core/db/types'
import { listBatches } from '@/modules/academics'
import { listActive } from '@/modules/enrollments'
import { getStudent } from '@/modules/students'
import * as repo from './repository'
import type { AttendanceCell, AttendanceStatus, AttendanceSummary } from './types'

/** Active student ids enrolled in a batch (the roster for a session). */
export async function rosterFor(db: Db, batchId: string): Promise<string[]> {
  const active = await listActive(db)
  return active.filter((e) => e.batch_id === batchId).map((e) => e.student_id)
}

/** Open (or reuse) a session and mark every enrolled student present in one transaction. */
export async function openAndMarkAllPresent(
  db: Db,
  batchId: string,
  heldOn: string,
): Promise<{ sessionId: string; summary: AttendanceSummary }> {
  const ctx = makeAuditContext()
  const sessionId = await db.tx(async (t) => {
    const session = await repo.getOrCreateSession(t, ctx, batchId, heldOn)
    const roster = await rosterFor(t, batchId)
    await repo.markAllPresentWithin(t, session.id, roster)
    await writeAudit(t, ctx, {
      entity: 'attendance_sessions',
      entityId: session.id,
      action: 'update',
      before: null,
      after: { action: 'markAllPresent', count: roster.length },
    })
    return session.id
  })
  return { sessionId, summary: await summaryFor(db, sessionId) }
}

/** Mark every enrolled student present on an existing session, in one transaction. */
export async function markAll(db: Db, sessionId: string): Promise<void> {
  const ctx = makeAuditContext()
  await db.tx(async (t) => {
    const session = await t.query<{ batch_id: string }>(
      'SELECT batch_id FROM attendance_sessions WHERE id = ? AND deleted_at IS NULL',
      [sessionId],
    )
    const batchId = session[0]?.batch_id
    if (!batchId) throw new Error('attendance session not found')
    const roster = await rosterFor(t, batchId)
    await repo.markAllPresentWithin(t, sessionId, roster)
    await writeAudit(t, ctx, {
      entity: 'attendance_sessions',
      entityId: sessionId,
      action: 'update',
      before: null,
      after: { action: 'markAllPresent', count: roster.length },
    })
  })
}

/** Set one student's status in a session, audited, in one transaction. */
export async function setStatus(
  db: Db,
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
): Promise<void> {
  const ctx = makeAuditContext()
  await db.tx(async (t) => {
    await repo.setStatusWithin(t, sessionId, studentId, status)
    await writeAudit(t, ctx, {
      entity: 'attendance_sessions',
      entityId: sessionId,
      action: 'update',
      before: null,
      after: { studentId, status },
    })
  })
}

/** Get or open a session without writing statuses, for the grid's first load. */
export async function ensureSession(db: Db, batchId: string, heldOn: string): Promise<string> {
  const existing = await repo.findSession(db, batchId, heldOn)
  if (existing) return existing.id
  const ctx = makeAuditContext()
  return db.tx(async (t) => {
    const session = await repo.getOrCreateSession(t, ctx, batchId, heldOn)
    return session.id
  })
}

/** Build the grid cells: roster students with their stored status (default absent). */
export async function cellsFor(
  db: Db,
  sessionId: string,
  batchId: string,
): Promise<AttendanceCell[]> {
  const statuses = await repo.statusesFor(db, sessionId)
  const byStudent = new Map(statuses.map((s) => [s.student_id, s.status]))
  const ids = await rosterFor(db, batchId)
  const cells: AttendanceCell[] = []
  for (const id of ids) {
    const student = await getStudent(db, id)
    cells.push({
      studentId: id,
      studentName: student?.full_name ?? id,
      studentNo: student?.student_no ?? '',
      status: byStudent.get(id) ?? 'absent',
    })
  }
  return cells
}

/** Percentages from stored records. Absent counts as 0 and is excluded from averages. */
export async function summaryFor(db: Db, sessionId: string): Promise<AttendanceSummary> {
  const rows = await repo.statusesFor(db, sessionId)
  const present = rows.filter((r) => r.status === 'present').length
  const absent = rows.filter((r) => r.status === 'absent').length
  const total = present + absent
  return {
    present,
    absent,
    total,
    percentage: total === 0 ? 0 : Math.round((present / total) * 100),
  }
}

/** Batch options for the session picker, via the academics public surface. */
export async function batchOptions(db: Db): Promise<Array<{ id: string; name: string }>> {
  const batches = await listBatches(db)
  return batches
    .filter((b) => b.status === 'active')
    .map((b) => ({ id: String(b.id), name: String(b.name) }))
}
