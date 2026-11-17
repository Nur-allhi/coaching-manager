/**
 * Excel export of receipts (T-054, D-050 C1). ExcelJS is the PLAN §3 locked choice and is imported
 * lazily so the heavy workbook code stays out of the initial bundle. Strings are written as UTF-8,
 * so Bangla opens correctly in Excel; amounts are integer paisa divided for display only.
 */
import type { ReceiptExportRow } from './receipt'

export async function exportReceiptsExcel(rows: ReceiptExportRow[]): Promise<void> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Receipts')
  sheet.columns = [
    { header: 'Receipt', key: 'receiptNo', width: 18 },
    { header: 'Date', key: 'paidOn', width: 14 },
    { header: 'Student', key: 'studentName', width: 24 },
    { header: 'Student no', key: 'studentNo', width: 16 },
    { header: 'Amount (taka)', key: 'amount', width: 16 },
    { header: 'Method', key: 'method', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Revision', key: 'revision', width: 10 },
  ]
  for (const row of rows) {
    sheet.addRow({
      receiptNo: row.receiptNo,
      paidOn: row.paidOn,
      studentName: row.studentName,
      studentNo: row.studentNo,
      amount: row.amountMinor / 100,
      method: row.method,
      status: row.status,
      revision: row.revision,
    })
  }
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'receipts.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}
