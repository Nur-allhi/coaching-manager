/**
 * Verification harness for T-033, served at `/__file-transfer` (test route, not product UI).
 *
 * Exercises the real export→wipe→import flow with real OPFS and WebCrypto. Exported bytes are
 * held in a module variable and fed straight back into the import path so the E2E spec can
 * assert the three acceptance lines without a native file picker or a network round trip.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { WebCrypto } from '@/core/backup/crypto-types'
import {
  exportDatabaseFile,
  importDatabaseFile,
  type FileWriter,
} from '@/core/backup/file-transfer'
import { schemaVersion } from '@/core/backup/snapshots'
import { opfsStorage } from '@/core/backup/storage'
import { getDb } from '@/core/db/client'

const SPIKE_TABLE = 'transfer_spike'
let exportedBytes: Uint8Array = new Uint8Array()

export function FileTransferHarness() {
  const db = getDb()
  const storage = useMemo(() => opfsStorage(), [])
  const crypto = useMemo(() => globalThis.crypto as unknown as WebCrypto, [])
  const [status, setStatus] = useState('starting…')
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    const rows = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${SPIKE_TABLE}`)
    setCount(rows[0]?.n ?? 0)
  }, [db])

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

  const writer: FileWriter = useMemo(
    () => ({
      async save(bytes) {
        exportedBytes = new Uint8Array(bytes)
      },
    }),
    [],
  )

  async function addRow() {
    await db.run(`INSERT INTO ${SPIKE_TABLE} (id, value) VALUES (?, ?)`, [
      `r-${Date.now()}`,
      'kept',
    ])
    await refresh()
  }

  async function wipe() {
    await db.run(`DELETE FROM ${SPIKE_TABLE}`)
    await refresh()
  }

  async function exportFile(passphrase?: string) {
    try {
      await exportDatabaseFile({
        bytes: await db.exportBytes(),
        fileName: passphrase ? 'backup.cmb' : 'backup.sqlite',
        passphrase,
        schemaVersion: await schemaVersion(db),
        crypto,
        writer,
      })
      setStatus(`exported:${exportedBytes.byteLength}`)
    } catch (error) {
      setStatus(`error: ${String(error)}`)
    }
  }

  async function importFile(passphrase?: string) {
    try {
      await importDatabaseFile({
        file: exportedBytes,
        db,
        storage,
        appSchemaVersion: await schemaVersion(db),
        now: Date.now(),
        passphrase,
        crypto,
      })
      await refresh()
      setStatus('imported')
    } catch (error) {
      setStatus(`error: ${String(error instanceof Error ? error.name : error)}`)
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">File transfer verification</h1>
      <p data-testid="transfer-status" role="status">
        {status}
      </p>
      <p data-testid="transfer-count">{count}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="add-row" onClick={() => void addRow()}>
          Add row
        </button>
        <button type="button" data-testid="wipe" onClick={() => void wipe()}>
          Wipe
        </button>
        <button type="button" data-testid="export-plain" onClick={() => void exportFile()}>
          Export plain
        </button>
        <button
          type="button"
          data-testid="export-encrypted"
          onClick={() => void exportFile('test-passphrase')}
        >
          Export encrypted
        </button>
        <button type="button" data-testid="import-plain" onClick={() => void importFile()}>
          Import plain
        </button>
        <button
          type="button"
          data-testid="import-encrypted"
          onClick={() => void importFile('test-passphrase')}
        >
          Import encrypted
        </button>
        <button
          type="button"
          data-testid="import-wrong-passphrase"
          onClick={() => void importFile('wrong-passphrase')}
        >
          Import wrong passphrase
        </button>
      </div>
    </main>
  )
}
