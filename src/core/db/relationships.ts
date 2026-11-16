/**
 * Parent → child relationships, derived from the FOREIGN KEY clauses in the migrations.
 *
 * A parent must not be deleted while a live child still points at it (TAD §5.3 rule 5). SQLite
 * would reject the row deletion itself, but these are soft deletes — the row stays — so the
 * database cannot enforce this for us. The map lives here rather than in a module because
 * `repository.softDelete` is generic and must know every relationship.
 */
import type { TableName } from './repository'

export interface ChildRef {
  table: TableName
  column: string
  /** A phrase an admin can read in the refusal message. */
  label: string
  /** Whether the child table has a `deleted_at` column. */
  softDeletable: boolean
}

export const CHILDREN: Partial<Record<TableName, readonly ChildRef[]>> = {
  academic_years: [
    { table: 'batches', column: 'academic_year_id', label: 'batches', softDeletable: true },
  ],
  classes: [{ table: 'batches', column: 'class_id', label: 'batches', softDeletable: true }],
  subjects: [{ table: 'exams', column: 'subject_id', label: 'exams', softDeletable: true }],
  batches: [
    { table: 'enrollments', column: 'batch_id', label: 'enrollments', softDeletable: true },
    {
      table: 'attendance_sessions',
      column: 'batch_id',
      label: 'attendance sessions',
      softDeletable: true,
    },
    { table: 'exams', column: 'batch_id', label: 'exams', softDeletable: true },
  ],
  students: [
    { table: 'enrollments', column: 'student_id', label: 'enrollments', softDeletable: true },
    { table: 'charges', column: 'student_id', label: 'charges', softDeletable: true },
    { table: 'payments', column: 'student_id', label: 'payments', softDeletable: true },
    {
      table: 'attendance_records',
      column: 'student_id',
      label: 'attendance records',
      softDeletable: false,
    },
    { table: 'exam_results', column: 'student_id', label: 'exam results', softDeletable: false },
  ],
  enrollments: [
    { table: 'charges', column: 'enrollment_id', label: 'charges', softDeletable: true },
  ],
  charges: [
    {
      table: 'payment_allocations',
      column: 'charge_id',
      label: 'payment allocations',
      softDeletable: false,
    },
  ],
  payments: [
    {
      table: 'payment_allocations',
      column: 'payment_id',
      label: 'payment allocations',
      softDeletable: false,
    },
  ],
  exams: [
    { table: 'exam_results', column: 'exam_id', label: 'exam results', softDeletable: false },
  ],
  attendance_sessions: [
    {
      table: 'attendance_records',
      column: 'session_id',
      label: 'attendance records',
      softDeletable: false,
    },
  ],
}
