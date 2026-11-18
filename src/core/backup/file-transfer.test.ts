/**
 * Unit tests for portable file export/import (T-033, D-038).
 * A memory FileWriter captures exported bytes; an in-memory SnapshotStorage backs the shared
 * restore path. Node WebCrypto is injected; a low PBKDF2 count keeps tests fast.
 */
import { webcrypto } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { migrate } from '../db/migrate'
import { migrations } from '../db/migrations'
import { createBetterSqliteDb } from '../db/testing/better-sqlite3'
import type { Db } from '../db/types'
import { WrongPassphraseError } from './crypto'
import type { WebCrypto } from './crypto-types'
import { exportDatabaseFile, importDatabaseFile, type FileWriter } from './file-transfer'
import type { SnapshotStorage } from './storage'

const APP_SCHEMA = 202611181200
const BASE = Date.UTC(2026, 0, 2, 3, 4, 5)
const crypto = webcrypto as unknown as WebCrypto

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

function capturingWriter(): { writer: FileWriter; saved: () => Uint8Array } {
  let captured = new Uint8Array()
  return {
    writer: {
      async save(bytes) {
        captured = new Uint8Array(bytes)
      },
    },
    saved: () => captured,
  }
}

async function seededDb(seed = 'Asha'): Promise<Db> {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  await db.run(
    'INSERT INTO students (id, created_at, updated_at, deleted_at, version, student_no, full_name, admitted_on) ' +
      'VALUES (?, ?, ?, NULL, 1, ?, ?, ?)',
    ['s-1', 1, 1, '2026-0001', seed, '2026-01-02'],
  )
  return db
}

// The codec uses the shipped default KDF (600,000 iterations).
const fastCrypto: WebCrypto = crypto

describe('portable database file transfer', () => {
  it('exports plain bytes that restore on a clean database', async () => {
    const original = await seededDb('Asha')
    const bytes = await original.exportBytes()
    const { writer, saved } = capturingWriter()
    await exportDatabaseFile({
      bytes,
      fileName: 'backup.sqlite',
      schemaVersion: APP_SCHEMA,
      crypto: fastCrypto,
      writer,
    })
    expect(saved().byteLength).toBe(bytes.byteLength)

    const clean = await seededDb('Old')
    const storage = memoryStorage()
    const summary = await importDatabaseFile({
      file: saved(),
      db: clean,
      storage,
      appSchemaVersion: APP_SCHEMA,
      now: BASE,
      crypto: fastCrypto,
    })
    expect(summary.students).toBe(1)
    const rows = await clean.query<{ full_name: string }>('SELECT full_name FROM students')
    expect(rows[0]?.full_name).toBe('Asha')
  })

  it('restores an encrypted export with the correct passphrase', async () => {
    const original = await seededDb('Karim')
    const bytes = await original.exportBytes()
    const { writer, saved } = capturingWriter()
    await exportDatabaseFile({
      bytes,
      fileName: 'backup.cmb',
      passphrase: 'secret',
      schemaVersion: APP_SCHEMA,
      crypto: fastCrypto,
      writer,
    })
    expect(saved().byteLength).toBeGreaterThan(bytes.byteLength)

    const clean = await seededDb('Old')
    await importDatabaseFile({
      file: saved(),
      db: clean,
      storage: memoryStorage(),
      appSchemaVersion: APP_SCHEMA,
      now: BASE,
      passphrase: 'secret',
      crypto: fastCrypto,
    })
    const rows = await clean.query<{ full_name: string }>('SELECT full_name FROM students')
    expect(rows[0]?.full_name).toBe('Karim')
  })

  it('rejects an encrypted export with the wrong passphrase', async () => {
    const original = await seededDb('Karim')
    const { writer, saved } = capturingWriter()
    await exportDatabaseFile({
      bytes: await original.exportBytes(),
      fileName: 'backup.cmb',
      passphrase: 'right',
      schemaVersion: APP_SCHEMA,
      crypto: fastCrypto,
      writer,
    })
    const clean = await seededDb('Old')
    await expect(
      importDatabaseFile({
        file: saved(),
        db: clean,
        storage: memoryStorage(),
        appSchemaVersion: APP_SCHEMA,
        now: BASE,
        passphrase: 'wrong',
        crypto: fastCrypto,
      }),
    ).rejects.toBeInstanceOf(WrongPassphraseError)
    const rows = await clean.query<{ full_name: string }>('SELECT full_name FROM students')
    expect(rows[0]?.full_name).toBe('Old')
  })
})
