import { webcrypto } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { migrate } from '../db/migrate'
import { migrations } from '../db/migrations'
import { createBetterSqliteDb } from '../db/testing/better-sqlite3'
import { createSnapshot, listSnapshots } from './snapshots'
import type { SnapshotStorage } from './storage'

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
  let n = 0
  async function change() {
    n += 1
    await db.run(
      'INSERT INTO students (id, created_at, updated_at, deleted_at, version, student_no, full_name, admitted_on) ' +
        'VALUES (?, ?, ?, NULL, 1, ?, ?, ?)',
      [`s-${n}`, n, n, `2026-${String(n).padStart(4, '0')}`, `Student ${n}`, '2026-01-02'],
    )
  }
  return { db, storage, change }
}

const BASE = Date.UTC(2026, 0, 2, 3, 4, 5)

describe('snapshots', () => {
  it('writes a sidecar with the reason, schema version, checksum, size and row counts', async () => {
    const { db, storage, change } = await seeded()
    await change()

    const result = await createSnapshot({ db, storage, reason: 'manual', now: BASE })

    expect(result.status).toBe('created')
    if (result.status !== 'created') return
    expect(result.file).toBe('20260102-030405_manual.sqlite')
    expect(result.sidecar).toMatchObject({
      reason: 'manual',
      schemaVersion: 202611160960,
      students: 1,
      payments: 0,
      size: expect.any(Number),
      sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    })
    const stored = JSON.parse(
      new TextDecoder().decode(await storage.read(`${result.file.slice(0, -7)}.json`)),
    )
    expect(stored).toEqual(result.sidecar)
    expect(await listSnapshots(storage)).toHaveLength(1)
  })

  it('skips a snapshot when the database is unchanged', async () => {
    const { db, storage, change } = await seeded()
    await change()
    await createSnapshot({ db, storage, reason: 'manual', now: BASE })

    const again = await createSnapshot({ db, storage, reason: 'auto', now: BASE + 1000 })

    expect(again.status).toBe('skipped')
    expect((await storage.list()).filter((name) => name.endsWith('.sqlite'))).toHaveLength(1)
  })

  it('keeps exactly ten snapshots and their sidecars after twelve changes', async () => {
    const { db, storage, change } = await seeded()
    const created: string[] = []
    for (let i = 1; i <= 12; i += 1) {
      await change()
      const result = await createSnapshot({ db, storage, reason: 'manual', now: BASE + i * 1000 })
      if (result.status === 'created') created.push(result.file)
    }

    expect(created).toHaveLength(12)
    const files = (await storage.list()).filter((name) => name.endsWith('.sqlite'))
    const sidecars = (await storage.list()).filter((name) => name.endsWith('.json'))
    expect(files).toHaveLength(10)
    expect(sidecars).toHaveLength(10)
    expect(await listSnapshots(storage)).toHaveLength(10)
    expect(files).not.toContain(created[0])
    expect(files).not.toContain(created[1])
    expect(files).toContain(created[11])
  })

  it('gives two snapshots in the same second different names', async () => {
    const { db, storage, change } = await seeded()
    await change()
    const first = await createSnapshot({ db, storage, reason: 'manual', now: BASE })
    await change()
    const second = await createSnapshot({ db, storage, reason: 'manual', now: BASE })

    expect(first.status).toBe('created')
    expect(second.status).toBe('created')
    if (first.status === 'created' && second.status === 'created') {
      expect(second.file).not.toBe(first.file)
    }
    expect(await listSnapshots(storage)).toHaveLength(2)
  })
})
