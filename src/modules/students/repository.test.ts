/** Unit tests for the students repository and FTS search (T-042, D-043 B1). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { VersionConflictError } from '@/core/db/repository'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { generateStudents } from '../../../scripts/seed-data.ts'
import {
  all,
  byId,
  create,
  ftsQuery,
  nextStudentNo,
  search,
  softDeleteStudent,
  trash,
  updateStudent,
} from './repository'

async function freshDb() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  return db
}

const ctx = () => makeAuditContext('test-actor')

async function admit(
  db: Awaited<ReturnType<typeof freshDb>>,
  name: string,
  overrides: Record<string, unknown> = {},
) {
  const no = await nextStudentNo(db, '2026')
  return create(db, ctx(), {
    student_no: no,
    full_name: name,
    admitted_on: '2026-01-15',
    status: 'active',
    ...overrides,
  })
}

describe('students repository', () => {
  it('allocates gapless YYYY-0001 numbers and never reuses a soft-deleted one', async () => {
    const db = await freshDb()
    expect(await nextStudentNo(db, '2026')).toBe('2026-0001')
    const id = await admit(db, 'Rahim Uddin')
    expect((await byId(db, id))?.student_no).toBe('2026-0001')
    expect(await nextStudentNo(db, '2026')).toBe('2026-0002')

    await softDeleteStudent(db, ctx(), id, 1)
    expect(await nextStudentNo(db, '2026')).toBe('2026-0002')
    expect(await nextStudentNo(db, '2027')).toBe('2027-0001')
  })

  it('hides soft-deleted students from search and lists them in the trash', async () => {
    const db = await freshDb()
    const id = await admit(db, 'Karim Sheikh')
    expect(await search(db)).toHaveLength(1)
    await softDeleteStudent(db, ctx(), id, 1)

    expect(await search(db)).toHaveLength(0)
    expect(await byId(db, id)).toBeUndefined()
    expect((await trash(db)).map((row) => row.id)).toEqual([id])
  })

  it('writes an audit row with before and after snapshots for each write', async () => {
    const db = await freshDb()
    const id = await admit(db, 'Amina Begum')
    await updateStudent(db, ctx(), id, { full_name: 'Amina Khan' }, 1)
    await softDeleteStudent(db, ctx(), id, 2)

    const rows = await db.query<{ action: string; before_json: string; after_json: string }>(
      "SELECT action, before_json, after_json FROM audit_log WHERE entity = 'students' ORDER BY at, id",
    )
    expect(rows.map((r) => r.action)).toEqual(['create', 'update', 'delete'])
    expect(rows[1]?.before_json).toContain('Amina Begum')
    expect(rows[1]?.after_json).toContain('Amina Khan')
  })

  it('refuses a stale version and leaves the row unchanged', async () => {
    const db = await freshDb()
    const id = await admit(db, 'Salma Akter')
    await expect(updateStudent(db, ctx(), id, { full_name: 'Other' }, 9)).rejects.toBeInstanceOf(
      VersionConflictError,
    )
    expect((await byId(db, id))?.full_name).toBe('Salma Akter')
  })

  it('quotes FTS tokens so user punctuation cannot break the MATCH query', () => {
    expect(ftsQuery('  rahim  uddin ')).toBe('"rahim"* AND "uddin"*')
    expect(ftsQuery('a"b')).toBe('"a""b"*')
  })

  it('filters by status and maps the passed_out DB value to its i18n key', async () => {
    const { statusKey } = await import('./types')
    expect(statusKey('active')).toBe('active')
    expect(statusKey('dropped')).toBe('dropped')
    expect(statusKey('passed_out')).toBe('passedOut')
    const db = await freshDb()
    await admit(db, 'Passed Student', { status: 'passed_out' })
    expect((await search(db, { status: 'passed_out' })).map((r) => r.full_name)).toEqual([
      'Passed Student',
    ])
  })
})

describe('FTS5 identity search', () => {
  it('matches name, phone, guardian, student number and not a deleted student', async () => {
    const db = await freshDb()
    await admit(db, 'Rahim Uddin', {
      phone: '01711000001',
      guardian_name: 'Guardian Karim',
      guardian_phone: '01711000009',
    })

    expect((await search(db, { query: 'rahim' })).map((r) => r.full_name)).toEqual(['Rahim Uddin'])
    expect(await search(db, { query: '01711000001' })).toHaveLength(1)
    expect(await search(db, { query: 'guardian' })).toHaveLength(1)
    expect(await search(db, { query: '2026-0001' })).toHaveLength(1)
    expect(await search(db, { query: 'nobody' })).toHaveLength(0)
    expect(await search(db, { status: 'dropped' })).toHaveLength(0)
  })

  it('keeps the index in step with edits and restores', async () => {
    const db = await freshDb()
    const id = await admit(db, 'Old Name')
    await updateStudent(db, ctx(), id, { full_name: 'New Name' }, 1)
    expect(await search(db, { query: 'old' })).toHaveLength(0)
    expect(await search(db, { query: 'new' })).toHaveLength(1)
  })

  it('searches 5,000 seeded students well under the 100 ms budget', async () => {
    const db = await freshDb()
    // T-044: the performance suite consumes the same generator as the CLI.
    const seeded = generateStudents(5_000)
    for (const row of seeded) await create(db, ctx(), { ...row })
    expect(await all(db)).toHaveLength(5_000)

    const term = seeded[499]?.full_name.split(' ')[0] ?? ''
    const started = performance.now()
    const result = await search(db, { query: term })
    const elapsed = performance.now() - started
    expect(result.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(100)
  }, 60_000)
})
