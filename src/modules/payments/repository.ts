/**
 * Charges repository (T-050). Writes are idempotent by unique key, never by a "was generated"
 * flag: `INSERT ... ON CONFLICT DO NOTHING` plus the COALESCE unique index from the T-050
 * migration covers both dated monthly charges and undated admission charges. The row and its
 * audit entry commit in one transaction. SQL lives here, never in UI code.
 */
import { writeAudit, type AuditContext } from '@/core/audit/write'
import type { Db } from '@/core/db/types'
import type { Row } from '@/core/db/repository'

export interface NewCharge {
  enrollmentId: string
  studentId: string
  month: string | null
  kind: 'admission' | 'monthly' | 'other'
  description: string | null
  amountMinor: number
  discountMinor: number
}

/** Returns true when a row was inserted, false when the unique key already had it. */
export async function insertChargeIfAbsent(
  db: Db,
  ctx: AuditContext,
  charge: NewCharge,
): Promise<boolean> {
  return db.tx(async (t) => {
    const id = ctx.newId()
    const result = await t.run(
      'INSERT INTO charges (id, created_at, updated_at, deleted_at, version, ' +
        'enrollment_id, student_id, month, kind, description, amount_minor, discount_minor) ' +
        'VALUES (?, ?, ?, NULL, 1, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [
        id,
        ctx.now,
        ctx.now,
        charge.enrollmentId,
        charge.studentId,
        charge.month,
        charge.kind,
        charge.description,
        charge.amountMinor,
        charge.discountMinor,
      ],
    )
    if (result.changes === 0) return false
    const after: Row = {
      id,
      enrollment_id: charge.enrollmentId,
      student_id: charge.studentId,
      month: charge.month,
      kind: charge.kind,
      description: charge.description,
      amount_minor: charge.amountMinor,
      discount_minor: charge.discountMinor,
    }
    await writeAudit(t, ctx, {
      entity: 'charges',
      entityId: id,
      action: 'create',
      before: null,
      after,
    })
    return true
  })
}

export function listCharges(db: Db): Promise<Row[]> {
  return db.query<Row>(
    'SELECT * FROM charges WHERE deleted_at IS NULL ORDER BY student_id, month, kind',
  )
}
