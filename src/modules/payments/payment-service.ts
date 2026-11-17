/**
 * Recording a payment with allocation (T-051, D-047). Partial, advance and multi-month payments
 * are all the same operation: allocate oldest-first, cap by net due and payment amount, and keep
 * the unallocated remainder as an advance on the payment row. Number, row and allocations commit
 * together, so a failure leaves no receipt gap and no partial allocation.
 */
import { z } from 'zod'
import { makeAuditContext } from '@/core/audit/write'
import { assertPermission } from '@/core/auth/authorize'
import type { Session } from '@/core/auth/session'
import { assertVersion, findById } from '@/core/db/repository'
import { voidRecord } from '@/core/db/void-restore'
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

export class PaymentNotFoundError extends Error {
  readonly key = 'payments.notFound'

  constructor() {
    super('payments.notFound')
    this.name = 'PaymentNotFoundError'
  }
}

export class PaymentStateError extends Error {
  readonly key: string

  constructor(key: string) {
    super(key)
    this.name = 'PaymentStateError'
    this.key = key
  }
}

export interface RecordedPayment {
  id: string
  receiptNo: string
  allocatedMinor: number
  advanceMinor: number
}

/** Allocate `amountMinor` to `chargeId` rows, oldest first; returns the unallocated remainder. */
async function allocateToOpenCharges(
  t: Db,
  ctx: ReturnType<typeof makeAuditContext>,
  paymentId: string,
  studentId: string,
  amountMinor: number,
): Promise<number> {
  let remaining = amountMinor
  for (const charge of await repo.openCharges(t, studentId)) {
    if (remaining === 0) break
    const due = Math.max(0, charge.amount_minor - charge.discount_minor - charge.paid_minor)
    const amount = Math.min(remaining, due)
    if (amount > 0) {
      await repo.insertAllocation(t, ctx, paymentId, charge.id, amount)
      remaining -= amount
    }
  }
  return remaining
}

/** Allocate a payment across the student's open charges, oldest first, inside one transaction. */
export async function recordPayment(
  db: Db,
  input: PaymentInput,
  actorId: string | null = null,
): Promise<RecordedPayment> {
  const parsed = paymentSchema.safeParse(input)
  if (!parsed.success) throw new PaymentValidationError('payments.invalidPayment')
  const value = parsed.data

  return db.tx(async (t) => {
    const ctx = makeAuditContext(actorId)
    const receiptNo = await repo.nextReceiptNumber(t, value.paidOn.slice(0, 4))
    const id = await repo.insertPayment(t, ctx, {
      studentId: value.studentId,
      paidOn: value.paidOn,
      method: value.method,
      amountMinor: value.amountMinor,
      note: value.note.trim() === '' ? null : value.note.trim(),
      receiptNo,
    })

    const remaining = await allocateToOpenCharges(t, ctx, id, value.studentId, value.amountMinor)
    return {
      id,
      receiptNo,
      allocatedMinor: value.amountMinor - remaining,
      advanceMinor: remaining,
    }
  })
}

/**
 * Guarded entry point used by the UI (T-080): a role without `payments.write` is refused here,
 * so hiding the button is not the only control (SECURITY §4). The raw `recordPayment` stays for
 * internal service/test callers; the actor id from the session reaches the audit row.
 */
export async function recordPaymentAs(
  session: Session | null,
  db: Db,
  input: PaymentInput,
): Promise<RecordedPayment> {
  assertPermission(session, 'payments.write')
  return recordPayment(db, input, session?.actorId ?? null)
}

const editSchema = paymentSchema.omit({ studentId: true })
export type EditPaymentInput = z.input<typeof editSchema>

export interface EditedPayment {
  id: string
  receiptNo: string
  revision: number
  allocatedMinor: number
  advanceMinor: number
}

interface StoredPayment {
  id: string
  student_id: string
  receipt_no: string
  status: string
  revision: number
  version: number
}

/**
 * Edit a payment and re-run allocation (T-052). The receipt number is never touched; `revision`
 * counts edits. Old allocations are removed first so dues recompute from zero for this payment.
 */
export async function editPayment(
  db: Db,
  paymentId: string,
  input: EditPaymentInput,
  expectedVersion: number,
): Promise<EditedPayment> {
  const parsed = editSchema.safeParse(input)
  if (!parsed.success) throw new PaymentValidationError('payments.invalidPayment')
  const value = parsed.data
  assertVersion(expectedVersion)

  return db.tx(async (t) => {
    const ctx = makeAuditContext()
    const existing = await findById<StoredPayment>(t, 'payments', paymentId)
    if (!existing) throw new PaymentNotFoundError()
    if (existing.status !== 'valid') throw new PaymentStateError('payments.cannotEdit')

    await repo.deleteAllocations(t, ctx, paymentId)
    const revision = Number(existing.revision) + 1
    await repo.updatePayment(
      t,
      ctx,
      paymentId,
      {
        paidOn: value.paidOn,
        method: value.method,
        amountMinor: value.amountMinor,
        note: value.note.trim() === '' ? null : value.note.trim(),
        revision,
      },
      expectedVersion,
    )
    const remaining = await allocateToOpenCharges(
      t,
      ctx,
      paymentId,
      String(existing.student_id),
      value.amountMinor,
    )
    return {
      id: paymentId,
      receiptNo: String(existing.receipt_no),
      revision,
      allocatedMinor: value.amountMinor - remaining,
      advanceMinor: remaining,
    }
  })
}

/** Void keeps the row and its allocations; `openCharges` already ignores void payments. */
export function voidPayment(db: Db, paymentId: string, expectedVersion: number): Promise<void> {
  assertVersion(expectedVersion)
  return voidRecord(db, makeAuditContext(), 'payments', paymentId, expectedVersion)
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
      const remaining = await allocateToOpenCharges(
        t,
        ctx,
        payment.id,
        studentId,
        payment.spare_minor,
      )
      allocated += payment.spare_minor - remaining
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
