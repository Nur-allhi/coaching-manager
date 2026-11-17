/**
 * Fee rules and monthly charge generation (T-050, D-046).
 * Active enrollments come from the enrollments module's public index.ts (TAD.md §2). Discounts
 * use the integer-paisa core helpers; a percent discount rounds exactly once, at generation.
 */
import { makeAuditContext } from '@/core/audit/write'
import type { Db } from '@/core/db/types'
import type { Row } from '@/core/db/repository'
import { applyFixedDiscount, applyPercentDiscount } from '@/core/money/money'
import { isMonth } from '@/core/dates/dates'
import { activeById, listActive } from '@/modules/enrollments'
import { insertChargeIfAbsent, listCharges, type NewCharge } from './repository'
import { applyAdvancesAfterGeneration } from './payment-service'

export class ChargeValidationError extends Error {
  readonly key: string

  constructor(key: string) {
    super(key)
    this.name = 'ChargeValidationError'
    this.key = key
  }
}

export interface GenerationResult {
  created: number
  skipped: number
}

export function listGeneratedCharges(db: Db): Promise<Row[]> {
  return listCharges(db)
}

/** One admission charge and one monthly charge per active enrollment, both idempotent. */
export async function generateCharges(db: Db, month: string): Promise<GenerationResult> {
  if (!isMonth(month)) throw new ChargeValidationError('payments.invalidMonth')

  const enrollments = await listActive(db)
  const ctx = makeAuditContext()
  let created = 0
  let skipped = 0

  for (const enrollment of enrollments) {
    const admission: NewCharge = {
      enrollmentId: String(enrollment.id),
      studentId: String(enrollment.student_id),
      month: null,
      kind: 'admission',
      description: 'Admission fee',
      amountMinor: Number(enrollment.admission_fee_minor),
      discountMinor: 0,
    }
    const monthlyFee = Number(enrollment.monthly_fee_minor)
    const discount =
      enrollment.discount_kind === 'fixed'
        ? applyFixedDiscount(monthlyFee, Number(enrollment.discount_value))
        : enrollment.discount_kind === 'percent'
          ? applyPercentDiscount(monthlyFee, Number(enrollment.discount_value))
          : 0
    const monthly: NewCharge = {
      enrollmentId: String(enrollment.id),
      studentId: String(enrollment.student_id),
      month: month,
      kind: 'monthly',
      description: `Monthly fee ${month}`,
      amountMinor: monthlyFee,
      discountMinor: discount,
    }
    for (const charge of [admission, monthly]) {
      if (await insertChargeIfAbsent(db, ctx, charge)) created += 1
      else skipped += 1
    }
  }
  if (created > 0) await applyAdvancesAfterGeneration(db)
  return { created, skipped }
}

/** Per-enrollment variant for ad-hoc generation (e.g. a single late enrollment). */
export async function generateChargesForEnrollment(
  db: Db,
  enrollmentId: string,
  month: string,
): Promise<GenerationResult> {
  if (!isMonth(month)) throw new ChargeValidationError('payments.invalidMonth')
  const row = await activeById(db, enrollmentId)
  if (!row) throw new ChargeValidationError('payments.noEnrollment')

  const ctx = makeAuditContext()
  const discount =
    row.discount_kind === 'fixed'
      ? applyFixedDiscount(Number(row.monthly_fee_minor), Number(row.discount_value))
      : row.discount_kind === 'percent'
        ? applyPercentDiscount(Number(row.monthly_fee_minor), Number(row.discount_value))
        : 0
  const charges: NewCharge[] = [
    {
      enrollmentId: String(row.id),
      studentId: String(row.student_id),
      month: null,
      kind: 'admission',
      description: 'Admission fee',
      amountMinor: Number(row.admission_fee_minor),
      discountMinor: 0,
    },
    {
      enrollmentId: String(row.id),
      studentId: String(row.student_id),
      month: month,
      kind: 'monthly',
      description: `Monthly fee ${month}`,
      amountMinor: Number(row.monthly_fee_minor),
      discountMinor: discount,
    },
  ]
  let created = 0
  let skipped = 0
  for (const charge of charges) {
    if (await insertChargeIfAbsent(db, ctx, charge)) created += 1
    else skipped += 1
  }
  if (created > 0) await applyAdvancesAfterGeneration(db)
  return { created, skipped }
}
