/**
 * Append-only migrations (PLAN.md §5, ticket T-013).
 *
 * `app_meta.schema_version` is the single monotonic integer version. A migration runs after
 * a pre-migration snapshot hook, inside one transaction. A failure rolls back every
 * statement in the batch and leaves the old version in place.
 */
import type { Db } from './types'
import { splitSql } from './split-sql'

export interface Migration {
  /** Monotonic integer from the UTC timestamp in the filename: YYYYMMDDHHmm. */
  version: number
  module: string
  name: string
  sql: string
}

export interface MigrateOptions {
  db: Db
  migrations: readonly Migration[]
  onPreMigration?: () => Promise<void>
}

export async function migrate({ db, migrations, onPreMigration }: MigrateOptions): Promise<void> {
  await db.run('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)')

  const rows = await db.query<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'schema_version'",
  )
  const current = rows.length ? Number(rows[0]?.value) : 0

  const pending = [...migrations]
    .filter((migration) => migration.version > current)
    .sort((a, b) => a.version - b.version)

  if (pending.length === 0) return

  await onPreMigration?.()

  const target = pending[pending.length - 1]
  if (!target) return

  await db.tx(async (t) => {
    for (const migration of pending) {
      for (const statement of splitSql(migration.sql)) {
        await t.run(statement)
      }
    }
    await t.run(
      'INSERT INTO app_meta (key, value) VALUES (?, ?) ' +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ['schema_version', String(target.version)],
    )
  })
}
