/**
 * Academics module form schemas and row shapes (T-041, D-042).
 *
 * Form values stay as strings/booleans so React Hook Form's resolver input and output types
 * match exactly. Conversion to database types (integer paisa, bit mask, nullable capacity)
 * happens once, in `toXPatch` below, and is reused by both the real write and the optimistic
 * preview.
 */
import { z } from 'zod'
import type { Row } from '@/core/db/repository'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM')

export const yearForm = z.object({
  name: z.string().trim().min(1),
  startsOn: date,
  endsOn: date,
  isCurrent: z.boolean(),
})
export type YearForm = z.infer<typeof yearForm>

export const classForm = z.object({
  name: z.string().trim().min(1),
  sortOrder: z.string().regex(/^\d+$/),
})
export type ClassForm = z.infer<typeof classForm>

export const subjectForm = z.object({
  name: z.string().trim().min(1),
  code: z.string(),
})
export type SubjectForm = z.infer<typeof subjectForm>

export const batchForm = z.object({
  academicYearId: z.string().min(1),
  classId: z.string().min(1),
  name: z.string().trim().min(1),
  days: z.array(z.boolean()).length(7),
  startTime: time,
  endTime: time,
  room: z.string(),
  capacity: z.string().regex(/^\d*$/),
  monthlyFee: z.string().regex(/^\d+(\.\d{1,2})?$/),
})
export type BatchForm = z.infer<typeof batchForm>

export type Kind = 'years' | 'classes' | 'subjects' | 'batches'

export interface AcademicYearRow extends Row {
  name: string
  starts_on: string
  ends_on: string
  is_current: number
}
export interface ClassRow extends Row {
  name: string
  sort_order: number
}
export interface SubjectRow extends Row {
  name: string
  code: string | null
}
export interface BatchRow extends Row {
  academic_year_id: string
  class_id: string
  name: string
  days_mask: number
  start_time: string
  end_time: string
  room: string | null
  capacity: number | null
  monthly_fee_minor: number
  status: string
}

export function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** The days checkboxes map bit 0 = Sunday through bit 6 = Saturday (TAD §5.4). */
export function daysToMask(days: readonly boolean[]): number {
  return days.reduce((mask, on, index) => (on ? mask | (1 << index) : mask), 0)
}

export function maskToDays(mask: number): boolean[] {
  return Array.from({ length: 7 }, (_, index) => (mask & (1 << index)) !== 0)
}

export function toYearPatch(values: YearForm): Row {
  return {
    name: values.name,
    starts_on: values.startsOn,
    ends_on: values.endsOn,
    is_current: values.isCurrent ? 1 : 0,
  }
}

export function toClassPatch(values: ClassForm): Row {
  return { name: values.name, sort_order: Number(values.sortOrder) }
}

export function toSubjectPatch(values: SubjectForm): Row {
  return { name: values.name, code: optionalText(values.code) }
}
