/**
 * Test-only route (`/__leaderboard-fixture`) for T-063. Seeds a tie (two students on the same
 * total) so leaderboard.spec.ts can assert competition ranks 1, 2, 2, 4 in the real screen.
 * Not product UI.
 */
import { useState } from 'react'
import { makeAuditContext } from '@/core/audit/write'
import { getDb } from '@/core/db/client'
import { insert } from '@/core/db/repository'

const ROSTER: Array<[string, string, string]> = [
  ['lb-1', 'Rahim', '2026-0001'],
  ['lb-2', 'Karim', '2026-0002'],
  ['lb-3', 'Asha', '2026-0003'],
  ['lb-4', 'Jacob', '2026-0004'],
]
const MARKS: Record<string, number> = { 'lb-1': 90, 'lb-2': 80, 'lb-3': 80, 'lb-4': 70 }

const base = { created_at: 1, updated_at: 1, deleted_at: null, version: 1 }

export function LeaderboardFixture() {
  const db = getDb()
  const [status, setStatus] = useState('idle')

  async function seed() {
    setStatus('seeding')
    const c = makeAuditContext('leaderboard-fixture')
    await insert(db, c, 'academic_years', {
      ...base,
      id: 'lb-ay',
      name: '2026',
      starts_on: '2026-01-01',
      ends_on: '2026-12-31',
      is_current: 1,
    })
    await insert(db, c, 'classes', { ...base, id: 'lb-class', name: 'Class 10', sort_order: 1 })
    await insert(db, c, 'batches', {
      ...base,
      id: 'lb-batch',
      academic_year_id: 'lb-ay',
      class_id: 'lb-class',
      name: 'Morning',
      days_mask: 62,
      start_time: '09:00',
      end_time: '10:00',
      capacity: 30,
      monthly_fee_minor: 100000,
      status: 'active',
    })
    for (const [id, name, no] of ROSTER) {
      await insert(db, c, 'students', {
        ...base,
        id,
        student_no: no,
        full_name: name,
        admitted_on: '2026-01-01',
      })
      await insert(db, c, 'enrollments', {
        ...base,
        id: `lb-e-${id}`,
        student_id: id,
        batch_id: 'lb-batch',
        enrolled_on: '2026-01-01',
        monthly_fee_minor: 100000,
        discount_kind: 'none',
        discount_value: 0,
      })
    }
    for (const [index, heldOn] of ['2026-03-01', '2026-03-15'].entries()) {
      const examId = `lb-exam-${index}`
      await insert(db, c, 'exams', {
        ...base,
        id: examId,
        batch_id: 'lb-batch',
        subject_id: null,
        name: `Test ${index + 1}`,
        held_on: heldOn,
        full_marks: 100,
        pass_marks: 33,
      })
      for (const [studentId] of ROSTER) {
        await db.run(
          'INSERT INTO exam_results (exam_id, student_id, marks, absent, updated_at) VALUES (?, ?, ?, 0, 1)',
          [examId, studentId, MARKS[studentId] ?? 0],
        )
      }
    }
    setStatus('ready')
  }

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Leaderboard fixture</h1>
      <p data-testid="fixture-status">{status}</p>
      <button type="button" data-testid="fixture-seed" onClick={() => void seed()}>
        Seed
      </button>
    </main>
  )
}
