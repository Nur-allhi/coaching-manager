/**
 * Exams service (T-061, D-052). Exam creation with a tx-held uniqueness guard, marks-grid reads,
 * audited per-student result writes and a live batch average. Marks are REAL numbers, never money.
 * Roster and names come from public module surfaces (TAD §2).
 */
import { makeAuditContext, writeAudit } from '@/core/audit/write'
import type { Db } from '@/core/db/types'
import { listBatches, listSubjects } from '@/modules/academics'
import { listActive } from '@/modules/enrollments'
import { getStudent } from '@/modules/students'
import * as repo from './repository'
import type { ExamCell, ExamRow, ExamSummary } from './types'

export class ExamsValidationError extends Error {}

export interface CreateExamInput {
  batchId: string
  subjectId: string | null
  heldOn: string
  name: string
  fullMarks: number
  passMarks: number
}

/** Validate the exam form without touching the database. */
export function validateExam(input: CreateExamInput): string | null {
  if (input.batchId === '') return 'batch'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.heldOn)) return 'date'
  if (input.name.trim() === '') return 'name'
  if (!Number.isFinite(input.fullMarks) || input.fullMarks <= 0) return 'fullMarks'
  if (
    !Number.isFinite(input.passMarks) ||
    input.passMarks < 0 ||
    input.passMarks > input.fullMarks
  ) {
    return 'passMarks'
  }
  return null
}

/** Create an exam, rejecting a duplicate batch+subject+date inside one serialized transaction. */
export async function createExam(db: Db, input: CreateExamInput): Promise<string> {
  const invalid = validateExam(input)
  if (invalid) throw new ExamsValidationError(invalid)
  const ctx = makeAuditContext()
  return db.tx(async (t) => {
    const existing = await repo.findExamWithin(t, input.batchId, input.subjectId, input.heldOn)
    if (existing) throw new ExamsValidationError('duplicate')
    return repo.createExamWithin(t, ctx, {
      batch_id: input.batchId,
      subject_id: input.subjectId,
      name: input.name.trim(),
      held_on: input.heldOn,
      full_marks: input.fullMarks,
      pass_marks: input.passMarks,
    })
  })
}

/** Exam rows with resolved labels for the list screen. */
export async function examOptions(
  db: Db,
): Promise<
  Array<{ id: string; name: string; batchName: string; subjectName: string; heldOn: string }>
> {
  const [exams, batches, subjects] = await Promise.all([
    repo.listExams(db),
    listBatches(db),
    listSubjects(db),
  ])
  const batchNames = new Map(batches.map((b) => [String(b.id), String(b.name)]))
  const subjectNames = new Map(subjects.map((s) => [String(s.id), String(s.name)]))
  return exams.map((e) => ({
    id: String(e.id),
    name: String(e.name),
    batchName: batchNames.get(String(e.batch_id)) ?? String(e.batch_id),
    subjectName: e.subject_id === null ? '—' : (subjectNames.get(String(e.subject_id)) ?? '—'),
    heldOn: String(e.held_on),
  }))
}

export function getExam(db: Db, id: string): Promise<ExamRow | undefined> {
  return repo.getExam(db, id)
}

async function rosterFor(db: Db, batchId: string): Promise<string[]> {
  const active = await listActive(db)
  return active.filter((e) => e.batch_id === batchId).map((e) => e.student_id)
}

/** Grid cells: enrolled students with their stored result (unmarked = no marks, not absent). */
export async function cellsFor(db: Db, examId: string, batchId: string): Promise<ExamCell[]> {
  const results = await repo.resultsFor(db, examId)
  const byStudent = new Map(results.map((r) => [r.student_id, r]))
  const ids = await rosterFor(db, batchId)
  const cells: ExamCell[] = []
  for (const id of ids) {
    const student = await getStudent(db, id)
    const result = byStudent.get(id)
    cells.push({
      studentId: id,
      studentName: student?.full_name ?? id,
      studentNo: student?.student_no ?? '',
      marks: result?.marks ?? null,
      absent: result?.absent === 1,
      remark: result?.remark ?? '',
    })
  }
  return cells
}

/** Save one result. Absent is stored as a flag with NULL marks — never as a zero. */
export async function saveResult(
  db: Db,
  examId: string,
  studentId: string,
  marks: number | null,
  absent: boolean,
  remark = '',
): Promise<void> {
  const ctx = makeAuditContext()
  await db.tx(async (t) => {
    const before = await t.query<{ marks: number | null; absent: number; remark: string | null }>(
      'SELECT marks, absent, remark FROM exam_results WHERE exam_id = ? AND student_id = ?',
      [examId, studentId],
    )
    const existing = before[0]
    await repo.upsertResultWithin(t, examId, studentId, marks, absent, remark, ctx.now)
    await writeAudit(t, ctx, {
      entity: 'exam_results',
      entityId: `${examId}:${studentId}`,
      action: existing ? 'update' : 'create',
      before: existing ?? null,
      after: { marks, absent: absent ? 1 : 0, remark },
    })
  })
}

/** Live batch average: entered marks of non-absent students only (TAD §5.7, D-052 B1). */
export async function summaryFor(db: Db, examId: string): Promise<ExamSummary> {
  const rows = await repo.resultsFor(db, examId)
  const present = rows.filter((r) => r.absent === 0 && r.marks !== null)
  const absent = rows.filter((r) => r.absent === 1).length
  const sum = present.reduce((acc, r) => acc + (r.marks ?? 0), 0)
  return {
    average: present.length === 0 ? null : Math.round((sum / present.length) * 10) / 10,
    entered: present.length,
    absent,
    total: rows.length,
  }
}

/** Batches and subjects for the create-exam form, via public surfaces. */
export async function formOptions(db: Db) {
  const [batches, subjects] = await Promise.all([listBatches(db), listSubjects(db)])
  return {
    batches: batches.map((b) => ({ id: String(b.id), name: String(b.name) })),
    subjects: subjects.map((s) => ({ id: String(s.id), name: String(s.name) })),
  }
}
