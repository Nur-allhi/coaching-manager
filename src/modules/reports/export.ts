/**
 * Report exports (T-071, D-057 C1). The exact same filtered rows feed the preview and both exports.
 * CSV carries a UTF-8 BOM so Excel opens Bangla correctly; ExcelJS is loaded lazily (PLAN §3 lock).
 */
import type { ReportColumn, ReportRow } from './types'

const BOM = '\uFEFF'

function cell(value: string | number | null): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function label(labels: Record<string, string>, key: string): string {
  return labels[key] ?? key
}

/** CSV text with a BOM — header plus exactly the rows passed in, in column order. */
export function reportCsv(
  rows: ReportRow[],
  columns: ReportColumn[],
  labels: Record<string, string>,
): string {
  const header = columns.map((column) => cell(label(labels, column.labelKey))).join(',')
  const body = rows.map((row) => columns.map((column) => cell(row[column.key] ?? null)).join(','))
  return BOM + [header, ...body].join('\r\n')
}

/** Rows keyed by column key, in the same order as the preview (used by ExcelJS and tests). */
export function keyedRows(
  rows: ReportRow[],
  columns: ReportColumn[],
): Array<Record<string, string>> {
  return rows.map((row) =>
    Object.fromEntries(columns.map((column) => [column.key, String(row[column.key] ?? '')])),
  )
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportReportExcel(
  rows: ReportRow[],
  columns: ReportColumn[],
  labels: Record<string, string>,
  filename: string,
): Promise<void> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Report')
  sheet.columns = columns.map((column) => ({
    header: label(labels, column.labelKey),
    key: column.key,
    width: 20,
  }))
  for (const row of keyedRows(rows, columns)) sheet.addRow(row)
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
