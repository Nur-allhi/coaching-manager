/**
 * Enrollments service (T-043, D-044). Enroll, transfer, leave date, discounts and fee defaults.
 * The capacity warning reads batches only through the academics module's public API (TAD.md §2).
 */
import { makeAuditContext } from '@/core/audit/write'
import type { Db } from '@/core/db/types'
import { listBatches } from '@/modules/academics'
import { netAmount } from '@/core/money/money'
import * as repo from './repository'
import {
  enrollmentForm,
  toEnrollmentPatch,
  type DiscountKind,
  type EnrollmentForm,
  type EnrollmentRow,
} from './types'

export class EnrollmentsValidationError extends Error {
  readonly key: string

  constructor(key: string) {
    super(key)
    this.name = 'EnrollmentsValidationError'
    this.key = key
  }
}

function validated(values: EnrollmentForm): EnrollmentForm {
  const result = enrollmentForm.safeParse(values)
  if (!result.success) throw new EnrollmentsValidationError('enrollments.invalidInput')
  const form = result.data
  if (form.leftOn && form.leftOn < form.enrolledOn) {
    throw new EnrollmentsValidationError('enrollments.leaveBeforeEnroll')
  }
  if (form.discountKind !== 'none' && Number(form.discountValue) <= 0) {
    throw new EnrollmentsValidationError('enrollments.invalidDiscount')
  }
  return form
}

export async function listEnrollments(db: Db): Promise<EnrollmentRow[]> {
  return repo.all(db)
}

export async function listForStudent(db: Db, studentId: string): Promise<EnrollmentRow[]> {
  return repo.forStudent(db, studentId)
}

export async function enroll(db: Db, values: EnrollmentForm): Promise<string> {
  return repo.create(db, toEnrollmentPatch(validated(values)))
}

/**
 * Closing one enrollment and opening another in one transaction keeps the old row in history;
 * no delete, no rewrite. Both writes are audited in the same commit.
 */
export async function transfer(
  db: Db,
  oldId: string,
  oldVersion: number,
  values: EnrollmentForm,
): Promise<string> {
  const patch = toEnrollmentPatch(validated(values))
  return db.tx(async (t) => {
    const ctx = makeAuditContext()
    await repo.updateWithin(
      t,
      ctx,
      oldId,
      { status: 'closed', left_on: String(patch.enrolled_on) },
      oldVersion,
    )
    return repo.createWithin(t, ctx, patch)
  })
}

export async function setLeaveDate(
  db: Db,
  id: string,
  version: number,
  leftOn: string,
): Promise<void> {
  const date = enrollmentForm.shape.leftOn.safeParse(leftOn)
  if (!date.success) throw new EnrollmentsValidationError('enrollments.invalidInput')
  const row = await repo.byId(db, id)
  if (!row) throw new EnrollmentsValidationError('enrollments.invalidInput')
  if (leftOn !== '' && leftOn < String(row.enrolled_on)) {
    throw new EnrollmentsValidationError('enrollments.leaveBeforeEnroll')
  }
  // Leaving a batch closes the enrollment so it stops counting toward capacity.
  await repo.updateEnrollment(
    db,
    id,
    { left_on: leftOn === '' ? null : date.data, status: leftOn === '' ? 'active' : 'closed' },
    version,
  )
}

export async function removeEnrollment(db: Db, id: string, version: number): Promise<void> {
  await repo.softDeleteEnrollment(db, id, version)
}

/** Fee defaults come from the batch through academics' public surface, never its table. */
export async function feeDefaultsForBatch(
  db: Db,
  batchId: string,
): Promise<{ monthlyFee: string; admissionFee: string }> {
  const batch = (await listBatches(db)).find((row) => String(row.id) === batchId)
  return {
    monthlyFee: batch ? String(batch.monthly_fee_minor) : '0',
    admissionFee: '0',
  }
}

/** Non-blocking capacity warning: count this module's active rows, read capacity from academics. */
export async function capacityWarningFor(db: Db, batchId: string): Promise<boolean> {
  const batch = (await listBatches(db)).find((row) => String(row.id) === batchId)
  if (!batch || batch.capacity === null) return false
  const count = await repo.activeCountForBatch(db, batchId)
  // A full batch warns in the enrollment form: adding one more would exceed capacity.
  return count >= Number(batch.capacity)
}

/** The net monthly fee after a fixed or percent discount, in integer paisa (TAD §5.6). */
export function discountedMonthlyFee(
  monthlyFeeMinor: number,
  kind: DiscountKind,
  value: number,
): number {
  // Reuse the integer-paisa helper so a percent discount rounds exactly once (REPO_RULES §7.4).
  // Be defensive: a legacy bad row must never crash the render of the whole list.
  if (!Number.isSafeInteger(monthlyFeeMinor) || monthlyFeeMinor < 0) return 0
  if (!Number.isSafeInteger(value) || value < 0) return monthlyFeeMinor
  if (kind === 'percent' && value > 100) return monthlyFeeMinor
  if (kind === 'fixed' && value > monthlyFeeMinor) return 0
  return netAmount(monthlyFeeMinor, kind, value)
}
