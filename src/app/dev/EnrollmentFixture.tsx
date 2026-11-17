/**
 * Test-only fixture route (`/__enrollment-fixture`) for T-043. Seeds one student and two batches
 * through the owning modules' repositories so `enrollments.spec.ts` can drive the real screen
 * without depending on the students/academics UIs. Not product UI.
 */
import { useState } from 'react'
import { getDb } from '@/core/db/client'
import { makeAuditContext } from '@/core/audit/write'
import { years, classes, batches } from '@/modules/academics/repository'
import { create as createStudent } from '@/modules/students/repository'

export function EnrollmentFixture() {
  const db = getDb()
  const [status, setStatus] = useState('idle')

  async function seed() {
    setStatus('seeding')
    const ctx = makeAuditContext('fixture')
    const yearId = await years.create(db, ctx, {
      name: '2026',
      starts_on: '2026-01-01',
      ends_on: '2026-12-31',
      is_current: 1,
    })
    const classId = await classes.create(db, ctx, { name: 'Class 11', sort_order: 1 })
    for (const [name, capacity] of [
      ['Batch A', 10],
      ['Batch B', 10],
      ['Batch Small', 1],
    ] as const) {
      await batches.create(db, ctx, {
        academic_year_id: yearId,
        class_id: classId,
        name,
        days_mask: 2,
        start_time: '09:00',
        end_time: '10:00',
        room: name,
        capacity,
        monthly_fee_minor: 100000,
        status: 'active',
      })
    }
    await createStudent(db, ctx, {
      student_no: '2026-0001',
      full_name: 'Fixture Student',
      admitted_on: '2026-01-01',
      status: 'active',
    })
    setStatus('ready')
  }

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Enrollment fixture</h1>
      <p data-testid="fixture-status">{status}</p>
      <button type="button" data-testid="fixture-seed" onClick={() => void seed()}>
        Seed
      </button>
    </main>
  )
}
