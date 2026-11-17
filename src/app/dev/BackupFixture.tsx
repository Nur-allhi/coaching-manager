/**
 * Test-only fixture route for T-035 (`/__backup-fixture`), not product UI.
 *
 * The Backups page snapshots/restores the real database; this route lets `backups.spec.ts`
 * seed a recognizable student row, break it, and read it back — exercising the real page flow
 * without depending on a module screen (students CRUD lands in P2).
 */
import { useCallback, useEffect, useState } from 'react'
import { getDb } from '@/core/db/client'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { findById, type Row } from '@/core/db/repository'

export function BackupFixture() {
  const db = getDb()
  const [value, setValue] = useState('none')
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const row = await findById<Row>(db, 'students', 'backup-fixture')
    setValue(row ? String(row.full_name) : 'none')
  }, [db])

  useEffect(() => {
    void (async () => {
      await migrate({ db, migrations })
      await refresh()
      setReady(true)
    })()
  }, [db, refresh])

  async function seed() {
    await db.run(
      'INSERT OR REPLACE INTO students (id, created_at, updated_at, deleted_at, version, student_no, full_name, admitted_on) ' +
        "VALUES ('backup-fixture', 1, 1, NULL, 1, 'BF-0001', 'FixtureStudent', '2026-01-01')",
    )
    await refresh()
  }

  async function break_() {
    await db.run("UPDATE students SET full_name = 'BROKEN' WHERE id = 'backup-fixture'")
    await refresh()
  }

  return (
    <main className="mx-auto max-w-xl space-y-3 p-6">
      <h1 className="text-xl font-semibold">Backup fixture</h1>
      <p data-testid="fixture-status" role="status">
        {ready ? 'ready' : 'starting…'}
      </p>
      <p data-testid="fixture-value">{value}</p>
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="fixture-seed"
          disabled={!ready}
          onClick={() => void seed()}
        >
          Seed
        </button>
        <button
          type="button"
          data-testid="fixture-break"
          disabled={!ready}
          onClick={() => void break_()}
        >
          Break
        </button>
      </div>
    </main>
  )
}
