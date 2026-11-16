/**
 * The serialized Db client (PLAN.md §5, ticket T-011).
 *
 * Every public call goes through one SerialQueue. `tx` takes the queue for the whole
 * callback, runs BEGIN, hands the callback a Db whose calls go straight to the Worker
 * (the queue is already held), then COMMIT or ROLLBACK before releasing the queue.
 */
import * as Comlink from 'comlink'
import { SerialQueue } from './queue'
import type { Db, DbParam, WorkerApi } from './types'

export type WorkerFactory = () => WorkerApi

export function createDbClient(factory: WorkerFactory): Db {
  const api = factory()
  const queue = new SerialQueue()
  let initializing: Promise<void> | undefined

  function ready(): Promise<void> {
    initializing ??= api.init()
    return initializing
  }

  /** The Db handed to a tx callback: no re-entrant queue, because the queue is held. */
  const insideTransaction: Db = {
    async query<T>(sql: string, params?: readonly DbParam[]) {
      await ready()
      return (await api.query(sql, params)) as T[]
    },
    async run(sql: string, params?: readonly DbParam[]) {
      await ready()
      return api.run(sql, params)
    },
    async tx() {
      throw new Error('nested transactions are not supported')
    },
    async exportBytes() {
      await ready()
      return api.exportBytes()
    },
    async importBytes(bytes: Uint8Array) {
      await ready()
      return api.importBytes(bytes)
    },
  }

  return {
    query<T>(sql: string, params?: readonly DbParam[]) {
      return queue.run(() => insideTransaction.query<T>(sql, params))
    },

    run(sql: string, params?: readonly DbParam[]) {
      return queue.run(() => insideTransaction.run(sql, params))
    },

    exportBytes() {
      return queue.run(() => insideTransaction.exportBytes())
    },

    importBytes(bytes: Uint8Array) {
      return queue.run(() => insideTransaction.importBytes(bytes))
    },

    tx<T>(fn: (t: Db) => Promise<T>): Promise<T> {
      return queue.run(async () => {
        await ready()
        await api.begin()

        let result: T
        try {
          result = await fn(insideTransaction)
        } catch (error) {
          await api.rollback()
          throw error
        }

        await api.commit()
        return result
      })
    },
  }
}

let instance: Db | undefined

/** The browser singleton. One Worker, one queue, one connection. */
export function getDb(): Db {
  instance ??= createDbClient(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    return Comlink.wrap<WorkerApi>(worker)
  })
  return instance
}
