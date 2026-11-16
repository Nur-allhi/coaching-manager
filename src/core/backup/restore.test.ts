import { webcrypto } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { migrate } from '../db/migrate'
import { migrations } from '../db/migrations'
import { createBetterSqliteDb } from '../db/testing/better-sqlite3'
import type { Db } from '../db/types'
import { createSnapshot, listSnapshots, type SnapshotOutcome } from './snapshots'
import { restoreFromSnapshot, SnapshotValidationError, type SnapshotInspector } from './restore'
import type { SnapshotStorage } from './storage'

const APP_SCHEMA = 202611160960
const BASE = Date.UTC(2026, 0, 2, 3, 4, 5)

beforeAll(() => {
  if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto)
})

function memoryStorage(): SnapshotStorage {
  const files = new Map<string, Uint8Array>()
  return {
    async list() {
      return [...files.keys()]
    },
    async read(name) {
      const bytes = files.get(name)
      if (!bytes) throw new Error(`missing file: ${name}`)
      return bytes
    },
    async write(name, bytes) {
      files.set(name, bytes.slice())
    },
    async remove(name) {
      files.delete(name)
    },
  }
}

async function seeded() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  const storage = memoryStorage()
  async function change() {
    await db.run(
      'INSERT INTO students (id, created_at, updated_at, deleted_at, version, student_no, full_name, admitted_on) ' +
        'VALUES (?, ?, ?, NULL, 1, ?, ?, ?)',
      ['s-1', 1, 1, '2026-0001', 'Student 1', '2026-01-02'],
    )
  }
  const snapshot = () =>
    createSnapshot({ db, storage, reason: 'manual', now: BASE }) as Promise<SnapshotOutcome>
  return { db, storage, change, snapshot }
}

const inspector: SnapshotInspector = {
  async inspect(bytes) {
    const db = createBetterSqliteDb()
    await db.importBytes(bytes)
    const integrity = await db.query<{ integrity_check: string }>('PRAGMA integrity_check')
    const schema = await db.query<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'schema_version'",
    )
    const students = await db.query<{ n: number }>(
      'SELECT COUNT(*) AS n FROM students WHERE deleted_at IS NULL',
    )
    const payments = await db.query<{ n: number }>(
      'SELECT COUNT(*) AS n FROM payments WHERE deleted_at IS NULL',
    )
    const last = await db.query<{ at: number | null }>('SELECT MAX(updated_at) AS at FROM students')
    return {
      integrity: integrity[0]?.integrity_check ?? '',
      schemaVersion: Number(schema[0]?.value ?? 0),
      students: students[0]?.n ?? 0,
      payments: payments[0]?.n ?? 0,
      lastChangeAt: last[0]?.at ?? null,
    }
  },
}

describe('restore', () => {
  it('rejects a corrupt file and leaves the live data unchanged', async () => {
    const { db, storage, change, snapshot } = await seeded()
    await change()
    const made = await snapshot()
    if (made.status !== 'created') throw new Error('snapshot was skipped')
    const bytes = await storage.read(made.file)
    bytes[64] = bytes[64] === 0xff ? 0 : 0xff
    await storage.write(made.file, bytes)

    await expect(
      restoreFromSnapshot({
        db,
        storage,
        file: made.file,
        appSchemaVersion: APP_SCHEMA,
        now: BASE + 1000,
      }),
    ).rejects.toMatchObject({ failure: 'checksum' })
    expect(await db.query('SELECT full_name FROM students')).toMatchObject([
      { full_name: 'Student 1' },
    ])
  })

  it('rejects a newer schema version before touching the live database', async () => {
    const { db, storage, change, snapshot } = await seeded()
    await change()
    const made = await snapshot()
    if (made.status !== 'created') throw new Error('snapshot was skipped')
    const sidecarFile = `${made.file.slice(0, -7)}.json`
    const sidecar = JSON.parse(new TextDecoder().decode(await storage.read(sidecarFile)))
    sidecar.schemaVersion = APP_SCHEMA + 1
    await storage.write(sidecarFile, new TextEncoder().encode(JSON.stringify(sidecar)))

    await expect(
      restoreFromSnapshot({
        db,
        storage,
        file: made.file,
        appSchemaVersion: APP_SCHEMA,
        now: BASE + 1000,
      }),
    ).rejects.toMatchObject({ failure: 'schema' })
    expect(await db.query('SELECT full_name FROM students')).toMatchObject([
      { full_name: 'Student 1' },
    ])
  })

  it('round-trips good data and writes a pre-restore snapshot first', async () => {
    const { db, storage, change, snapshot } = await seeded()
    await change()
    const made = await snapshot()
    if (made.status !== 'created') throw new Error('snapshot was skipped')
    await db.run('DELETE FROM students')

    const summary = await restoreFromSnapshot({
      db,
      storage,
      file: made.file,
      appSchemaVersion: APP_SCHEMA,
      now: BASE + 1000,
      inspector,
    })

    expect(summary).toMatchObject({ students: 1, payments: 0, lastChangeAt: 1 })
    expect(summary.preRestoreSnapshot).toContain('pre-restore')
    expect((await listSnapshots(storage)).some((s) => s.sidecar.reason === 'pre-restore')).toBe(
      true,
    )
    expect(await db.query('SELECT full_name FROM students')).toMatchObject([
      { full_name: 'Student 1' },
    ])
  })

  it('re-imports the live bytes when the import fails', async () => {
    const { db, storage, change, snapshot } = await seeded()
    await change()
    const made = await snapshot()
    if (made.status !== 'created') throw new Error('snapshot was skipped')
    await db.run("UPDATE students SET full_name = 'Changed' WHERE id = 's-1'")

    let attempts = 0
    const flaky: Db = {
      ...db,
      importBytes: async (bytes) => {
        attempts += 1
        if (attempts === 1) throw new Error('import failed')
        return db.importBytes(bytes)
      },
    }

    await expect(
      restoreFromSnapshot({
        db: flaky,
        storage,
        file: made.file,
        appSchemaVersion: APP_SCHEMA,
        now: BASE + 1000,
      }),
    ).rejects.toThrow('import failed')
    expect(attempts).toBe(2)
    expect(await db.query('SELECT full_name FROM students')).toMatchObject([
      { full_name: 'Changed' },
    ])
  })

  it('rejects a failed integrity check from the inspector', async () => {
    const { db, storage, change, snapshot } = await seeded()
    await change()
    const made = await snapshot()
    if (made.status !== 'created') throw new Error('snapshot was skipped')

    await expect(
      restoreFromSnapshot({
        db,
        storage,
        file: made.file,
        appSchemaVersion: APP_SCHEMA,
        now: BASE + 1000,
        inspector: {
          async inspect() {
            return {
              integrity: 'corrupt',
              schemaVersion: 0,
              students: 1,
              payments: 0,
              lastChangeAt: null,
            }
          },
        },
      }),
    ).rejects.toBeInstanceOf(SnapshotValidationError)
    expect(await db.query('SELECT full_name FROM students')).toMatchObject([
      { full_name: 'Student 1' },
    ])
  })
})
