/** Unit tests for the attendance service (T-060, D-051). */
import { describe, expect, it } from 'vitest'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { makeAuditContext } from '@/core/audit/write'
import { insert } from '@/core/db/repository'
import * as repo from './repository'
import { cellsFor, ensureSession, openAndMarkAllPresent, setStatus, summaryFor } from './service'

const ctx = () => makeAuditContext('test')

async function seeded() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  const c = ctx()
  const yearId = await insert(db, c, 'academic_years', {
    id: 'ay-1',
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    version: 1,
    name: '2026',
    starts_on: '2026-01-01',
    ends_on: '2026-12-31',
    is_current: 1,
  })
  const classId = await insert(db, c, 'classes', {
    id: 'c-1',
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    version: 1,
    name: 'Class 10',
    sort_order: 1,
  })
  await insert(db, c, 'batches', {
    id: 'b-1',
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    version: 1,
    academic_year_id: yearId,
    class_id: classId,
    name: 'Morning',
    days_mask: 62,
    start_time: '09:00',
    end_time: '10:00',
    capacity: 30,
    monthly_fee_minor: 100000,
    status: 'active',
  })
  const roster: Array<[string, string, string]> = [
    ['s-1', 'Rahim', '2026-0001'],
    ['s-2', 'Karim', '2026-0002'],
    ['s-3', 'Asha', '2026-0003'],
  ]
  for (const [id, name, no] of roster) {
    await insert(db, c, 'students', {
      id,
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
      version: 1,
      student_no: no,
      full_name: name,
      admitted_on: '2026-01-01',
    })
    await insert(db, c, 'enrollments', {
      id: `e-${id}`,
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
      version: 1,
      student_id: id,
      batch_id: 'b-1',
      enrolled_on: '2026-01-01',
      monthly_fee_minor: 100000,
      discount_kind: 'none',
      discount_value: 0,
    })
  }
  return db
}

describe('attendance service', () => {
  it('is unique per batch and date — reopening reuses the session', async () => {
    const db = await seeded()
    const a = await ensureSession(db, 'b-1', '2026-02-01')
    const b = await ensureSession(db, 'b-1', '2026-02-01')
    expect(b).toBe(a)
    const count = await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM attendance_sessions')
    expect(count[0]?.n).toBe(1)
  })

  it('marks the whole roster present in one action', async () => {
    const db = await seeded()
    const { sessionId, summary } = await openAndMarkAllPresent(db, 'b-1', '2026-02-01')
    expect(summary).toEqual({ present: 3, absent: 0, total: 3, percentage: 100 })
    const statuses = await repo.statusesFor(db, sessionId)
    expect(statuses).toHaveLength(3)
    expect(statuses.every((s) => s.status === 'present')).toBe(true)
  })

  it('changes one to absent and reports the matching percentage', async () => {
    const db = await seeded()
    const { sessionId } = await openAndMarkAllPresent(db, 'b-1', '2026-02-01')
    await setStatus(db, sessionId, 's-3', 'absent')
    const summary = await summaryFor(db, sessionId)
    expect(summary).toEqual({ present: 2, absent: 1, total: 3, percentage: 67 })
  })

  it('defaults unmarked students to absent in the grid cells', async () => {
    const db = await seeded()
    const sessionId = await ensureSession(db, 'b-1', '2026-02-01')
    const cells = await cellsFor(db, sessionId, 'b-1')
    expect(cells).toHaveLength(3)
    expect(cells.every((c) => c.status === 'absent')).toBe(true)
    expect(cells[0]?.studentName).toBe('Rahim')
  })

  it('writes an audit row for a status change', async () => {
    const db = await seeded()
    const { sessionId } = await openAndMarkAllPresent(db, 'b-1', '2026-02-01')
    const before = await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM audit_log')
    await setStatus(db, sessionId, 's-1', 'absent')
    const after = await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM audit_log')
    expect(Number(after[0]?.n)).toBe(Number(before[0]?.n) + 1)
  })
})
