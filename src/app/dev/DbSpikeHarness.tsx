/**
 * A deliberately small harness for the P0-2 spike. It is served at `/__db-spike` and is
 * removed in P0-3, when the real Db client and the first module land.
 *
 * It is not product UI: no user data, no i18n strings, no styling beyond legibility. Its
 * only job is to make the acceptance line observable in a real browser (including the
 * Playwright MCP browser).
 */
import { useCallback, useEffect, useState } from 'react'
import { getSpikeDb } from '@/core/db/client'

type SpikeRow = { id: string; value: string }

export function DbSpikeHarness() {
  const [rows, setRows] = useState<SpikeRow[]>([])
  const [status, setStatus] = useState('starting…')
  const [saved, setSaved] = useState<Uint8Array | null>(null)
  const db = getSpikeDb()

  const refresh = useCallback(async () => {
    setRows((await db.query('SELECT id, value FROM spike_rows ORDER BY id')) as SpikeRow[])
  }, [db])

  useEffect(() => {
    void (async () => {
      try {
        await db.run(
          'CREATE TABLE IF NOT EXISTS spike_rows (id TEXT PRIMARY KEY, value TEXT NOT NULL)',
        )
        await refresh()
        setStatus('ready')
      } catch (error) {
        setStatus(`error: ${String(error)}`)
      }
    })()
  }, [db, refresh])

  async function act(label: string, fn: () => Promise<void>) {
    try {
      setStatus(`${label}…`)
      await fn()
      setStatus(`${label}: ok`)
    } catch (error) {
      setStatus(`${label}: error — ${String(error)}`)
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">SQLite worker spike</h1>
      <p data-testid="status" role="status">
        {status}
      </p>
      <p data-testid="row-count">Rows: {rows.length}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void act('insert', async () => {
              await db.run('INSERT INTO spike_rows (id, value) VALUES (?, ?)', [
                crypto.randomUUID(),
                `row-${rows.length + 1}`,
              ])
              await refresh()
            })
          }
        >
          Insert row
        </button>
        <button
          type="button"
          onClick={() =>
            void act('clear', async () => {
              await db.run('DELETE FROM spike_rows')
              await refresh()
            })
          }
        >
          Clear rows
        </button>
        <button
          type="button"
          onClick={() =>
            void act('export', async () => {
              const bytes = await db.exportBytes()
              setSaved(bytes)
              setStatus(`export: ${bytes.byteLength} bytes`)
            })
          }
        >
          Export bytes
        </button>
        <button
          type="button"
          disabled={!saved}
          onClick={() =>
            void act('import', async () => {
              if (!saved) return
              await db.importBytes(saved)
              await refresh()
            })
          }
        >
          Import bytes
        </button>
        <button type="button" onClick={() => void act('reload-status', refresh)}>
          Refresh count
        </button>
      </div>

      <ul data-testid="rows" className="space-y-1 font-mono text-sm">
        {rows.map((row) => (
          <li key={row.id}>
            {row.id} — {row.value}
          </li>
        ))}
      </ul>
    </main>
  )
}
