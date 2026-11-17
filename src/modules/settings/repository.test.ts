/** Unit tests for the typed settings repository (T-040, D-041). */
import { describe, expect, it } from 'vitest'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { DEFAULT_GRADING_SCALE } from './defaults'
import { getAllSettings, getSetting, setSetting } from './repository'

async function freshDb() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  return db
}

describe('settings repository', () => {
  it('returns documented defaults for an empty settings table', async () => {
    const db = await freshDb()
    const all = await getAllSettings(db)
    expect(all.centre.name).toBe('Coaching Manager')
    expect(all.currency).toBe('BDT')
    expect(all.gradingScale).toEqual(DEFAULT_GRADING_SCALE)
    expect(all.receiptFormat).toBe('R-YYYY-000001')
  })

  it('persists a setting and reads it back', async () => {
    const db = await freshDb()
    await setSetting(db, 'centre', {
      name: 'Sunrise Coaching',
      logoDataUri: '',
      address: 'Dhaka',
      phone: '01700000000',
    })
    expect((await getSetting(db, 'centre')).name).toBe('Sunrise Coaching')
  })

  it('persists the grading scale and reads it back', async () => {
    const db = await freshDb()
    const edited = DEFAULT_GRADING_SCALE.map((g) => (g.label === 'A+' ? { ...g, min: 85 } : g))
    await setSetting(db, 'gradingScale', edited)
    expect((await getSetting(db, 'gradingScale'))[0]?.min).toBe(85)
  })

  it('falls back to the default when a stored value is malformed', async () => {
    const db = await freshDb()
    await db.run('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [
      'gradingScale',
      '{"garbage":true}',
      1,
    ])
    expect(await getSetting(db, 'gradingScale')).toEqual(DEFAULT_GRADING_SCALE)
  })

  it('writes an audit row for a settings change', async () => {
    const db = await freshDb()
    await setSetting(db, 'currency', 'USD')
    const rows = await db.query('SELECT entity, entity_id, action FROM audit_log')
    expect(rows).toMatchObject([{ entity: 'settings', entity_id: 'currency', action: 'update' }])
  })

  it('rejects an invalid value at the boundary', async () => {
    const db = await freshDb()
    await expect(setSetting(db, 'gradingScale', [] as never)).rejects.toThrow()
  })
})
