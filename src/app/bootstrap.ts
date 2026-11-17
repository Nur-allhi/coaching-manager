/**
 * App bootstrap: run migrations before the app renders (T-040, PLAN §7.4).
 *
 * A real screen cannot read the `settings` table until migrations have created it. Dev harnesses
 * call `migrate()` themselves, but the app shell never did — so settings/backups screens found
 * no tables. This module is the single startup gate: after the single-tab lock is acquired, it
 * takes a pre-migration snapshot, runs migrations in a transaction, and reports failure so main
 * can show a recovery screen instead of a broken app.
 */
import { getDb } from '@/core/db/client'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createSnapshot, schemaVersion } from '@/core/backup/snapshots'
import { opfsStorage } from '@/core/backup/storage'

export interface BootstrapResult {
  ok: boolean
  error?: string
}

export async function bootstrapApp(): Promise<BootstrapResult> {
  const db = getDb()
  try {
    await migrate({
      db,
      migrations,
      onPreMigration: async () => {
        // Only an upgrade of an existing DB needs a safety copy (PLAN §7.4). A fresh install has
        // no data to protect, and an empty snapshot would skew the snapshot-count harness specs.
        if ((await schemaVersion(db)) === 0) return
        await createSnapshot({
          db,
          storage: opfsStorage(),
          reason: 'pre-migration',
          now: Date.now(),
        })
      },
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
