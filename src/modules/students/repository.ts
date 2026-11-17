/**
 * Students repository (T-042, D-043).
 *
 * Writes go through the shared audited helpers. The FTS index is maintained by database triggers
 * in the T-042 migration, so no application code duplicates that work and undo/restore/import
 * keep a consistent index automatically. Search joins the live rows and filters `deleted_at`,
 * so a soft-deleted student can never surface from the index.
 */
import type { AuditContext } from '@/core/audit/write'
import type { Db, DbParam } from '@/core/db/types'
import {
  findById,
  insert,
  list,
  repoWithin,
  softDelete,
  update,
  type Row,
} from '@/core/db/repository'
import { restoreRecordWithin } from '@/core/db/void-restore'
import type { StudentFilter, StudentRow } from './types'

function stamp(ctx: AuditContext): Row {
  return {
    id: ctx.newId(),
    created_at: ctx.now,
    updated_at: ctx.now,
    deleted_at: null,
  }
}

export async function create(db: Db, ctx: AuditContext, patch: Row): Promise<string> {
  return insert(db, ctx, 'students', { ...stamp(ctx), ...patch })
}

/** For services that hold a transaction (e.g. admit, which also allocates the number). */
export function createWithin(t: Db, ctx: AuditContext, patch: Row): Promise<string> {
  return repoWithin(t, ctx).insert('students', { ...stamp(ctx), ...patch })
}

export async function updateStudent(
  db: Db,
  ctx: AuditContext,
  id: string,
  patch: Row,
  version: number,
): Promise<void> {
  return update(db, ctx, 'students', id, patch, version)
}

export async function softDeleteStudent(
  db: Db,
  ctx: AuditContext,
  id: string,
  version: number,
): Promise<void> {
  return softDelete(db, ctx, 'students', id, version)
}

/** Restore is called inside the caller's transaction so the undo audit row commits with it. */
export function restoreWithin(
  t: Db,
  ctx: AuditContext,
  id: string,
  version: number,
): Promise<void> {
  return restoreRecordWithin(t, ctx, 'students', id, version)
}

export function byId(db: Db, id: string): Promise<StudentRow | undefined> {
  return findById<StudentRow>(db, 'students', id)
}

/** The trash: only soft-deleted students, newest deletion first. */
export function trash(db: Db): Promise<StudentRow[]> {
  return db.query<StudentRow>(
    'SELECT * FROM students WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC',
  )
}

/** Quote each token and ask FTS5 for a prefix match; never pass raw user text to MATCH. */
export function ftsQuery(query: string): string {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `"${token.replace(/"/g, '""')}"*`)
  return tokens.join(' AND ')
}

/**
 * Search with FTS5, filter with SQL, cap the result for the virtualized list. The cap keeps the
 * DOM small and the response under the 100 ms budget even with 5,000 students.
 */
export async function search(
  db: Db,
  filter: StudentFilter = {},
  limit = 200,
): Promise<StudentRow[]> {
  if (filter.includeDeleted) return trash(db)
  const params: DbParam[] = []
  const where: string[] = ['s.deleted_at IS NULL']
  let join = ''
  if (filter.query && filter.query.trim() !== '') {
    join = ' JOIN students_fts f ON f.rowid = s.rowid'
    where.push('students_fts MATCH ?')
    params.push(ftsQuery(filter.query))
  }
  if (filter.status) {
    where.push('s.status = ?')
    params.push(filter.status)
  }
  params.push(limit)
  return db.query<StudentRow>(
    `SELECT s.* FROM students s${join} WHERE ${where.join(' AND ')} ` +
      'ORDER BY s.full_name, s.student_no LIMIT ?',
    params,
  )
}

/** All live students, used by the benchmark and by tests; search() is the bounded UI path. */
export function all(db: Db): Promise<StudentRow[]> {
  return list<StudentRow>(db, 'students')
}

/** Next `YYYY-0001` number from the largest suffix already used for that admission year. */
export async function nextStudentNo(t: Db, year: string): Promise<string> {
  const rows = await t.query<{ n: string | null }>(
    'SELECT MAX(student_no) AS n FROM students WHERE student_no LIKE ?',
    [`${year}-%`],
  )
  const max = rows[0]?.n
  const suffix = max ? Number(max.slice(year.length + 1)) : 0
  const next = (Number.isFinite(suffix) ? suffix : 0) + 1
  return `${year}-${String(next).padStart(4, '0')}`
}
