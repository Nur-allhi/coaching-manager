/**
 * A small verification harness for T-031, served at `/__snapshots`.
 *
 * Like `/__db-spike` (D-025) this is a test route under the router, not product UI. It makes the
 * two acceptance lines observable in a real browser with real OPFS: change the database, take a
 * snapshot, and read the snapshot count and the newest sidecar.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { restoreFromSnapshot } from '@/core/backup/restore'
import { createSnapshot, listSnapshots, schemaVersion } from '@/core/backup/snapshots'
import { opfsStorage } from '@/core/backup/storage'
import { getDb } from '@/core/db/client'

const SPIKE_TABLE = 'snapshot_spike'

export function SnapshotHarness() {
  const db = getDb()
  const storage = useMemo(() => opfsStorage(), [])
  const [status, setStatus] = useState('starting…')
  const [changes, setChanges] = useState(0)
  const [dataCount, setDataCount] = useState(0)
  const [count, setCount] = useState(0)
  const [lastSidecar, setLastSidecar] = useState('{}')

  const refresh = useCallback(async () => {
    const files = await listSnapshots(storage)
    setCount(files.length)
    const newest = files[files.length - 1]
    if (newest) setLastSidecar(JSON.stringify(newest.sidecar))
    const rows = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${SPIKE_TABLE}`)
    setDataCount(rows[0]?.n ?? 0)
  }, [db, storage])

  useEffect(() => {
    void (async () => {
      try {
        await db.run(
          `CREATE TABLE IF NOT EXISTS ${SPIKE_TABLE} (id TEXT PRIMARY KEY, value TEXT NOT NULL)`,
        )
        await refresh()
        setStatus('ready')
      } catch (error) {
        setStatus(`error: ${String(error)}`)
      }
    })()
  }, [db, refresh])

  async function changeData() {
    try {
      await db.run(`INSERT INTO ${SPIKE_TABLE} (id, value) VALUES (?, ?)`, [
        crypto.randomUUID(),
        `v-${changes + 1}`,
      ])
      setChanges(changes + 1)
      setStatus('changed')
      await refresh()
    } catch (error) {
      setStatus(`error: ${String(error)}`)
    }
  }

  async function takeSnapshot() {
    try {
      setStatus('snapshotting…')
      const result = await createSnapshot({
        db,
        storage,
        reason: 'manual',
        // Distinct seconds keep file names unique even when the spec clicks quickly.
        now: Date.now() + changes * 1000,
      })
      setStatus(
        result.status === 'created' ? `created ${result.file}` : `skipped ${result.duplicateOf}`,
      )
      await refresh()
    } catch (error) {
      setStatus(`error: ${String(error)}`)
    }
  }

  async function breakData() {
    try {
      await db.run(`DELETE FROM ${SPIKE_TABLE}`)
      setStatus('broken')
      await refresh()
    } catch (error) {
      setStatus(`error: ${String(error)}`)
    }
  }

  async function restore() {
    try {
      setStatus('restoring…')
      const files = await listSnapshots(storage)
      const newest = files[files.length - 1]
      if (!newest) throw new Error('no snapshot to restore')
      const summary = await restoreFromSnapshot({
        db,
        storage,
        file: newest.file,
        appSchemaVersion: await schemaVersion(db),
        now: Date.now(),
      })
      setStatus(`restored ${summary.file} (pre-restore: ${summary.preRestoreSnapshot})`)
      await refresh()
    } catch (error) {
      setStatus(`error: ${String(error)}`)
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Snapshot verification</h1>
      <p data-testid="snapshot-status" role="status">
        {status}
      </p>
      <p data-testid="change-count">{changes}</p>
      <p data-testid="data-count">{dataCount}</p>
      <p data-testid="snapshot-count">{count}</p>
      <p data-testid="last-sidecar">{lastSidecar}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="change-data" onClick={() => void changeData()}>
          Change data
        </button>
        <button type="button" data-testid="take-snapshot" onClick={() => void takeSnapshot()}>
          Take snapshot
        </button>
        <button type="button" data-testid="break-data" onClick={() => void breakData()}>
          Break data
        </button>
        <button type="button" data-testid="restore" onClick={() => void restore()}>
          Restore
        </button>
      </div>
    </main>
  )
}
