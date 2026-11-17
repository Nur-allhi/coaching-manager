/**
 * Report catalogue (T-071, D-057 A1). T-071 ships the framework and one worked report; T-072 adds
 * the rest by appending definitions here. Every definition supplies its own columns and loader.
 */
import { studentListRows } from './queries/students'
import type { ReportDefinition } from './types'

export const reports: ReportDefinition[] = [
  {
    id: 'students',
    titleKey: 'reports.studentList',
    columns: [
      { key: 'studentNo', labelKey: 'reports.studentNo' },
      { key: 'studentName', labelKey: 'reports.studentName' },
      { key: 'admittedOn', labelKey: 'reports.admittedOn' },
      { key: 'batchName', labelKey: 'reports.batchName' },
    ],
    load: studentListRows,
  },
]

export function getReport(id: string): ReportDefinition | undefined {
  return reports.find((report) => report.id === id)
}
