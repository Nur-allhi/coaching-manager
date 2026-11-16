import { describe, expect, it, vi } from 'vitest'
import { migrate } from './migrate'
import { migrations } from './migrations'
import { createBetterSqliteDb } from './testing/better-sqlite3'
import type { Db } from './types'

async function schemaOf(db: Db) {
  return db.query<{ name: string; sql: string }>(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' ORDER BY name",
  )
}

async function versionOf(db: Db) {
  const rows = await db.query<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'schema_version'",
  )
  return rows[0]?.value
}

describe('migrate', () => {
  it('creates the full schema on an empty database', async () => {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })

    const names = (await schemaOf(db)).map((row) => row.name)
    expect(names).toContain('students')
    expect(names).toContain('enrollments')
    expect(names).toContain('charges')
    expect(names).toContain('attendance_sessions')
    expect(names).toContain('exam_results')
    expect(await versionOf(db)).toBe('202611160960')
  })

  it('brings a v1 database to the identical schema', async () => {
    const fresh = createBetterSqliteDb()
    await migrate({ db: fresh, migrations })

    const fromV1 = createBetterSqliteDb()
    await migrate({ db: fromV1, migrations: migrations.slice(0, 1) })
    await migrate({ db: fromV1, migrations })

    expect(await schemaOf(fromV1)).toEqual(await schemaOf(fresh))
    expect(await versionOf(fromV1)).toBe(await versionOf(fresh))
  })

  it('gives every business table the five common columns', async () => {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })

    const tables = (await schemaOf(db)).map((row) => row.name)
    const business = tables.filter(
      (name) =>
        ![
          'app_meta',
          'settings',
          'counters',
          'audit_log',
          'payment_allocations',
          'attendance_records',
          'exam_results',
          'sqlite_sequence',
        ].includes(name),
    )
    expect(business.length).toBeGreaterThan(0)

    for (const table of business) {
      const columns = await db.query<{ name: string }>(`PRAGMA table_info(${table})`)
      const names = columns.map((column) => column.name)
      expect(names, table).toEqual(
        expect.arrayContaining(['id', 'created_at', 'updated_at', 'deleted_at', 'version']),
      )
    }
  })

  it('is idempotent and does not take a snapshot when nothing is pending', async () => {
    const db = createBetterSqliteDb()
    const onPreMigration = vi.fn(async () => undefined)

    await migrate({ db, migrations, onPreMigration })
    await migrate({ db, migrations, onPreMigration })

    expect(onPreMigration).toHaveBeenCalledTimes(1)
    expect((await schemaOf(db)).filter((row) => row.name === 'students')).toHaveLength(1)
  })

  it('calls the snapshot hook before the migration transaction', async () => {
    const db = createBetterSqliteDb()
    const order: string[] = []
    await migrate({
      db,
      migrations,
      onPreMigration: async () => {
        order.push('snapshot')
      },
    })
    order.push('migrated')
    expect(order).toEqual(['snapshot', 'migrated'])
  })

  it('rolls back every statement when a migration fails', async () => {
    const db = createBetterSqliteDb()
    const failing = [
      ...migrations,
      {
        version: 202611160970,
        module: 'test',
        name: 'bad',
        sql: 'CREATE TABLE half_done (id TEXT); THIS IS NOT SQL;',
      },
    ]

    await expect(migrate({ db, migrations: failing })).rejects.toThrow()

    const names = (await schemaOf(db)).map((row) => row.name)
    expect(names).not.toContain('half_done')
    expect(await versionOf(db)).toBeUndefined()
  })
})
