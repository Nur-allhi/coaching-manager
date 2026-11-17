/** Dashboard types (T-070, D-056). Read model only — no writes. */

export interface Topper {
  name: string
  marks: number
}

export interface LowAttendanceRow {
  studentId: string
  studentName: string
  /** Fraction of marked sessions present, below the threshold. */
  rate: number
}

export interface DashboardExtras {
  todaysBatches: number
  lowAttendance: LowAttendanceRow[]
  recentToppers: Topper[]
}

export interface DashboardData {
  collectedMinor: number
  dueMinor: number
  admissionsThisMonth: number
  activeStudents: number
  todaysBatches: number
  lowAttendance: number
  recentToppers: Topper[]
  backupStale: boolean
}
