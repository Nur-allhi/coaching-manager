/**
 * Receipt data for the A5 print route and the Excel export (T-054, D-050 A1/E1). Payments-owned
 * rows come from its repository; student, batch and enrollment names arrive through public module
 * surfaces (TAD.md §2). All user-supplied values are rendered by React, never as HTML.
 */
import { listBatches } from '@/modules/academics'
import { listActive } from '@/modules/enrollments'
import { getSetting } from '@/modules/settings'
import { getStudent, listStudents } from '@/modules/students'
import type { Db } from '@/core/db/types'
import { duesForStudent } from './payment-service'
import { allocationMonths, listPayments, paymentById } from './payments-repository'

export interface ReceiptPrintData {
  id: string
  receiptNo: string
  paidOn: string
  centreName: string
  logoDataUri: string
  studentName: string
  studentNo: string
  batchName: string
  months: (string | null)[]
  amountMinor: number
  method: string
  balanceDueMinor: number
  status: string
  revision: number
}

export async function receiptForPrint(db: Db, paymentId: string): Promise<ReceiptPrintData | null> {
  const payment = await paymentById(db, paymentId)
  if (!payment) return null
  const studentId = String(payment.student_id)
  const [centre, student, batches, enrollments, allocations, dues] = await Promise.all([
    getSetting(db, 'centre'),
    getStudent(db, studentId),
    listBatches(db),
    listActive(db),
    allocationMonths(db, paymentId),
    duesForStudent(db, studentId),
  ])
  const batchId = enrollments.find((row) => String(row.student_id) === studentId)?.batch_id
  const batch = batches.find((row) => String(row.id) === String(batchId))
  const months = [
    ...new Set(allocations.map((row) => (row.month === null ? null : String(row.month)))),
  ]
  return {
    id: String(payment.id),
    centreName: centre.name,
    logoDataUri: centre.logoDataUri,
    receiptNo: String(payment.receipt_no),
    paidOn: String(payment.paid_on),
    studentName: student ? String(student.full_name) : '',
    studentNo: student ? String(student.student_no) : '',
    batchName: batch ? String(batch.name) : '',
    months,
    amountMinor: Number(payment.amount_minor),
    method: String(payment.method),
    balanceDueMinor: dues.totalDueMinor,
    status: String(payment.status),
    revision: Number(payment.revision ?? 0),
  }
}

export interface ReceiptExportRow {
  receiptNo: string
  paidOn: string
  studentName: string
  studentNo: string
  amountMinor: number
  method: string
  status: string
  revision: number
}

/** All receipts as flat rows for Excel; Bangla stays as UTF-8 text in the workbook. */
export async function receiptsForExport(db: Db): Promise<ReceiptExportRow[]> {
  const [payments, students] = await Promise.all([listPayments(db), listStudents(db)])
  const nameById = new Map(students.map((row) => [String(row.id), String(row.full_name)]))
  const noById = new Map(students.map((row) => [String(row.id), String(row.student_no)]))
  return payments.map((row) => ({
    receiptNo: String(row.receipt_no),
    paidOn: String(row.paid_on),
    studentName: nameById.get(String(row.student_id)) ?? '',
    studentNo: noById.get(String(row.student_id)) ?? '',
    amountMinor: Number(row.amount_minor),
    method: String(row.method),
    status: String(row.status),
    revision: Number(row.revision ?? 0),
  }))
}
