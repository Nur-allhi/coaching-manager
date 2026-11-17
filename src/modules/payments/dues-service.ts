/**
 * Defaulters report and the student Payments tab data (T-053, D-049). Totals come from the one
 * aggregation in the repository; names arrive through the owning modules' public surfaces, so
 * payments reads no foreign table (TAD.md §2).
 */
import { listBatches, listClasses } from '@/modules/academics'
import { listActive } from '@/modules/enrollments'
import { listStudents } from '@/modules/students'
import type { Db } from '@/core/db/types'
import type { Row } from '@/core/db/repository'
import { duesForStudent, type DueSummary } from './payment-service'
import * as repo from './payments-repository'

export interface DuesRow {
  studentId: string
  studentNo: string
  studentName: string
  batchName: string
  className: string
  dueMinor: number
}

export async function duesReport(db: Db): Promise<DuesRow[]> {
  const [totals, students, batches, classes, enrollments] = await Promise.all([
    repo.duesByStudent(db),
    listStudents(db),
    listBatches(db),
    listClasses(db),
    listActive(db),
  ])
  const studentById = new Map(students.map((row) => [String(row.id), row]))
  const batchById = new Map(batches.map((row) => [String(row.id), row]))
  const classById = new Map(classes.map((row) => [String(row.id), row]))
  const batchByStudent = new Map(
    enrollments.map((row) => [String(row.student_id), String(row.batch_id)]),
  )
  return totals.flatMap((total) => {
    const studentId = String(total.student_id)
    const student = studentById.get(studentId)
    if (!student) return []
    const batch = batchById.get(batchByStudent.get(studentId) ?? '')
    return [
      {
        studentId,
        studentNo: String(student.student_no),
        studentName: String(student.full_name),
        batchName: batch ? String(batch.name) : '',
        className: batch ? String(classById.get(String(batch.class_id))?.name ?? '') : '',
        dueMinor: Number(total.total_due_minor),
      },
    ]
  })
}

export interface StudentPaymentHistory {
  payments: Row[]
  dues: DueSummary
}

/** Payment history plus outstanding dues for the student profile's Payments tab. */
export async function studentPaymentHistory(
  db: Db,
  studentId: string,
): Promise<StudentPaymentHistory> {
  const [payments, dues] = await Promise.all([
    repo.listPaymentsForStudent(db, studentId),
    duesForStudent(db, studentId),
  ])
  return { payments, dues }
}
