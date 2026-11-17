/**
 * Admin report Excel export (T-073, D-059). Lazy ExcelJS (PLAN §3 lock) writes every section as a
 * row so the workbook contains the same figures as the printed report. Bangla stays UTF-8 text.
 */
import { formatMinor } from '@/core/money/money'
import type { AdminReportData } from './queries/admin'

export interface AdminExportRow {
  section: string
  detail: string
  value: string
}

export interface AdminLabels {
  range: string
  from: string
  to: string
  admissions: string
  total: string
  className: string
  batchName: string
  dropouts: string
  collected: string
  dues: string
  methodSplit: string
  attendanceRate: string
  topPerformers: string
  net: string
  section: string
  detail: string
  value: string
}

/** Flat rows for the admin report; exported for content-level tests. */
export function adminExportRows(data: AdminReportData, labels: AdminLabels): AdminExportRow[] {
  const rows: AdminExportRow[] = []
  const add = (section: string, detail: string, value: string | number) =>
    rows.push({ section, detail, value: String(value) })

  add(labels.range, labels.from, data.from)
  add(labels.range, labels.to, data.to)
  add(labels.admissions, labels.total, data.admissions)
  for (const row of data.admissionsByClass)
    add(labels.admissions, labels.className, `${row.name}: ${row.count}`)
  for (const row of data.admissionsByBatch)
    add(labels.admissions, labels.batchName, `${row.name}: ${row.count}`)
  add(labels.dropouts, labels.total, data.dropouts)
  add(labels.collected, labels.total, formatMinor(data.collectedMinor))
  add(labels.dues, labels.total, formatMinor(data.dueMinor))
  for (const row of data.methodSplit)
    add(labels.methodSplit, row.method, formatMinor(row.amountMinor))
  add(
    labels.attendanceRate,
    labels.total,
    data.attendanceRate === null ? '—' : `${data.attendanceRate}%`,
  )
  for (const row of data.topPerformers) add(labels.topPerformers, row.name, row.marks)
  add(labels.net, labels.total, formatMinor(data.netMinor))
  return rows
}

export async function exportAdminExcel(
  data: AdminReportData,
  labels: AdminLabels,
  filename: string,
): Promise<void> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Admin report')
  sheet.columns = [
    { header: labels.section, key: 'section', width: 24 },
    { header: labels.detail, key: 'detail', width: 24 },
    { header: labels.value, key: 'value', width: 18 },
  ]
  for (const row of adminExportRows(data, labels)) sheet.addRow(row)
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
