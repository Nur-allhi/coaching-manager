/**
 * Test-only route (`/__dashboard-fixture`) for T-070. Seeds known payments/attendance/exam data so
 * dashboard.spec.ts can assert each KPI and its link against the real screen. Not product UI.
 */
import { useState } from 'react'
import { makeAuditContext } from '@/core/audit/write'
import { getDb } from '@/core/db/client'
import { today } from '@/core/dates/dates'
import { insert } from '@/core/db/repository'

const base = { created_at: 1, updated_at: 1, deleted_at: null, version: 1 }
const ROSTER: Array<[string, string]> = [
  ['db-1', 'Rahim'],
  ['db-2', 'Karim'],
  ['db-3', 'Asha'],
  ['db-4', 'Old Student'],
]

export function DashboardFixture() {
  const db = getDb()
  const [status, setStatus] = useState('idle')

  async function seed() {
    setStatus('seeding')
    const c = makeAuditContext('dashboard-fixture')
    await insert(db, c, 'academic_years', {
      ...base,
      id: 'db-ay',
      name: '2026',
      starts_on: '2026-01-01',
      ends_on: '2026-12-31',
      is_current: 1,
    })
    await insert(db, c, 'classes', { ...base, id: 'db-class', name: 'Class 10', sort_order: 1 })
    await insert(db, c, 'batches', {
      ...base,
      id: 'db-batch',
      academic_year_id: 'db-ay',
      class_id: 'db-class',
      name: 'Morning',
      days_mask: 127,
      start_time: '09:00',
      end_time: '10:00',
      capacity: 30,
      monthly_fee_minor: 100000,
      status: 'active',
    })
    const month = today().slice(0, 7)
    for (const [id, name] of ROSTER) {
      await insert(db, c, 'students', {
        ...base,
        id,
        student_no: `2026-${id}`,
        full_name: name,
        admitted_on: id === 'db-4' ? '2020-01-01' : `${month}-01`,
      })
      await insert(db, c, 'enrollments', {
        ...base,
        id: `db-e-${id}`,
        student_id: id,
        batch_id: 'db-batch',
        enrolled_on: '2026-01-01',
        monthly_fee_minor: 100000,
        discount_kind: 'none',
        discount_value: 0,
      })
      await insert(db, c, 'charges', {
        ...base,
        id: `db-ch-${id}`,
        enrollment_id: `db-e-${id}`,
        student_id: id,
        month: null,
        kind: 'admission',
        amount_minor: 100000,
        discount_minor: 0,
      })
    }
    await insert(db, c, 'payments', {
      ...base,
      id: 'db-p-1',
      receipt_no: 'R-2026-000001',
      student_id: 'db-1',
      paid_on: '2026-03-02',
      amount_minor: 40000,
      status: 'valid',
      revision: 0,
    })
    await insert(db, c, 'payments', {
      ...base,
      id: 'db-p-2',
      receipt_no: 'R-2026-000002',
      student_id: 'db-2',
      paid_on: '2026-03-02',
      amount_minor: 50000,
      status: 'void',
      revision: 0,
    })
    await db.run(
      'INSERT INTO payment_allocations (payment_id, charge_id, amount_minor) VALUES (?, ?, ?)',
      ['db-p-1', 'db-ch-db-1', 40000],
    )
    await insert(db, c, 'attendance_sessions', {
      ...base,
      id: 'db-session',
      batch_id: 'db-batch',
      held_on: '2026-03-02',
    })
    for (const [student, statusValue] of [
      ['db-1', 'present'],
      ['db-2', 'present'],
      ['db-3', 'absent'],
    ] as const) {
      await db.run(
        'INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)',
        ['db-session', student, statusValue],
      )
    }
    await insert(db, c, 'exams', {
      ...base,
      id: 'db-exam',
      batch_id: 'db-batch',
      subject_id: null,
      name: 'Test',
      held_on: '2026-03-01',
      full_marks: 100,
      pass_marks: 33,
    })
    for (const [student, marks] of [
      ['db-1', 90],
      ['db-2', 80],
    ] as const) {
      await db.run(
        'INSERT INTO exam_results (exam_id, student_id, marks, absent, updated_at) VALUES (?, ?, ?, 0, 1)',
        ['db-exam', student, marks],
      )
    }
    setStatus('ready')
  }

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Dashboard fixture</h1>
      <p data-testid="fixture-status">{status}</p>
      <button type="button" data-testid="fixture-seed" onClick={() => void seed()}>
        Seed
      </button>
    </main>
  )
}
