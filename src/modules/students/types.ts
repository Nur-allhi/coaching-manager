/**
 * Students module form schemas and row shapes (T-042, D-043).
 * Form values stay strings/booleans so the RHF resolver's input and output types match;
 * conversion to stored types happens once in the service.
 */
import { z } from 'zod'
import type { Row } from '@/core/db/repository'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
const phone = z.string().regex(/^[0-9+\s-]*$/, 'Use digits only')

export const studentForm = z.object({
  fullName: z.string().trim().min(1),
  gender: z.string(),
  dob: z.string().refine((value) => value === '' || date.safeParse(value).success),
  phone: phone,
  guardianName: z.string(),
  guardianPhone: phone,
  address: z.string(),
  schoolName: z.string(),
  admittedOn: date,
  status: z.enum(['active', 'dropped', 'passed_out']),
  notes: z.string(),
})
export type StudentForm = z.infer<typeof studentForm>

/** A bounded photo accepted at the service boundary, not only by the browser form (SECURITY §8.1). */
export const photoSchema = z
  .instanceof(Uint8Array)
  .refine((bytes) => bytes.length > 0 && bytes.length <= 64 * 1024, 'Photo must be at most 64 KB')

export type StudentStatus = StudentForm['status']

/** Map the stored status to its i18n key (`passed_out` is the DB value). */
export function statusKey(status: StudentStatus): string {
  return status === 'passed_out' ? 'passedOut' : status
}

export interface StudentRow extends Row {
  student_no: string
  full_name: string
  gender: string | null
  dob: string | null
  phone: string | null
  guardian_name: string | null
  guardian_phone: string | null
  address: string | null
  school_name: string | null
  admitted_on: string
  status: StudentStatus
  notes: string | null
  photo: Uint8Array | null
}

export type StudentFilter = {
  status?: StudentStatus
  query?: string
  includeDeleted?: boolean
}

/** The six profile tabs; only Overview and History have data until their modules land. */
export const PROFILE_TABS = [
  'overview',
  'enrollments',
  'payments',
  'attendance',
  'marks',
  'history',
] as const
export type ProfileTab = (typeof PROFILE_TABS)[number]

export function toStudentPatch(values: StudentForm): Row {
  const optional = (value: string): string | null => {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  return {
    full_name: values.fullName,
    gender: optional(values.gender),
    dob: optional(values.dob),
    phone: optional(values.phone),
    guardian_name: optional(values.guardianName),
    guardian_phone: optional(values.guardianPhone),
    address: optional(values.address),
    school_name: optional(values.schoolName),
    admitted_on: values.admittedOn,
    status: values.status,
    notes: optional(values.notes),
  }
}

export function formFromRow(row: StudentRow): StudentForm {
  const text = (value: unknown): string =>
    value === null || value === undefined ? '' : String(value)
  return {
    fullName: text(row.full_name),
    gender: text(row.gender),
    dob: text(row.dob),
    phone: text(row.phone),
    guardianName: text(row.guardian_name),
    guardianPhone: text(row.guardian_phone),
    address: text(row.address),
    schoolName: text(row.school_name),
    admittedOn: text(row.admitted_on),
    status: (row.status ?? 'active') as StudentStatus,
    notes: text(row.notes),
  }
}
