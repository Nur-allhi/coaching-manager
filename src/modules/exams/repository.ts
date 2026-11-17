/**
 * Exams repository (T-061, D-052). `exam_results` is a junction table with no version/deleted_at,
 * so the generic versioned helpers do not apply — this module owns its parameterized SQL. The
 * `exams` table does carry the common columns and is written through the shared audited helper.
 */
import type { AuditContext } from '@/core/audit/write'
import { list, repoWithin, type Row } from '@/core/db/repository'
import type { Db } from '@/core/db/types'
import type { ExamRow, ResultRow } from './types'

function stamp(ctx: AuditContext): Row {
  return { id: ctx.newId(), created_at: ctx.now, updated_at: ctx.now, deleted_at: null }
}

/** Find an exam inside a transaction — the serialized queue makes this race-free. */
export async function findExamWithin(
  t: Db,
  batchId: string,
  subjectId: string | null,
  heldOn: string,
): Promise<ExamRow | undefined> {
  const rows =
    subjectId === null
      ? await t.query<ExamRow>(
          'SELECT * FROM exams WHERE batch_id = ? AND subject_id IS NULL AND held_on = ? AND deleted_at IS NULL',
          [batchId, heldOn],
        )
      : await t.query<ExamRow>(
          'SELECT * FROM exams WHERE batch_id = ? AND subject_id = ? AND held_on = ? AND deleted_at IS NULL',
          [batchId, subjectId, heldOn],
        )
  return rows[0]
}

/** Insert an exam inside a transaction. The shared helper writes the one create audit row. */
export function createExamWithin(t: Db, ctx: AuditContext, patch: Row): Promise<string> {
  return repoWithin(t, ctx).insert('exams', { ...stamp(ctx), version: 1, ...patch })
}

export function listExams(db: Db): Promise<ExamRow[]> {
  return list<ExamRow>(db, 'exams')
}

export async function getExam(db: Db, id: string): Promise<ExamRow | undefined> {
  const rows = await db.query<ExamRow>('SELECT * FROM exams WHERE id = ? AND deleted_at IS NULL', [
    id,
  ])
  return rows[0]
}

/** Upsert one result. The junction table has no generic helper, so the service audits this write. */
export async function upsertResultWithin(
  t: Db,
  examId: string,
  studentId: string,
  marks: number | null,
  absent: boolean,
  remark: string,
  updatedAt: number,
): Promise<void> {
  await t.run(
    'INSERT INTO exam_results (exam_id, student_id, marks, absent, remark, updated_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(exam_id, student_id) DO UPDATE SET ' +
      'marks = excluded.marks, absent = excluded.absent, remark = excluded.remark, updated_at = excluded.updated_at',
    [examId, studentId, marks, absent ? 1 : 0, remark, updatedAt],
  )
}

export function resultsFor(db: Db, examId: string): Promise<ResultRow[]> {
  return db.query<ResultRow>('SELECT * FROM exam_results WHERE exam_id = ?', [examId])
}
