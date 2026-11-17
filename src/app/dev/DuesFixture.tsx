/**
 * Test-only route (`/__dues-fixture`) for T-053: seeds three students across two batches and
 * classes, two with dues and one fully paid. Not product UI.
 */
import { useState } from 'react'
import { makeAuditContext } from '@/core/audit/write'
import { getDb } from '@/core/db/client'
import { years, classes, batches } from '@/modules/academics/repository'
import { create as createStudent } from '@/modules/students/repository'
import { create as createEnrollment } from '@/modules/enrollments/repository'
import { generateCharges } from '@/modules/payments/service'
import { recordPayment } from '@/modules/payments/payment-service'

export function DuesFixture() {
  const db = getDb()
  const [status, setStatus] = useState('idle')
  const [paidId, setPaidId] = useState('')

  async function seed() {
    setStatus('seeding')
    const ctx = makeAuditContext('dues-fixture')
    const yearId = await years.create(db, ctx, {
      name: '2026',
      starts_on: '2026-01-01',
      ends_on: '2026-12-31',
      is_current: 1,
    })
    const alpha = await classes.create(db, ctx, { name: 'Alpha', sort_order: 1 })
    const beta = await classes.create(db, ctx, { name: 'Beta', sort_order: 2 })
    const batchA = await batches.create(db, ctx, {
      academic_year_id: yearId,
      class_id: alpha,
      name: 'A',
      days_mask: 2,
      start_time: '09:00',
      end_time: '10:00',
      room: 'A',
      capacity: 10,
      monthly_fee_minor: 100000,
      status: 'active',
    })
    const batchB = await batches.create(db, ctx, {
      academic_year_id: yearId,
      class_id: beta,
      name: 'B',
      days_mask: 4,
      start_time: '11:00',
      end_time: '12:00',
      room: 'B',
      capacity: 10,
      monthly_fee_minor: 100000,
      status: 'active',
    })
    for (const [index, name, batchId] of [
      [1, 'Dues One', batchA],
      [2, 'Dues Two', batchB],
      [3, 'Paid Three', batchA],
    ] as const) {
      const studentId = await createStudent(db, ctx, {
        student_no: `2026-000${index}`,
        full_name: name,
        admitted_on: '2026-01-01',
        status: 'active',
      })
      await createEnrollment(db, {
        student_id: studentId,
        batch_id: batchId,
        enrolled_on: '2026-01-01',
        left_on: null,
        admission_fee_minor: 5000,
        monthly_fee_minor: 1000,
        discount_kind: 'none',
        discount_value: 0,
        status: 'active',
      })
      if (index === 3) {
        setPaidId(studentId)
        await recordPayment(db, {
          studentId,
          paidOn: '2026-02-10',
          method: 'cash',
          amountMinor: 6000,
          note: '',
        })
      }
    }
    await generateCharges(db, '2026-02')
    setStatus('ready')
  }

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Dues fixture</h1>
      <p data-testid="fixture-status">{status}</p>
      <p data-testid="paid-student-id">{paidId}</p>
      <button type="button" data-testid="fixture-seed" onClick={() => void seed()}>
        Seed
      </button>
    </main>
  )
}
