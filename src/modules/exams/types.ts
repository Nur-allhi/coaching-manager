/** Exam and marks-grid types (T-061). Marks are REAL numbers, never money. */
import type { Row } from '@/core/db/repository'

export interface ExamRow extends Row {
  id: string
  batch_id: string
  subject_id: string | null
  name: string
  held_on: string
  full_marks: number
  pass_marks: number
  version: number
}

export interface ResultRow {
  exam_id: string
  student_id: string
  marks: number | null
  absent: number
  remark: string | null
  updated_at: number
}

export interface ExamCell {
  studentId: string
  studentName: string
  studentNo: string
  marks: number | null
  absent: boolean
  remark: string
}

export interface ExamSummary {
  /** Mean of entered marks for non-absent students; null until one mark is entered. */
  average: number | null
  entered: number
  absent: number
  total: number
}
