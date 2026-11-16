import { describe, expect, it, vi } from 'vitest'
import { createDbClient } from './client'
import type { DbParam, WorkerApi } from './types'

function fakeWorker() {
  const calls: string[] = []
  let inTransaction = false

  const api: WorkerApi = {
    init: vi.fn(async () => undefined),
    query: vi.fn(async (sql: string, _params?: readonly DbParam[]) => {
      calls.push(`query:${sql}${inTransaction ? ':in-tx' : ''}`)
      return []
    }),
    run: vi.fn(async (sql: string, _params?: readonly DbParam[]) => {
      calls.push(`run:${sql}${inTransaction ? ':in-tx' : ''}`)
      return { changes: 1 }
    }),
    begin: vi.fn(async () => {
      calls.push('begin')
      inTransaction = true
    }),
    commit: vi.fn(async () => {
      calls.push('commit')
      inTransaction = false
    }),
    rollback: vi.fn(async () => {
      calls.push('rollback')
      inTransaction = false
    }),
    exportBytes: vi.fn(async () => new Uint8Array([1, 2, 3])),
    importBytes: vi.fn(async () => undefined),
  }

  return { api, calls }
}

describe('Db client', () => {
  it('initializes the worker exactly once', async () => {
    const { api } = fakeWorker()
    const db = createDbClient(() => api)
    await db.run('SELECT 1')
    await db.query('SELECT 2')
    expect(api.init).toHaveBeenCalledTimes(1)
  })

  it('wraps a transaction in BEGIN and COMMIT', async () => {
    const { api, calls } = fakeWorker()
    const db = createDbClient(() => api)

    const value = await db.tx(async (t) => {
      await t.run('INSERT 1')
      return 42
    })

    expect(value).toBe(42)
    expect(calls).toEqual(['begin', 'run:INSERT 1:in-tx', 'commit'])
    expect(api.rollback).not.toHaveBeenCalled()
  })

  it('rolls back and rethrows when the callback throws', async () => {
    const { api, calls } = fakeWorker()
    const db = createDbClient(() => api)

    await expect(
      db.tx(async (t) => {
        await t.run('INSERT 1')
        throw new Error('bad row')
      }),
    ).rejects.toThrow('bad row')

    expect(calls).toEqual(['begin', 'run:INSERT 1:in-tx', 'rollback'])
    expect(api.commit).not.toHaveBeenCalled()
  })

  it('holds the queue until the transaction commits', async () => {
    // One shared worker, so every call lands in the same log.
    const { calls } = fakeWorker()
    expect(calls).toEqual([])
    const shared = fakeWorker()
    const heldDb = createDbClient(() => shared.api)

    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const transaction = heldDb.tx(async (t) => {
      await t.run('INSERT 1')
      await gate
      await t.run('INSERT 2')
    })
    const outside = heldDb.run('INSERT outside')

    await Promise.resolve()
    expect(shared.calls).not.toContain('run:INSERT outside')

    release()
    await Promise.all([transaction, outside])
    expect(shared.calls).toEqual([
      'begin',
      'run:INSERT 1:in-tx',
      'run:INSERT 2:in-tx',
      'commit',
      'run:INSERT outside',
    ])
  })

  it('refuses a nested transaction', async () => {
    const { api } = fakeWorker()
    const db = createDbClient(() => api)

    await expect(db.tx((t) => t.tx(async () => undefined))).rejects.toThrow(
      'nested transactions are not supported',
    )
    expect(api.rollback).toHaveBeenCalledTimes(1)
  })

  it('round-trips bytes through the same queue', async () => {
    const { api } = fakeWorker()
    const db = createDbClient(() => api)
    const bytes = await db.exportBytes()
    await db.importBytes(bytes)
    expect(api.exportBytes).toHaveBeenCalledTimes(1)
    expect(api.importBytes).toHaveBeenCalledWith(bytes)
  })
})
