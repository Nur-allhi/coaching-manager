/**
 * sqlite-wasm on OPFS, owned entirely by this Worker (PLAN.md §3, tickets T-010/T-011).
 *
 * `opfs-sahpool` needs no COOP/COEP headers. The UI thread never blocks on SQLite, and
 * the single-tab lock in the client keeps this to one connection.
 */
import * as Comlink from 'comlink'
import sqlite3InitModule, { type BindableValue, type SAHPoolUtil } from '@sqlite.org/sqlite-wasm'
import type { DbParam, WorkerApi } from './types'

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

function bind(params: readonly DbParam[] = []): BindableValue[] {
  return params as BindableValue[]
}

const api: WorkerApi = {
  async init() {
    await ready()
  },

  async query(sql: string, params?: readonly DbParam[]) {
    const { db: connection } = await ready()
    return connection.exec({
      sql,
      bind: bind(params),
      rowMode: 'object',
      resultRows: [],
      returnValue: 'resultRows',
    })
  },

  async run(sql: string, params?: readonly DbParam[]) {
    const { db: connection } = await ready()
    connection.exec({ sql, bind: bind(params) })
    return { changes: connection.changes() }
  },

  async begin() {
    const { db: connection } = await ready()
    connection.exec('BEGIN')
  },

  async commit() {
    const { db: connection } = await ready()
    connection.exec('COMMIT')
  },

  async rollback() {
    const { db: connection } = await ready()
    connection.exec('ROLLBACK')
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
