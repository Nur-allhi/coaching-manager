/**
 * Report catalogue (T-071 framework, T-072 D-058 A1). The admin report is T-073's dedicated ticket.
 * Every definition supplies its columns, loader and an optional total over the same rows the preview
 * and exports use, so a report's displayed total always matches its rows.
 */
import { formatMinor } from '@/core/money/money'
import {
  admissionsRows,
  attendanceRows,
  duesRows,
  paymentsRegisterRows,
  receiptsRows,
  resultSheetRows,
} from './queries/catalogue'
import { studentListRows } from './queries/students'
import type { ReportDefinition, ReportRow } from './types'

function sum(rows: ReportRow[], key: string): number {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0)
}

function mean(values: number[]): number | null {
  return values.length === 0
    ? null
    : Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

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
    total: (rows) => String(rows.length),
  },
  {
    id: 'admissions',
    titleKey: 'reports.admissions',
    columns: [
      { key: 'studentNo', labelKey: 'reports.studentNo' },
      { key: 'studentName', labelKey: 'reports.studentName' },
      { key: 'admittedOn', labelKey: 'reports.admittedOn' },
      { key: 'batchName', labelKey: 'reports.batchName' },
    ],
    load: admissionsRows,
    total: (rows) => String(rows.length),
  },
  {
    id: 'payments',
    titleKey: 'reports.paymentsRegister',
    columns: [
      { key: 'receiptNo', labelKey: 'reports.receiptNo' },
      { key: 'paidOn', labelKey: 'reports.heldOn' },
      { key: 'studentName', labelKey: 'reports.studentName' },
      { key: 'method', labelKey: 'reports.method' },
      { key: 'amountTaka', labelKey: 'reports.amount' },
    ],
    load: paymentsRegisterRows,
    total: (rows) => formatMinor(sum(rows, 'amountMinor')),
  },
  {
    id: 'dues',
    titleKey: 'reports.dues',
    columns: [
      { key: 'studentNo', labelKey: 'reports.studentNo' },
      { key: 'studentName', labelKey: 'reports.studentName' },
      { key: 'batchName', labelKey: 'reports.batchName' },
      { key: 'className', labelKey: 'reports.className' },
      { key: 'dueTaka', labelKey: 'reports.dueTaka' },
    ],
    load: duesRows,
    total: (rows) => formatMinor(sum(rows, 'dueMinor')),
  },
  {
    id: 'receipts',
    titleKey: 'reports.receipts',
    columns: [
      { key: 'receiptNo', labelKey: 'reports.receiptNo' },
      { key: 'paidOn', labelKey: 'reports.heldOn' },
      { key: 'studentName', labelKey: 'reports.studentName' },
      { key: 'amountTaka', labelKey: 'reports.amount' },
      { key: 'method', labelKey: 'reports.method' },
      { key: 'status', labelKey: 'reports.status' },
      { key: 'revision', labelKey: 'reports.revision' },
    ],
    load: receiptsRows,
    total: (rows) => formatMinor(sum(rows, 'amountMinor')),
  },
  {
    id: 'attendance',
    titleKey: 'reports.attendance',
    columns: [
      { key: 'studentNo', labelKey: 'reports.studentNo' },
      { key: 'studentName', labelKey: 'reports.studentName' },
      { key: 'present', labelKey: 'reports.present' },
      { key: 'marked', labelKey: 'reports.marked' },
      { key: 'rate', labelKey: 'reports.rate' },
    ],
    load: attendanceRows,
    total: (rows) => {
      const value = mean(rows.map((row) => Number(row.rate ?? 0)))
      return value === null ? null : `${value}%`
    },
  },
  {
    id: 'results',
    titleKey: 'reports.resultSheets',
    columns: [
      { key: 'examName', labelKey: 'reports.exam' },
      { key: 'heldOn', labelKey: 'reports.heldOn' },
      { key: 'studentName', labelKey: 'reports.studentName' },
      { key: 'marks', labelKey: 'reports.marks' },
      { key: 'status', labelKey: 'reports.status' },
    ],
    load: resultSheetRows,
    total: (rows) => {
      const value = mean(rows.filter((row) => row.marks !== null).map((row) => Number(row.marks)))
      return value === null ? null : String(value)
    },
  },
]

export function getReport(id: string): ReportDefinition | undefined {
  return reports.find((report) => report.id === id)
}
