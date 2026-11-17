/** Unit tests for the exams service (T-061, D-052). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { insert } from '@/core/db/repository'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import * as repo from './repository'
import {
  cellsFor,
  createExam,
  ExamsValidationError,
  saveResult,
  summaryFor,
  validateExam,
} from './service'

const input = {
  batchId: 'b-1',
  subjectId: 'sub-1',
  heldOn: '2026-03-01',
  name: 'Midterm',
  fullMarks: 100,
  passMarks: 33,
}

async function seeded() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  const c = makeAuditContext('test')
  const yearId = await insert(db, c, 'academic_years', {
    id: 'ay-1',
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    version: 1,
    name: '2026',
    starts_on: '2026-01-01',
    ends_on: '2026-12-31',
    is_current: 1,
  })
  const classId = await insert(db, c, 'classes', {
    id: 'c-1',
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    version: 1,
    name: 'Class 10',
    sort_order: 1,
  })
  await insert(db, c, 'subjects', {
    id: 'sub-1',
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    version: 1,
    name: 'Mathematics',
    code: 'MATH',
  })
  await insert(db, c, 'batches', {
    id: 'b-1',
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    version: 1,
    academic_year_id: yearId,
    class_id: classId,
    name: 'Morning',
    days_mask: 62,
    start_time: '09:00',
    end_time: '10:00',
    capacity: 30,
    monthly_fee_minor: 100000,
    status: 'active',
  })
  const roster: Array<[string, string, string]> = [
    ['s-1', 'Rahim', '2026-0001'],
    ['s-2', 'Karim', '2026-0002'],
    ['s-3', 'Asha', '2026-0003'],
  ]
  for (const [id, name, no] of roster) {
    await insert(db, c, 'students', {
      id,
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
      version: 1,
      student_no: no,
      full_name: name,
      admitted_on: '2026-01-01',
    })
    await insert(db, c, 'enrollments', {
      id: `e-${id}`,
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
      version: 1,
      student_id: id,
      batch_id: 'b-1',
      enrolled_on: '2026-01-01',
      monthly_fee_minor: 100000,
      discount_kind: 'none',
      discount_value: 0,
    })
  }
  return db
}

describe('exams service', () => {
  it('creates one exam per batch, subject and date', async () => {
    const db = await seeded()
    await createExam(db, input)
    await expect(createExam(db, input)).rejects.toBeInstanceOf(ExamsValidationError)
    expect(await repo.listExams(db)).toHaveLength(1)
    // A different subject on the same date is a different exam.
    await expect(createExam(db, { ...input, subjectId: null })).resolves.not.toThrow()
  })

  it('stores absence as a flag with null marks, never a zero', async () => {
    const db = await seeded()
    const examId = await createExam(db, input)
    await saveResult(db, examId, 's-1', null, true)
    const results = await repo.resultsFor(db, examId)
    expect(results).toHaveLength(1)
    expect(results[0]?.marks).toBeNull()
    expect(results[0]?.absent).toBe(1)
  })

  it('averages entered marks of non-absent students only', async () => {
    const db = await seeded()
    const examId = await createExam(db, input)
    await saveResult(db, examId, 's-1', 80, false)
    await saveResult(db, examId, 's-2', 70, false)
    await saveResult(db, examId, 's-3', 90, false)
    expect((await summaryFor(db, examId)).average).toBe(80)

    await saveResult(db, examId, 's-3', null, true)
    const summary = await summaryFor(db, examId)
    expect(summary.average).toBe(75)
    expect(summary.absent).toBe(1)
    expect(summary.entered).toBe(2)
  })

  it('leaves unmarked students unmarked in the grid, not zero or absent', async () => {
    const db = await seeded()
    const examId = await createExam(db, input)
    const cells = await cellsFor(db, examId, 'b-1')
    expect(cells).toHaveLength(3)
    expect(cells.every((c) => c.marks === null && !c.absent)).toBe(true)
    expect(cells[0]?.studentName).toBe('Rahim')
  })

  it('writes exactly one audit row per result write', async () => {
    const db = await seeded()
    const examId = await createExam(db, input)
    const before = await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM audit_log')
    await saveResult(db, examId, 's-1', 80, false)
    const after = await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM audit_log')
    expect(Number(after[0]?.n)).toBe(Number(before[0]?.n) + 1)
  })

  it('rejects invalid exam forms', async () => {
    expect(validateExam({ ...input, fullMarks: 0 })).toBe('fullMarks')
    expect(validateExam({ ...input, passMarks: 120 })).toBe('passMarks')
    expect(validateExam({ ...input, name: '   ' })).toBe('name')
  })
})
