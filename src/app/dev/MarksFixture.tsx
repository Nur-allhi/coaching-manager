/**
 * Test-only route (`/__marks-fixture`) for T-061. Seeds a batch, subject and enrolled roster,
 * then creates the exam through the real service so marks.spec.ts can drive /exams/:id.
 * Not product UI.
 */
import { useState } from 'react'
import { makeAuditContext } from '@/core/audit/write'
import { insert } from '@/core/db/repository'
import { getDb } from '@/core/db/client'
import { createExam } from '@/modules/exams/service'

const ROSTER: Array<[string, string, string]> = [
  ['s-1', 'Rahim', '2026-0001'],
  ['s-2', 'Karim', '2026-0002'],
  ['s-3', 'Asha', '2026-0003'],
]

export function MarksFixture() {
  const db = getDb()
  const [status, setStatus] = useState('idle')
  const [examId, setExamId] = useState('')

  async function seed() {
    setStatus('seeding')
    const c = makeAuditContext('marks-fixture')
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
      monthly_fee_minor: 1000,
      status: 'active',
    })
    for (const [id, name, no] of ROSTER) {
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
        monthly_fee_minor: 1000,
        discount_kind: 'none',
        discount_value: 0,
      })
    }
    const id = await createExam(db, {
      batchId: 'b-1',
      subjectId: 'sub-1',
      heldOn: '2026-03-01',
      name: 'Midterm',
      fullMarks: 100,
      passMarks: 33,
    })
    setExamId(id)
    setStatus('ready')
  }

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Marks fixture</h1>
      <p data-testid="fixture-status">{status}</p>
      <p data-testid="fixture-exam-id">{examId}</p>
      <button type="button" data-testid="fixture-seed" onClick={() => void seed()}>
        Seed
      </button>
    </main>
  )
}
