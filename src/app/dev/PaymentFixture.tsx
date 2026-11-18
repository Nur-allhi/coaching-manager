/**
 * Test-only route (`/__payment-fixture`) for T-051: seeds one student with an enrollment and two
 * generated charges so `payments.spec.ts` can drive the real collect screen. Not product UI.
 */
import { useCallback, useState } from 'react'
import { makeAuditContext } from '@/core/audit/write'
import { getDb } from '@/core/db/client'
import { years, classes, batches } from '@/modules/academics/repository'
import { create as createStudent } from '@/modules/students/repository'
import { create as createEnrollment } from '@/modules/enrollments/repository'
import { generateCharges } from '@/modules/payments/service'

export function PaymentFixture() {
  const db = getDb()
  const [status, setStatus] = useState('idle')
  const [studentName, setStudentName] = useState('none')

  // T-090 reads the journey student back through this harness only to break it; every
  // assertion is made on the real product screens.
  const refreshName = useCallback(async () => {
    const rows = await db.query<{ full_name: string }>(
      'SELECT full_name FROM students WHERE student_no = ?',
      ['2026-0001'],
    )
    setStudentName(rows[0]?.full_name ?? 'none')
  }, [db])

  async function seed() {
    setStatus('seeding')
    const ctx = makeAuditContext('payment-fixture')
    const yearId = await years.create(db, ctx, {
      name: '2026',
      starts_on: '2026-01-01',
      ends_on: '2026-12-31',
      is_current: 1,
    })
    const classId = await classes.create(db, ctx, { name: 'Class 11', sort_order: 1 })
    const batchId = await batches.create(db, ctx, {
      academic_year_id: yearId,
      class_id: classId,
      name: 'A',
      days_mask: 2,
      start_time: '09:00',
      end_time: '10:00',
      room: 'A',
      capacity: 10,
      monthly_fee_minor: 1000,
      status: 'active',
    })
    const studentId = await createStudent(db, ctx, {
      student_no: '2026-0001',
      full_name: 'Fixture Student',
      admitted_on: '2026-01-01',
      status: 'active',
    })
    await createEnrollment(db, {
      student_id: studentId,
      batch_id: batchId,
      enrolled_on: '2026-01-01',
      left_on: null,
      admission_fee_minor: 50,
      monthly_fee_minor: 10,
      discount_kind: 'none',
      discount_value: 0,
      status: 'active',
    })
    await generateCharges(db, '2026-02')
    await refreshName()
    setStatus('ready')
  }

  async function breakStudent() {
    await db.run("UPDATE students SET full_name = 'BROKEN' WHERE student_no = '2026-0001'")
    await refreshName()
    setStatus('broken')
  }

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Payment fixture</h1>
      <p data-testid="fixture-status">{status}</p>
      <p data-testid="fixture-student-name">{studentName}</p>
      <div className="flex gap-2">
        <button type="button" data-testid="fixture-seed" onClick={() => void seed()}>
          Seed
        </button>
        <button type="button" data-testid="fixture-break" onClick={() => void breakStudent()}>
          Break student
        </button>
      </div>
    </main>
  )
}
