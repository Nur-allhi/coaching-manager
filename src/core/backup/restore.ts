/**
 * Restore from a snapshot (T-032; PLAN.md §7.3, D-036).
 *
 * Strict order: validate, summarise, write a forced pre-restore snapshot, then replace the live
 * database. Every failure before the import leaves the live bytes untouched; if the import or
 * its verification fails, the exported bytes are imported back before the error is rethrown.
 */
import type { Db } from '../db/types'
import { createSnapshot, listSnapshots, rowCount } from './snapshots'
import type { SnapshotStorage } from './storage'

export type ValidationFailure = 'missing' | 'checksum' | 'header' | 'schema' | 'integrity'

export class SnapshotValidationError extends Error {
  readonly failure: ValidationFailure

  constructor(failure: ValidationFailure, message: string) {
    super(message)
    this.name = 'SnapshotValidationError'
    this.failure = failure
  }
}

export interface Inspection {
  integrity: string
  schemaVersion: number
  students: number
  payments: number
  lastChangeAt: number | null
}

/** Optional second opinion: opens the bytes elsewhere and runs `PRAGMA integrity_check`. */
export interface SnapshotInspector {
  inspect(bytes: Uint8Array): Promise<Inspection>
}

export interface RestoreSummary {
  file: string
  schemaVersion: number
  students: number
  payments: number
  lastChangeAt: number | null
  preRestoreSnapshot: string
}

export interface RestoreOptions {
  db: Db
  storage: SnapshotStorage
  file: string
  appSchemaVersion: number
  now: number
  inspector?: SnapshotInspector
}

async function hasChecksum(bytes: Uint8Array, expected: string): Promise<boolean> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
  const actual = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return actual === expected
}

function assertSqliteHeader(bytes: Uint8Array): void {
  const header = bytes.byteLength >= 16 ? new TextDecoder().decode(bytes.slice(0, 16)) : ''
  if (header !== 'SQLite format 3\u0000') {
    throw new SnapshotValidationError('header', 'the file is not a SQLite database')
  }
}

export async function restoreFromSnapshot({
  db,
  storage,
  file,
  appSchemaVersion,
  now,
  inspector,
}: RestoreOptions): Promise<RestoreSummary> {
  const entry = (await listSnapshots(storage)).find((snapshot) => snapshot.file === file)
  if (!entry) throw new SnapshotValidationError('missing', `snapshot not found: ${file}`)

  const bytes = await storage.read(file)
  if (!(await hasChecksum(bytes, entry.sidecar.sha256))) {
    throw new SnapshotValidationError('checksum', `checksum mismatch for ${file}`)
  }
  assertSqliteHeader(bytes)
  if (entry.sidecar.schemaVersion > appSchemaVersion) {
    throw new SnapshotValidationError(
      'schema',
      `snapshot schema ${entry.sidecar.schemaVersion} is newer than ${appSchemaVersion}`,
    )
  }

  let students = entry.sidecar.students
  let payments = entry.sidecar.payments
  let lastChangeAt: number | null = entry.sidecar.at
  if (inspector) {
    const inspected = await inspector.inspect(bytes)
    if (inspected.integrity !== 'ok') {
      throw new SnapshotValidationError('integrity', 'PRAGMA integrity_check failed')
    }
    if (inspected.schemaVersion > appSchemaVersion) {
      throw new SnapshotValidationError('schema', 'snapshot schema is newer than the app')
    }
    students = inspected.students
    payments = inspected.payments
    lastChangeAt = inspected.lastChangeAt
  }

  const live = await db.exportBytes()
  const preRestore = await createSnapshot({ db, storage, reason: 'pre-restore', now, force: true })
  if (preRestore.status !== 'created') throw new Error('pre-restore snapshot was not written')

  try {
    await db.importBytes(bytes)
    const [actualStudents, actualPayments] = await Promise.all([
      rowCount(db, 'students'),
      rowCount(db, 'payments'),
    ])
    if (actualStudents !== students || actualPayments !== payments) {
      throw new Error('restored row counts do not match the summary')
    }
  } catch (error) {
    await db.importBytes(live)
    throw error
  }

  return {
    file,
    schemaVersion: entry.sidecar.schemaVersion,
    students,
    payments,
    lastChangeAt,
    preRestoreSnapshot: preRestore.file,
  }
}
