/**
 * The Vitest implementation of the Db contract (PLAN.md §5, ticket T-012).
 *
 * Uses real SQL on better-sqlite3, so repository and service tests do not need a browser
 * or wasm. The public surface is identical to the browser client, including the serialized
 * queue and the transaction rules.
 */
import { randomUUID } from 'node:crypto'
import { rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { SerialQueue } from '../queue'
import type { Db, DbParam } from '../types'

export function createBetterSqliteDb(filename = ':memory:'): Db {
  let database = new Database(filename)
  database.pragma('foreign_keys = ON')
  const queue = new SerialQueue()
  let tempFile: string | undefined

  const inside: Db = {
    async query<T>(sql: string, params: readonly DbParam[] = []) {
      return database.prepare(sql).all(...params) as T[]
    },

    async run(sql: string, params: readonly DbParam[] = []) {
      const info = database.prepare(sql).run(...params)
      return { changes: info.changes }
    },

    async tx() {
      throw new Error('nested transactions are not supported')
    },

    async exportBytes() {
      return new Uint8Array(database.serialize())
    },

    async importBytes(bytes: Uint8Array) {
      // better-sqlite3 can serialize but cannot deserialize, so write the bytes to a
      // temporary file and reopen it. Good enough for a test double.
      const next = join(tmpdir(), `ccm-test-${randomUUID()}.sqlite`)
      writeFileSync(next, bytes)
      database.close()
      database = new Database(next)
      database.pragma('foreign_keys = ON')
      if (tempFile) rmSync(tempFile, { force: true })
      tempFile = next
    },
  }

  return {
    query<T>(sql: string, params?: readonly DbParam[]) {
      return queue.run(() => inside.query<T>(sql, params))
    },

    run(sql: string, params?: readonly DbParam[]) {
      return queue.run(() => inside.run(sql, params))
    },

    exportBytes() {
      return queue.run(() => inside.exportBytes())
    },

    importBytes(bytes: Uint8Array) {
      return queue.run(() => inside.importBytes(bytes))
    },

    tx<T>(fn: (t: Db) => Promise<T>): Promise<T> {
      return queue.run(async () => {
        database.exec('BEGIN')
        let result: T
        try {
          result = await fn(inside)
        } catch (error) {
          database.exec('ROLLBACK')
          throw error
        }
        database.exec('COMMIT')
        return result
      })
    },
  }
}
