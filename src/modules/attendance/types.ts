/** Attendance types (T-060). Status vocabulary shared by the grid, service and tests. */
export type AttendanceStatus = 'present' | 'absent'

export interface AttendanceSession {
  id: string
  batch_id: string
  held_on: string
  version: number
  created_at: number
  updated_at: number
  deleted_at: number | null
}

export interface AttendanceCell {
  studentId: string
  studentName: string
  studentNo: string
  status: AttendanceStatus
}

export interface AttendanceSummary {
  present: number
  absent: number
  total: number
  /** Percentage present, 0 for an empty roster. Absent counts as 0, per TAD §5.7. */
  percentage: number
}
