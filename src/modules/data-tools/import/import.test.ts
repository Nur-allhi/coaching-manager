/** Unit tests for CSV parsing, mapping, row errors, dry run and idempotent commit (T-081). */
import { describe, expect, it } from 'vitest'
import { makeAuditContext } from '@/core/audit/write'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import type { SnapshotStorage } from '@/core/backup/storage'
import { parseCsv, toCsv } from './csv'
import { defaultMapping } from './validate'
import { commitImport, dryRunImport, previewImport } from './service'

function memoryStorage(): SnapshotStorage {
  const files = new Map<string, Uint8Array>()
  return {
    async list() {
      return [...files.keys()]
    },
    async read(name) {
      const bytes = files.get(name)
      if (!bytes) throw new Error('missing')
      return bytes
    },
    async write(name, bytes) {
      files.set(name, bytes)
    },
    async remove(name) {
      files.delete(name)
    },
  }
}

async function setup() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  return { db, storage: memoryStorage() }
}

const GOOD =
  'student_no,full_name,admitted_on,status,phone,guardian_name\r\n2026-0001,Rahim,2026-01-10,active,01700000001,Karim'
const BAD = `${GOOD}\r\n2026-0002,Corrupt,10-01-2026,active,01700000002,Karim`

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

describe('import parsing and validation', () => {
  it('parses and writes quoted CSV fields without losing commas', () => {
    const rows = parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n')
    expect(rows[1]).toEqual(['x, y', 'he said "hi"'])
    expect(toCsv([['x,y']])).toBe('"x,y"')
  })

  it('defaults the mapping from headers and flags a bad row before any write', async () => {
    const { db } = await setup()
    const mapping = defaultMapping(
      ['student_no', 'full_name', 'admitted_on', 'status', 'phone', 'guardian_name'],
      'students',
    )
    expect(mapping.full_name).toBe(1)
    const preview = await previewImport(db, 'students.csv', bytes(BAD), 'students', mapping)
    expect(preview.rows[0]?.errors).toEqual([])
    expect(preview.rows[1]?.errors).toContain('import.badDate')
    expect(preview.validCount).toBe(1)
    expect(preview.errorCount).toBe(1)
  })

  it('a dry run writes nothing', async () => {
    const { db } = await setup()
    await dryRunImport(db, 'students.csv', bytes(GOOD), 'students')
    const rows = await db.query('SELECT id FROM students')
    expect(rows).toHaveLength(0)
  })

  it('commits valid rows after a forced pre-import snapshot and is idempotent', async () => {
    const { db, storage } = await setup()
    const first = await previewImport(db, 'students.csv', bytes(GOOD), 'students')
    const result = await commitImport(
      db,
      storage,
      'students',
      first,
      makeAuditContext('import'),
      1_000,
    )
    expect(result.imported).toBe(1)
    expect(await storage.list()).toEqual(
      expect.arrayContaining([expect.stringContaining('pre-import')]),
    )

    const second = await previewImport(db, 'students.csv', bytes(GOOD), 'students')
    expect(second.rows[0]?.errors).toContain('import.duplicate')
    expect(second.validCount).toBe(0)
    const students = await db.query('SELECT id FROM students')
    expect(students).toHaveLength(1)
  })
})
