/**
 * Recording a payment with allocation (T-051, D-047). Partial, advance and multi-month payments
 * are all the same operation: allocate oldest-first, cap by net due and payment amount, and keep
 * the unallocated remainder as an advance on the payment row. Number, row and allocations commit
 * together, so a failure leaves no receipt gap and no partial allocation.
 */
import { z } from 'zod'
import { makeAuditContext } from '@/core/audit/write'
import type { Db } from '@/core/db/types'
import type { Row } from '@/core/db/repository'
import * as repo from './payments-repository'

const paymentSchema = z.object({
  studentId: z.string().min(1),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  method: z.enum(['cash', 'bank', 'mobile']),
  amountMinor: z.number().int().positive(),
  note: z.string(),
})

export type PaymentInput = z.input<typeof paymentSchema>

export class PaymentValidationError extends Error {
  readonly key: string

  constructor(key: string) {
    super(key)
    this.name = 'PaymentValidationError'
    this.key = key
  }
}

export interface RecordedPayment {
  id: string
  receiptNo: string
  allocatedMinor: number
  advanceMinor: number
}

/** Allocate a payment across the student's open charges, oldest first, inside one transaction. */
export async function recordPayment(db: Db, input: PaymentInput): Promise<RecordedPayment> {
  const parsed = paymentSchema.safeParse(input)
  if (!parsed.success) throw new PaymentValidationError('payments.invalidPayment')
  const value = parsed.data

  return db.tx(async (t) => {
    const ctx = makeAuditContext()
    const receiptNo = await repo.nextReceiptNumber(t, value.paidOn.slice(0, 4))
    const id = await repo.insertPayment(t, ctx, {
      studentId: value.studentId,
      paidOn: value.paidOn,
      method: value.method,
      amountMinor: value.amountMinor,
      note: value.note.trim() === '' ? null : value.note.trim(),
      receiptNo,
    })

    let remaining = value.amountMinor
    for (const charge of await repo.openCharges(t, value.studentId)) {
      if (remaining === 0) break
      const due = Math.max(0, charge.amount_minor - charge.discount_minor - charge.paid_minor)
      const amount = Math.min(remaining, due)
      if (amount > 0) {
        await repo.insertAllocation(t, ctx, id, charge.id, amount)
        remaining -= amount
      }
    }
    return {
      id,
      receiptNo,
      allocatedMinor: value.amountMinor - remaining,
      advanceMinor: remaining,
    }
  })
}

/** Spare capacity on earlier valid payments is applied to charges that still have a net due. */
export async function allocateAdvances(db: Db): Promise<number> {
  return db.tx(async (t) => {
    const ctx = makeAuditContext()
    let allocated = 0
    for (const payment of await repo.advancePayments(t)) {
      if (payment.spare_minor <= 0) continue // a fully-used earlier payment must not hide later advances
      // Charges for the student who paid, oldest first.
      const rows = await t.query<{ student_id: string }>(
        'SELECT student_id FROM payments WHERE id = ?',
        [payment.id],
      )
      const studentId = String(rows[0]?.student_id ?? '')
      if (!studentId) continue
      let spare = payment.spare_minor
      for (const charge of await repo.openCharges(t, studentId)) {
        if (spare === 0) break
        const due = Math.max(0, charge.amount_minor - charge.discount_minor - charge.paid_minor)
        const amount = Math.min(spare, due)
        if (amount > 0) {
          await repo.insertAllocation(t, ctx, payment.id, charge.id, amount)
          spare -= amount
          allocated += amount
        }
      }
    }
    return allocated
  })
}

export interface DueSummary {
  charges: Array<{ id: string; month: string | null; kind: string; netDueMinor: number }>
  totalDueMinor: number
}

/** The dues preview for the collect screen and for tests. */
export async function duesForStudent(db: Db, studentId: string): Promise<DueSummary> {
  const charges = await repo.openCharges(db, studentId)
  const rows = charges.map((charge) => ({
    id: charge.id,
    month: charge.month,
    kind: charge.kind,
    netDueMinor: Math.max(0, charge.amount_minor - charge.discount_minor - charge.paid_minor),
  }))
  return {
    charges: rows,
    totalDueMinor: rows.reduce((sum, row) => sum + row.netDueMinor, 0),
  }
}

export function listRecordedPayments(db: Db): Promise<Row[]> {
  return repo.listPayments(db)
}

/** Reused by the charge generator (T-050) to allocate advances to newly created charges. */
export async function applyAdvancesAfterGeneration(db: Db): Promise<number> {
  return allocateAdvances(db)
}
