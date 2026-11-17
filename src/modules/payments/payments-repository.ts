/**
 * Payment records, receipt numbers and allocations (T-051, D-047). Every write runs inside the
 * caller's transaction so a failed allocation rolls back the receipt increment too — numbers stay
 * gapless. SQL is bound and lives here, never in UI code.
 */
import { writeAudit, type AuditContext } from '@/core/audit/write'
import { repoWithin } from '@/core/db/repository'
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

/** Remove every allocation of a payment before re-allocation; each removal is audited (T-052). */
export async function deleteAllocations(
  t: Db,
  ctx: AuditContext,
  paymentId: string,
): Promise<void> {
  const rows = await t.query<{ charge_id: string; amount_minor: number }>(
    'SELECT charge_id, amount_minor FROM payment_allocations WHERE payment_id = ?',
    [paymentId],
  )
  await t.run('DELETE FROM payment_allocations WHERE payment_id = ?', [paymentId])
  for (const row of rows) {
    await writeAudit(t, ctx, {
      entity: 'payment_allocations',
      entityId: `${paymentId}:${row.charge_id}`,
      action: 'delete',
      before: { payment_id: paymentId, charge_id: row.charge_id, amount_minor: row.amount_minor },
      after: null,
    })
  }
}

/** Audited payment edit inside the caller's transaction; the receipt number is never patched. */
export async function updatePayment(
  t: Db,
  ctx: AuditContext,
  paymentId: string,
  patch: {
    paidOn: string
    method: string
    amountMinor: number
    note: string | null
    revision: number
  },
  expectedVersion: number,
): Promise<void> {
  await repoWithin(t, ctx).update(
    'payments',
    paymentId,
    {
      paid_on: patch.paidOn,
      method: patch.method,
      amount_minor: patch.amountMinor,
      note: patch.note,
      revision: patch.revision,
    },
    expectedVersion,
  )
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

export interface StudentDue {
  student_id: string
  total_due_minor: number
}

/**
 * One aggregation for the whole dues report (T-053, D-049 D1). A charge's due is its net amount
 * minus allocations of valid payments — the same rule `openCharges` applies per student — and only
 * students who still owe something are returned. Reads payments' own tables only (TAD.md §2).
 */
export function duesByStudent(db: Db): Promise<StudentDue[]> {
  // T-083: one grouped pass over allocations, then a single join to charges. The old correlated
  // subquery re-scanned every allocation for each charge (46 s at 60,000 payments).
  return db.query<StudentDue>(
    'WITH paid AS (' +
      'SELECT a.charge_id AS charge_id, SUM(a.amount_minor) AS paid_minor ' +
      'FROM payment_allocations a JOIN payments p ON p.id = a.payment_id ' +
      "WHERE p.status = 'valid' AND p.deleted_at IS NULL GROUP BY a.charge_id) " +
      'SELECT c.student_id AS student_id, ' +
      'SUM(MAX(c.amount_minor - c.discount_minor - COALESCE(paid.paid_minor, 0), 0)) AS total_due_minor ' +
      'FROM charges c LEFT JOIN paid ON paid.charge_id = c.id ' +
      'WHERE c.deleted_at IS NULL GROUP BY c.student_id HAVING total_due_minor > 0 ' +
      'ORDER BY total_due_minor DESC, student_id',
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

/** Payment history for one student, newest first (T-053 student Payments tab). */
export function listPaymentsForStudent(db: Db, studentId: string): Promise<Row[]> {
  return db.query<Row>(
    'SELECT * FROM payments WHERE student_id = ? AND deleted_at IS NULL ' +
      'ORDER BY paid_on DESC, receipt_no DESC',
    [studentId],
  )
}

/** One live payment for the print route (T-054). */
export async function paymentById(db: Db, paymentId: string): Promise<Row | undefined> {
  const rows = await db.query<Row>('SELECT * FROM payments WHERE id = ? AND deleted_at IS NULL', [
    paymentId,
  ])
  return rows[0]
}

export interface AllocationMonth {
  month: string | null
  kind: string
  amount_minor: number
}

/** Months a receipt covered, from its allocations back to charges (T-054 E1). */
export function allocationMonths(db: Db, paymentId: string): Promise<AllocationMonth[]> {
  return db.query<AllocationMonth>(
    'SELECT c.month, c.kind, a.amount_minor FROM payment_allocations a ' +
      'JOIN charges c ON c.id = a.charge_id WHERE a.payment_id = ? ' +
      "ORDER BY (c.kind = 'admission') DESC, c.month",
    [paymentId],
  )
}
