/**
 * sqlite-wasm + opfs-sahpool spike (PLAN.md P0-2).
 *
 * The whole SQLite connection lives in this Worker: the UI thread never blocks on SQLite,
 * and the `opfs-sahpool` VFS does not need COOP/COEP headers.
 *
 * `tx` and the typed repositories arrive in P0-3. This is deliberately only the surface
 * needed to prove persistence and a byte-level export/import round-trip.
 */
import * as Comlink from 'comlink'
import sqlite3InitModule, { type BindableValue, type SAHPoolUtil } from '@sqlite.org/sqlite-wasm'

const DB_FILE = '/coaching.sqlite3'
const VFS_NAME = 'ccm-sahpool'
const VFS_DIRECTORY = 'ccm-db'

type SpikeDatabase = InstanceType<SAHPoolUtil['OpfsSAHPoolDb']>

let pool: SAHPoolUtil | undefined
let db: SpikeDatabase | undefined

async function ready(): Promise<{ db: SpikeDatabase; pool: SAHPoolUtil }> {
  if (db && pool) return { db, pool }

  const sqlite3 = await sqlite3InitModule()
  const installed = await sqlite3.installOpfsSAHPoolVfs({
    name: VFS_NAME,
    directory: VFS_DIRECTORY,
    clearOnInit: false,
    initialCapacity: 6,
  })
  const opened = new installed.OpfsSAHPoolDb(DB_FILE)
  opened.exec('PRAGMA foreign_keys = ON')

  pool = installed
  db = opened
  return { db: opened, pool: installed }
}

export interface SpikeDbApi {
  init(): Promise<void>
  query(sql: string, params?: readonly BindableValue[]): Promise<unknown[]>
  run(sql: string, params?: readonly BindableValue[]): Promise<{ changes: number }>
  exportBytes(): Promise<Uint8Array>
  importBytes(bytes: Uint8Array): Promise<void>
}

const api: SpikeDbApi = {
  async init() {
    await ready()
  },

  async query(sql: string, params: readonly BindableValue[] = []) {
    const { db: connection } = await ready()
    return connection.exec({
      sql,
      bind: params,
      rowMode: 'object',
      resultRows: [],
      returnValue: 'resultRows',
    })
  },

  async run(sql: string, params: readonly BindableValue[] = []) {
    const { db: connection } = await ready()
    connection.exec({ sql, bind: params })
    return { changes: connection.changes() }
  },

  async exportBytes() {
    const { pool: installedPool } = await ready()
    // `exportFile` returns a view into WASM memory; copy it before it can be reused.
    return installedPool.exportFile(DB_FILE).slice()
  },

  async importBytes(bytes: Uint8Array) {
    const { pool: installedPool } = await ready()
    db?.close()
    await installedPool.importDb(DB_FILE, bytes)
    const reopened = new installedPool.OpfsSAHPoolDb(DB_FILE)
    reopened.exec('PRAGMA foreign_keys = ON')
    db = reopened
  },
}

Comlink.expose(api)
