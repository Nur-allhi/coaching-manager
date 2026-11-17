/**
 * Payment records, receipt numbers and allocations (T-051, D-047). Every write runs inside the
 * caller's transaction so a failed allocation rolls back the receipt increment too — numbers stay
 * gapless. SQL is bound and lives here, never in UI code.
 */
import { writeAudit, type AuditContext } from '@/core/audit/write'
import type { Db } from '@/core/db/types'
import type { Row } from '@/core/db/repository'

export interface NewPayment {
  studentId: string
  paidOn: string
  method: string
  amountMinor: number
  note: string | null
  receiptNo: string
}

/** Increment the counter in this transaction; a rollback reverts the number (D-047 A1). */
export async function nextReceiptNumber(t: Db, year: string): Promise<string> {
  const rows = await t.query<{ value: number }>(
    'INSERT INTO counters (name, value) VALUES (?, 1) ' +
      'ON CONFLICT(name) DO UPDATE SET value = value + 1 RETURNING value',
    [`receipt-${year}`],
  )
  const value = rows[0]?.value ?? 1
  return `R-${year}-${String(value).padStart(6, '0')}`
}

export async function insertPayment(
  t: Db,
  ctx: AuditContext,
  payment: NewPayment,
): Promise<string> {
  const id = ctx.newId()
  await t.run(
    'INSERT INTO payments (id, created_at, updated_at, deleted_at, version, receipt_no, ' +
      'student_id, paid_on, method, amount_minor, note, status, revision) ' +
      'VALUES (?, ?, ?, NULL, 1, ?, ?, ?, ?, ?, ?, ?, 0)',
    [
      id,
      ctx.now,
      ctx.now,
      payment.receiptNo,
      payment.studentId,
      payment.paidOn,
      payment.method,
      payment.amountMinor,
      payment.note,
      'valid',
    ],
  )
  await writeAudit(t, ctx, {
    entity: 'payments',
    entityId: id,
    action: 'create',
    before: null,
    after: { ...payment, id },
  })
  return id
}

/** Insert one allocation; the PRIMARY KEY(payment_id, charge_id) stops duplicates. */
export async function insertAllocation(
  t: Db,
  ctx: AuditContext,
  paymentId: string,
  chargeId: string,
  amountMinor: number,
): Promise<void> {
  await t.run(
    'INSERT INTO payment_allocations (payment_id, charge_id, amount_minor) VALUES (?, ?, ?)',
    [paymentId, chargeId, amountMinor],
  )
  await writeAudit(t, ctx, {
    entity: 'payment_allocations',
    entityId: `${paymentId}:${chargeId}`,
    action: 'create',
    before: null,
    after: { payment_id: paymentId, charge_id: chargeId, amount_minor: amountMinor },
  })
}

export interface OpenCharge {
  id: string
  amount_minor: number
  discount_minor: number
  paid_minor: number
  month: string | null
  kind: string
}

/** Live charges for a student with their net due, oldest first. */
export async function openCharges(t: Db, studentId: string): Promise<OpenCharge[]> {
  return t.query<OpenCharge>(
    'SELECT c.id, c.amount_minor, c.discount_minor, c.month, c.kind, ' +
      'COALESCE((SELECT SUM(a.amount_minor) FROM payment_allocations a ' +
      "JOIN payments p ON p.id = a.payment_id WHERE a.charge_id = c.id AND p.status = 'valid' " +
      'AND p.deleted_at IS NULL), 0) AS paid_minor ' +
      'FROM charges c WHERE c.student_id = ? AND c.deleted_at IS NULL ' +
      "ORDER BY (c.kind = 'admission') DESC, c.month, c.id",
    [studentId],
  )
}

export interface AdvancePayment {
  id: string
  paid_on: string
  spare_minor: number
}

/** Valid payments with unallocated capacity, oldest first — the advance pool. */
export function advancePayments(t: Db): Promise<AdvancePayment[]> {
  return t.query<AdvancePayment>(
    'SELECT p.id, p.paid_on, ' +
      'p.amount_minor - COALESCE((SELECT SUM(a.amount_minor) FROM payment_allocations a WHERE a.payment_id = p.id), 0) AS spare_minor ' +
      "FROM payments p WHERE p.status = 'valid' AND p.deleted_at IS NULL " +
      'ORDER BY p.paid_on, p.id',
  )
}

export function listPayments(db: Db): Promise<Row[]> {
  return db.query<Row>(
    'SELECT * FROM payments WHERE deleted_at IS NULL ORDER BY paid_on DESC, receipt_no DESC',
  )
}
