/** Leaderboard types (T-063, D-055). Read model only — no writes. */

export type RankScope = 'exam' | 'month' | 'year'
export type RankFilter =
  { kind: 'all' } | { kind: 'batch'; id: string } | { kind: 'class'; id: string }

export interface RankQuery {
  scope: RankScope
  /** Required for the `exam` scope. */
  examId?: string
  /** `YYYY-MM`, required for the `month` scope. */
  month?: string
  /** Required for the `year` scope. */
  academicYearId?: string
  filter: RankFilter
}

export interface RankRow {
  rank: number
  studentId: string
  studentName: string
  studentNo: string
  batchName: string
  /** Absent and unmarked contribute 0 (TAD §5.7). */
  totalMarks: number
  /** Mean of marked, non-absent results; null when none are graded. */
  average: number | null
  absentCount: number
  examCount: number
}
