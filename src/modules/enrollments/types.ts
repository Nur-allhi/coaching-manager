/** Enrollment form schema and row shape (T-043). */
import { z } from 'zod'
import type { Row } from '@/core/db/repository'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
const paisa = z.string().regex(/^\d+$/, 'Use whole paisa')

export const discountKinds = ['none', 'fixed', 'percent'] as const
export type DiscountKind = (typeof discountKinds)[number]

export const enrollmentForm = z
  .object({
    studentId: z.string().min(1),
    batchId: z.string().min(1),
    enrolledOn: date,
    leftOn: z.string().refine((value) => value === '' || date.safeParse(value).success),
    admissionFee: paisa,
    monthlyFee: paisa,
    discountKind: z.enum(discountKinds),
    discountValue: z.string().regex(/^\d*$/, 'Use a whole number'),
  })
  .superRefine((values, ctx) => {
    const value = Number(values.discountValue || '0')
    if (values.discountKind === 'percent' && (value < 1 || value > 100)) {
      ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Percent must be 1 to 100' })
    }
    if (values.discountKind === 'fixed' && value > Number(values.monthlyFee)) {
      ctx.addIssue({
        code: 'custom',
        path: ['discountValue'],
        message: 'Fixed discount exceeds the fee',
      })
    }
    if (values.leftOn && values.leftOn < values.enrolledOn) {
      ctx.addIssue({ code: 'custom', path: ['leftOn'], message: 'Leave date before enrollment' })
    }
  })
export type EnrollmentForm = z.infer<typeof enrollmentForm>

export interface EnrollmentRow extends Row {
  student_id: string
  batch_id: string
  enrolled_on: string
  left_on: string | null
  admission_fee_minor: number
  monthly_fee_minor: number
  discount_kind: DiscountKind
  discount_value: number
  status: 'active' | 'closed'
}

export function toEnrollmentPatch(values: EnrollmentForm): Row {
  const kind = values.discountKind
  return {
    student_id: values.studentId,
    batch_id: values.batchId,
    enrolled_on: values.enrolledOn,
    left_on: values.leftOn === '' ? null : values.leftOn,
    admission_fee_minor: Number(values.admissionFee),
    monthly_fee_minor: Number(values.monthlyFee),
    discount_kind: kind,
    // A fixed discount is paisa, a percent discount is a whole number — both stored as integers.
    discount_value: kind === 'none' ? 0 : Number(values.discountValue || '0'),
  }
}

export function formFromRow(row: EnrollmentRow): EnrollmentForm {
  return {
    studentId: String(row.student_id),
    batchId: String(row.batch_id),
    enrolledOn: String(row.enrolled_on),
    leftOn: row.left_on === null ? '' : String(row.left_on),
    admissionFee: String(row.admission_fee_minor),
    monthlyFee: String(row.monthly_fee_minor),
    discountKind: (row.discount_kind ?? 'none') as DiscountKind,
    discountValue: String(row.discount_value ?? 0),
  }
}
