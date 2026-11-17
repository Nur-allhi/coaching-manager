/** Unit tests for backup health metadata (T-035, D-040 C1). */
import { beforeEach, describe, expect, it } from 'vitest'
import { migrate } from '../db/migrate'
import { migrations } from '../db/migrations'
import { createBetterSqliteDb } from '../db/testing/better-sqlite3'
import { isExportStale, lastFileExport, recordFileExport } from './health'

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 0, 10)

async function freshDb() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  return db
}

describe('backup health', () => {
  beforeEach(() => undefined)

  it('returns null when there has never been a file export', async () => {
    const db = await freshDb()
    expect(await lastFileExport(db)).toBeNull()
  })

  it('records and reads back the last export timestamp', async () => {
    const db = await freshDb()
    await recordFileExport(db, NOW)
    expect(await lastFileExport(db)).toBe(NOW)
    await recordFileExport(db, NOW + 1000)
    expect(await lastFileExport(db)).toBe(NOW + 1000)
  })

  it('treats a missing or old export as stale', () => {
    expect(isExportStale(null, NOW, SEVEN_DAYS)).toBe(true)
    expect(isExportStale(NOW - SEVEN_DAYS - 1, NOW, SEVEN_DAYS)).toBe(true)
  })

  it('treats a recent export as fresh', () => {
    expect(isExportStale(NOW - SEVEN_DAYS, NOW, SEVEN_DAYS)).toBe(false)
    expect(isExportStale(NOW - 1000, NOW, SEVEN_DAYS)).toBe(false)
  })
})
