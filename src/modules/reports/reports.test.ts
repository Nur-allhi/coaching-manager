/** Unit tests for the reports framework (T-071, D-057). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { insert } from '@/core/db/repository'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { keyedRows, reportCsv } from './export'
import { studentListRows } from './queries/students'
import type { ReportColumn, ReportFilter } from './types'

const columns: ReportColumn[] = [
  { key: 'studentNo', labelKey: 'reports.studentNo' },
  { key: 'studentName', labelKey: 'reports.studentName' },
]
const labels = { 'reports.studentNo': 'Student no', 'reports.studentName': 'Student' }
const all: ReportFilter = { from: '2000-01-01', to: '2100-12-31', batchId: '', classId: '' }

describe('report exports', () => {
  it('writes a UTF-8 BOM, the labels and exactly the preview rows', () => {
    const rows = [
      { studentNo: '2026-0001', studentName: 'Rahim' },
      { studentNo: '2026-0002', studentName: 'অ্যাশা' },
    ]
    const csv = reportCsv(rows, columns, labels)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"Student no","Student"')
    expect(csv).toContain('"2026-0001","Rahim"')
    expect(csv).toContain('"2026-0002","অ্যাশা"')
    expect(csv.trim().split('\r\n')).toHaveLength(3)
    expect(keyedRows(rows, columns)).toEqual([
      { studentNo: '2026-0001', studentName: 'Rahim' },
      { studentNo: '2026-0002', studentName: 'অ্যাশা' },
    ])
  })
})

describe('student list report', () => {
  async function seeded() {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })
    const c = makeAuditContext('reports-test')
    const base = { created_at: 1, updated_at: 1, deleted_at: null, version: 1 }
    await insert(db, c, 'academic_years', {
      ...base,
      id: 'ay-1',
      name: '2026',
      starts_on: '2026-01-01',
      ends_on: '2026-12-31',
      is_current: 1,
    })
    for (const [id, name] of [
      ['c-1', 'Class 10'],
      ['c-2', 'Class 9'],
    ] as const) {
      await insert(db, c, 'classes', { ...base, id, name, sort_order: 1 })
    }
    for (const [id, classId] of [
      ['b-1', 'c-1'],
      ['b-2', 'c-2'],
    ] as const) {
      await insert(db, c, 'batches', {
        ...base,
        id,
        academic_year_id: 'ay-1',
        class_id: classId,
        name: id,
        days_mask: 62,
        start_time: '09:00',
        end_time: '10:00',
        capacity: 30,
        monthly_fee_minor: 100000,
        status: 'active',
      })
    }
    for (const [id, name, admittedOn, batchId] of [
      ['s-1', 'Rahim', '2026-03-01', 'b-1'],
      ['s-2', 'Karim', '2026-04-01', 'b-2'],
      ['s-3', 'Asha', '2026-03-15', 'b-1'],
    ] as const) {
      await insert(db, c, 'students', {
        ...base,
        id,
        student_no: `2026-${id}`,
        full_name: name,
        admitted_on: admittedOn,
      })
      await insert(db, c, 'enrollments', {
        ...base,
        id: `e-${id}`,
        student_id: id,
        batch_id: batchId,
        enrolled_on: admittedOn,
        monthly_fee_minor: 100000,
        discount_kind: 'none',
        discount_value: 0,
      })
    }
    return db
  }

  it('returns all rows for the full range, in order', async () => {
    const rows = await studentListRows(await seeded(), all)
    expect(rows.map((row) => row.studentName)).toEqual(['Rahim', 'Asha', 'Karim'])
  })

  it('applies the date range, batch and class filters', async () => {
    const db = await seeded()
    const march = await studentListRows(db, { ...all, from: '2026-03-01', to: '2026-03-31' })
    expect(march.map((row) => row.studentName)).toEqual(['Rahim', 'Asha'])

    const byBatch = await studentListRows(db, { ...all, batchId: 'b-2' })
    expect(byBatch.map((row) => row.studentName)).toEqual(['Karim'])

    const byClass = await studentListRows(db, { ...all, classId: 'c-1' })
    expect(byClass.map((row) => row.studentName)).toEqual(['Rahim', 'Asha'])
  })
})
