/**
 * Snapshot creation, checksum dedupe and rotation (T-031; PLAN.md §7.3).
 *
 * A snapshot is the exported database bytes plus a sidecar manifest. The SHA-256 in the sidecar
 * is both the dedupe key and the integrity record. File names start with a sortable timestamp,
 * which is what makes "keep the newest 10" deterministic. See D-035 (T-031).
 */
import type { Db } from '../db/types'
import type { SnapshotStorage } from './storage'

export type SnapshotReason = 'auto' | 'manual' | 'pre-restore' | 'pre-migration' | 'pre-import'

export const MAX_SNAPSHOTS = 10

export interface SnapshotSidecar {
  reason: SnapshotReason
  schemaVersion: number
  sha256: string
  size: number
  students: number
  payments: number
  at: number
}

export interface SnapshotFile {
  file: string
  sidecar: SnapshotSidecar
}

export type SnapshotOutcome =
  | { status: 'created'; file: string; sidecar: SnapshotSidecar }
  | { status: 'skipped'; duplicateOf: string }

function sidecarFor(file: string): string {
  return `${file.slice(0, -'.sqlite'.length)}.json`
}

async function checksum(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** `YYYYMMDD-HHmmss`, the prefix PLAN.md §7.3 uses in the file name. */
function fileTime(now: number): string {
  const iso = new Date(now).toISOString().replace(/[-:]/g, '')
  return `${iso.slice(0, 8)}-${iso.slice(9, 15)}`
}

/** Existing snapshots whose sidecar can be read; an orphaned file is not a snapshot. */
export async function listSnapshots(storage: SnapshotStorage): Promise<SnapshotFile[]> {
  const names = (await storage.list()).filter((name) => name.endsWith('.sqlite')).sort()
  const found: SnapshotFile[] = []
  for (const file of names) {
    try {
      const bytes = await storage.read(sidecarFor(file))
      const sidecar = JSON.parse(new TextDecoder().decode(bytes)) as SnapshotSidecar
      found.push({ file, sidecar })
    } catch {
      // Missing or malformed sidecar: skip it rather than breaking the whole listing.
    }
  }
  return found
}

async function rowCount(db: Db, table: 'students' | 'payments'): Promise<number> {
  try {
    const rows = await db.query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${table} WHERE deleted_at IS NULL`,
    )
    return rows[0]?.n ?? 0
  } catch {
    return 0 // migrations have not run yet in the dev harness
  }
}

async function schemaVersion(db: Db): Promise<number> {
  try {
    const rows = await db.query<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'schema_version'",
    )
    return Number(rows[0]?.value ?? 0)
  } catch {
    return 0 // app_meta does not exist until the migration runner has run
  }
}

async function uniqueFileName(storage: SnapshotStorage, base: string): Promise<string> {
  const used = new Set(await storage.list())
  let name = `${base}.sqlite`
  let suffix = 1
  while (used.has(name)) {
    name = `${base}-${suffix}.sqlite`
    suffix += 1
  }
  return name
}

export interface CreateSnapshotOptions {
  db: Db
  storage: SnapshotStorage
  reason: SnapshotReason
  now: number
}

export async function createSnapshot({
  db,
  storage,
  reason,
  now,
}: CreateSnapshotOptions): Promise<SnapshotOutcome> {
  const bytes = await db.exportBytes()
  const hash = await checksum(bytes)
  const existing = await listSnapshots(storage)

  const duplicate = existing.find((entry) => entry.sidecar.sha256 === hash)
  if (duplicate) return { status: 'skipped', duplicateOf: duplicate.file }

  const file = await uniqueFileName(storage, `${fileTime(now)}_${reason}`)
  const sidecar: SnapshotSidecar = {
    reason,
    schemaVersion: await schemaVersion(db),
    sha256: hash,
    size: bytes.byteLength,
    students: await rowCount(db, 'students'),
    payments: await rowCount(db, 'payments'),
    at: now,
  }

  await storage.write(file, bytes)
  await storage.write(sidecarFor(file), new TextEncoder().encode(JSON.stringify(sidecar)))

  const ordered = [...existing, { file, sidecar }].sort((a, b) => a.file.localeCompare(b.file))
  for (const old of ordered.slice(0, -MAX_SNAPSHOTS)) {
    await storage.remove(old.file)
    await storage.remove(sidecarFor(old.file))
  }

  return { status: 'created', file, sidecar }
}
