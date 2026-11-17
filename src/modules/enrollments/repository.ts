/**
 * Enrollments repository (T-043). All writes go through the shared audited helpers; every list
 * filters `deleted_at IS NULL`. Reads of other modules' data are never done here.
 */
import { makeAuditContext, type AuditContext } from '@/core/audit/write'
import {
  findById,
  insert,
  list,
  repoWithin,
  softDelete,
  update,
  type Row,
} from '@/core/db/repository'
import type { Db } from '@/core/db/types'
import type { EnrollmentRow } from './types'

function stamp(ctx: AuditContext): Row {
  return { id: ctx.newId(), created_at: ctx.now, updated_at: ctx.now, deleted_at: null }
}

export function create(db: Db, patch: Row): Promise<string> {
  const ctx = makeAuditContext()
  return insert(db, ctx, 'enrollments', { ...stamp(ctx), ...patch })
}

export function createWithin(t: Db, ctx: AuditContext, patch: Row): Promise<string> {
  return repoWithin(t, ctx).insert('enrollments', { ...stamp(ctx), ...patch })
}

export function updateWithin(
  t: Db,
  ctx: AuditContext,
  id: string,
  patch: Row,
  version: number,
): Promise<void> {
  return repoWithin(t, ctx).update('enrollments', id, patch, version)
}

export function updateEnrollment(db: Db, id: string, patch: Row, version: number): Promise<void> {
  return update(db, makeAuditContext(), 'enrollments', id, patch, version)
}

export function softDeleteEnrollment(db: Db, id: string, version: number): Promise<void> {
  return softDelete(db, makeAuditContext(), 'enrollments', id, version)
}

export function byId(db: Db, id: string): Promise<EnrollmentRow | undefined> {
  return findById<EnrollmentRow>(db, 'enrollments', id)
}

/** Every default list filters soft-deleted rows. */
export function all(db: Db): Promise<EnrollmentRow[]> {
  return list<EnrollmentRow>(db, 'enrollments')
}

/** Active enrollments, for fee generation in the payments module via the public index.ts. */
export function listActive(db: Db): Promise<EnrollmentRow[]> {
  return db.query<EnrollmentRow>(
    "SELECT * FROM enrollments WHERE status = 'active' AND deleted_at IS NULL ORDER BY id",
  )
}

/** One active enrollment by id, for per-enrollment charge generation. */
export async function activeById(db: Db, id: string): Promise<EnrollmentRow | undefined> {
  const rows = await db.query<EnrollmentRow>(
    "SELECT * FROM enrollments WHERE id = ? AND status = 'active' AND deleted_at IS NULL",
    [id],
  )
  return rows[0]
}

export function forStudent(db: Db, studentId: string): Promise<EnrollmentRow[]> {
  return db.query<EnrollmentRow>(
    'SELECT * FROM enrollments WHERE student_id = ? AND deleted_at IS NULL ORDER BY enrolled_on DESC',
    [studentId],
  )
}

export function activeCountForBatch(db: Db, batchId: string): Promise<number> {
  return db
    .query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM enrollments WHERE batch_id = ? AND status = 'active' AND deleted_at IS NULL",
      [batchId],
    )
    .then((rows) => rows[0]?.n ?? 0)
}
