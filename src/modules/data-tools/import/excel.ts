/** One table shape for both import formats. ExcelJS stays lazy so it never enters the initial bundle. */
import { parseCsv } from './csv'

export interface ImportTable {
  headers: string[]
  rows: string[][]
}

export class ImportFormatError extends Error {
  override readonly name = 'ImportFormatError'
  constructor() {
    super('Only .csv and .xlsx files can be imported')
  }
}

export async function readImportTable(name: string, bytes: Uint8Array): Promise<ImportTable> {
  if (/\.csv$/i.test(name)) {
    const [headers = [], ...rows] = parseCsv(new TextDecoder().decode(bytes))
    return { headers, rows }
  }
  if (/\.xlsx$/i.test(name)) {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(bytes.buffer as ArrayBuffer)
    const sheet = workbook.worksheets[0]
    if (!sheet) return { headers: [], rows: [] }
    const matrix: string[][] = []
    sheet.eachRow((row) => {
      matrix.push(
        Array.from({ length: row.cellCount }, (_, index) => {
          const value = row.getCell(index + 1).value
          return value === null || value === undefined ? '' : String(value)
        }),
      )
    })
    const [headers = [], ...rows] = matrix
    return { headers, rows }
  }
  throw new ImportFormatError()
}
