/**
 * One contract, every Db implementation. The browser client proves these behaviours in
 * e2e/sqlite-persistence.spec.ts; this suite runs the same checks on better-sqlite3.
 */
import { describe, expect, it } from 'vitest'
import type { Db } from './types'

export function describeDbContract(name: string, factory: () => Db): void {
  describe(`Db contract: ${name}`, () => {
    it('creates a table and round-trips a parameterized row', async () => {
      const db = factory()
      await db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, value TEXT NOT NULL)')
      await db.run('INSERT INTO t (value) VALUES (?)', ['hello'])

      const rows = await db.query<{ id: number; value: string }>(
        'SELECT id, value FROM t WHERE value = ?',
        ['hello'],
      )
      expect(rows).toHaveLength(1)
      expect(rows[0]?.value).toBe('hello')
    })

    it('hides every row written by a transaction that throws', async () => {
      const db = factory()
      await db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, value TEXT)')

      await expect(
        db.tx(async (t) => {
          await t.run('INSERT INTO t (value) VALUES (?)', ['ghost'])
          throw new Error('stop')
        }),
      ).rejects.toThrow('stop')

      expect(await db.query('SELECT value FROM t')).toEqual([])
    })

    it('commits a successful transaction and serializes concurrent calls', async () => {
      const db = factory()
      await db.run('CREATE TABLE t (id INTEGER PRIMARY KEY, value TEXT)')

      await db.tx(async (t) => {
        await t.run('INSERT INTO t (value) VALUES (?)', ['kept'])
      })

      const results = await Promise.all([
        db.run('INSERT INTO t (value) VALUES (?)', ['a']),
        db.run('INSERT INTO t (value) VALUES (?)', ['b']),
      ])
      expect(results).toEqual([{ changes: 1 }, { changes: 1 }])
      expect(await db.query('SELECT COUNT(*) AS n FROM t')).toEqual([{ n: 3 }])
    })

    it('round-trips exported bytes', async () => {
      const db = factory()
      await db.run('CREATE TABLE t (value TEXT)')
      await db.run('INSERT INTO t (value) VALUES (?)', ['kept'])

      const bytes = await db.exportBytes()
      await db.run('DELETE FROM t')
      expect(await db.query('SELECT value FROM t')).toEqual([])

      await db.importBytes(bytes)
      expect(await db.query('SELECT value FROM t')).toEqual([{ value: 'kept' }])
    })
  })
}
