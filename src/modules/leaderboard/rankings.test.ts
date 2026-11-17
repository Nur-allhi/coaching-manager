/** Unit tests for the leaderboard ranking read model (T-063, D-055). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { insert } from '@/core/db/repository'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { LeaderboardValidationError, rankedLeaderboard } from './service'
import type { RankQuery } from './types'

const base = {
  created_at: 1,
  updated_at: 1,
  deleted_at: null,
  version: 1,
}

async function seeded() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  const c = makeAuditContext('leaderboard-test')
  await insert(db, c, 'academic_years', {
    ...base,
    id: 'ay-1',
    name: '2026',
    starts_on: '2026-01-01',
    ends_on: '2026-12-31',
    is_current: 1,
  })
  await insert(db, c, 'classes', { ...base, id: 'c-1', name: 'Class 10', sort_order: 1 })
  await insert(db, c, 'classes', { ...base, id: 'c-2', name: 'Class 9', sort_order: 2 })
  for (const batch of [
    { id: 'b-1', name: 'Morning', class_id: 'c-1' },
    { id: 'b-2', name: 'Evening', class_id: 'c-1' },
  ]) {
    await insert(db, c, 'batches', {
      ...base,
      ...batch,
      academic_year_id: 'ay-1',
      days_mask: 62,
      start_time: '09:00',
      end_time: '10:00',
      capacity: 30,
      monthly_fee_minor: 100000,
      status: 'active',
    })
  }
  const roster: Array<[string, string, string, string]> = [
    ['s-1', 'Rahim', '2026-0001', 'b-1'],
    ['s-2', 'Karim', '2026-0002', 'b-1'],
    ['s-3', 'Asha', '2026-0003', 'b-1'],
    ['s-4', 'Jacob', '2026-0004', 'b-1'],
    ['s-5', 'Mina', '2026-0005', 'b-2'],
  ]
  for (const [id, name, no, batchId] of roster) {
    await insert(db, c, 'students', {
      ...base,
      id,
      student_no: no,
      full_name: name,
      admitted_on: '2026-01-01',
    })
    await insert(db, c, 'enrollments', {
      ...base,
      id: `e-${id}`,
      student_id: id,
      batch_id: batchId,
      enrolled_on: '2026-01-01',
      monthly_fee_minor: 100000,
      discount_kind: 'none',
      discount_value: 0,
    })
  }
  const exams: Array<[string, string, string]> = [
    ['x-1', 'b-1', '2026-03-01'],
    ['x-2', 'b-1', '2026-03-15'],
    ['x-3', 'b-1', '2026-04-01'],
    ['x-4', 'b-2', '2026-03-01'],
  ]
  for (const [id, batchId, heldOn] of exams) {
    await insert(db, c, 'exams', {
      ...base,
      id,
      batch_id: batchId,
      subject_id: null,
      name: id,
      held_on: heldOn,
      full_marks: 100,
      pass_marks: 33,
    })
  }
  const marks: Array<[string, string, number]> = [
    ['x-1', 's-1', 90],
    ['x-2', 's-1', 90],
    ['x-3', 's-1', 90],
    ['x-1', 's-2', 80],
    ['x-2', 's-2', 80],
    ['x-3', 's-2', 80],
    ['x-1', 's-3', 80],
    ['x-2', 's-3', 80],
    ['x-3', 's-3', 80],
    ['x-1', 's-4', 70],
    ['x-2', 's-4', 70],
    ['x-3', 's-4', 70],
    ['x-4', 's-5', 60],
  ]
  for (const [examId, studentId, mark] of marks) {
    await db.run(
      'INSERT INTO exam_results (exam_id, student_id, marks, absent, updated_at) VALUES (?, ?, ?, 0, 1)',
      [examId, studentId, mark],
    )
  }
  return db
}

const examScope: RankQuery = { scope: 'exam', examId: 'x-1', filter: { kind: 'all' } }

describe('leaderboard ranking', () => {
  it('gives tied totals the same rank and skips the next rank (1, 2, 2, 4)', async () => {
    const rows = await rankedLeaderboard(await seeded(), examScope)
    expect(rows.map((row) => row.rank)).toEqual([1, 2, 2, 4])
    expect(rows.map((row) => row.totalMarks)).toEqual([90, 80, 80, 70])
    expect(rows[1]?.studentId).toBe('s-2')
    expect(rows[2]?.studentId).toBe('s-3')
  })

  it('counts absent as zero in totals and excludes it from the average', async () => {
    const db = await seeded()
    await db.run(
      'UPDATE exam_results SET marks = NULL, absent = 1 WHERE exam_id = ? AND student_id = ?',
      ['x-3', 's-4'],
    )
    const rows = await rankedLeaderboard(db, {
      scope: 'year',
      academicYearId: 'ay-1',
      filter: { kind: 'all' },
    })
    const jacob = rows.find((row) => row.studentId === 's-4')
    expect(jacob?.totalMarks).toBe(140)
    expect(jacob?.absentCount).toBe(1)
    expect(jacob?.average).toBe(70)
    expect(rows.map((row) => row.rank)).toEqual([1, 2, 2, 4, 5])
  })

  it('returns the right set for each scope', async () => {
    const db = await seeded()
    const march = await rankedLeaderboard(db, {
      scope: 'month',
      month: '2026-03',
      filter: { kind: 'all' },
    })
    expect(march).toHaveLength(5)
    expect(march[0]?.totalMarks).toBe(180)

    const april = await rankedLeaderboard(db, {
      scope: 'month',
      month: '2026-04',
      filter: { kind: 'all' },
    })
    expect(april).toHaveLength(4)

    const year = await rankedLeaderboard(db, {
      scope: 'year',
      academicYearId: 'ay-1',
      filter: { kind: 'all' },
    })
    expect(year).toHaveLength(5)

    const otherYear = await rankedLeaderboard(db, {
      scope: 'year',
      academicYearId: 'ay-2',
      filter: { kind: 'all' },
    })
    expect(otherYear).toEqual([])
  })

  it('filters by batch and by class', async () => {
    const db = await seeded()
    const byBatch = await rankedLeaderboard(db, {
      scope: 'month',
      month: '2026-03',
      filter: { kind: 'batch', id: 'b-1' },
    })
    expect(byBatch.map((row) => row.studentId)).toEqual(['s-1', 's-2', 's-3', 's-4'])

    const byClass = await rankedLeaderboard(db, {
      scope: 'month',
      month: '2026-03',
      filter: { kind: 'class', id: 'c-1' },
    })
    expect(byClass).toHaveLength(5)

    const emptyClass = await rankedLeaderboard(db, {
      scope: 'month',
      month: '2026-03',
      filter: { kind: 'class', id: 'c-2' },
    })
    expect(emptyClass).toEqual([])
  })

  it('rejects a scope without its required selector', async () => {
    const db = await seeded()
    await expect(
      rankedLeaderboard(db, { scope: 'exam', filter: { kind: 'all' } }),
    ).rejects.toBeInstanceOf(LeaderboardValidationError)
    await expect(
      rankedLeaderboard(db, { scope: 'month', month: 'March', filter: { kind: 'all' } }),
    ).rejects.toBeInstanceOf(LeaderboardValidationError)
  })
})
