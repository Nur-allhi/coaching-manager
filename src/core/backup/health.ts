/**
 * Backup health metadata (T-035, D-040 C1).
 *
 * The last file-export timestamp lives in `app_meta` (owned by data-tools per TAD.md §7),
 * separate from the database schema version. A file export is not a snapshot, so inferring the
 * export date from snapshot sidecars would be inaccurate. All access is best-effort guarded.
 */
import type { Db } from '../db/types'

const LAST_EXPORT_KEY = 'last_file_export_at'

export async function recordFileExport(db: Db, now: number): Promise<void> {
  await db.run(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ' +
      'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [LAST_EXPORT_KEY, String(now)],
  )
}

export async function lastFileExport(db: Db): Promise<number | null> {
  const rows = await db.query<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [
    LAST_EXPORT_KEY,
  ])
  const raw = rows[0]?.value
  if (raw === undefined) return null
  const at = Number(raw)
  return Number.isFinite(at) ? at : null
}

/** True when there has never been a file export, or the last one is older than `maxAgeMs`. */
export function isExportStale(lastAt: number | null, now: number, maxAgeMs: number): boolean {
  return lastAt === null || now - lastAt > maxAgeMs
}
