/**
 * Test-only route (`/__attendance-fixture`) for T-060. Seeds a batch with three enrolled students
 * so attendance.spec.ts can drive the real picker and grid. Not product UI.
 */
import { useState } from 'react'
import { makeAuditContext } from '@/core/audit/write'
import { insert } from '@/core/db/repository'
import { getDb } from '@/core/db/client'

export function AttendanceFixture() {
  const db = getDb()
  const [status, setStatus] = useState('idle')
  const [batchId, setBatchId] = useState('')

  async function seed() {
    setStatus('seeding')
    const c = makeAuditContext('attendance-fixture')
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
    for (const [id, name, no] of [
      ['s-1', 'Rahim', '2026-0001'],
      ['s-2', 'Karim', '2026-0002'],
      ['s-3', 'Asha', '2026-0003'],
    ] as Array<[string, string, string]>) {
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
    setBatchId('b-1')
    setStatus('ready')
  }

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Attendance fixture</h1>
      <p data-testid="fixture-status">{status}</p>
      <p data-testid="fixture-batch-id">{batchId}</p>
      <button type="button" data-testid="fixture-seed" onClick={() => void seed()}>
        Seed
      </button>
    </main>
  )
}
