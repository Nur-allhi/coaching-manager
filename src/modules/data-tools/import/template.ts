/** Import templates (PLAN §7.6): the field order the mapping UI defaults to. */
import { toCsv } from './csv'

export type ImportKind = 'students' | 'batches' | 'enrollments' | 'marks'

export const IMPORT_KINDS: readonly ImportKind[] = ['students', 'batches', 'enrollments', 'marks']

export const TEMPLATE_FIELDS: Record<ImportKind, readonly string[]> = {
  students: ['student_no', 'full_name', 'admitted_on', 'status', 'phone', 'guardian_name'],
  batches: [
    'name',
    'academic_year',
    'class',
    'days_mask',
    'start_time',
    'end_time',
    'room',
    'capacity',
    'monthly_fee_minor',
  ],
  enrollments: ['student_no', 'batch', 'enrolled_on', 'admission_fee_minor', 'monthly_fee_minor'],
  marks: ['exam', 'student_no', 'marks', 'absent'],
}

const EXAMPLE: Record<ImportKind, string[]> = {
  students: ['2026-0001', 'Rahim Ahmed', '2026-01-10', 'active', '01700000001', 'Karim Ahmed'],
  batches: ['A', '2026', 'Class 11', '2', '09:00', '10:00', 'Room 1', '30', '100000'],
  enrollments: ['2026-0001', 'A', '2026-01-10', '5000', '100000'],
  marks: ['Final 2026', '2026-0001', '85', '0'],
}

export function templateCsv(kind: ImportKind): string {
  return toCsv([TEMPLATE_FIELDS[kind], EXAMPLE[kind]])
}

export function templateFileName(kind: ImportKind): string {
  return `${kind}-import-template.csv`
}
