/** Regression: binary columns must not expand into per-byte JSON in the audit log (T-042). */
import { describe, expect, it } from 'vitest'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { makeAuditContext, writeAudit } from './write'

describe('writeAudit', () => {
  it('stores a compact marker instead of every byte of a blob', async () => {
    const db = createBetterSqliteDb()
    await migrate({ db, migrations })
    const photo = new Uint8Array(2048).fill(7)
    await db.tx((t) =>
      writeAudit(t, makeAuditContext('test'), {
        entity: 'students',
        entityId: 's1',
        action: 'create',
        before: null,
        after: { full_name: 'Rahim', photo },
      }),
    )
    const rows = await db.query<{ after_json: string }>('SELECT after_json FROM audit_log')
    expect(rows[0]?.after_json).toContain('<blob:2048 bytes>')
    expect(rows[0]?.after_json).not.toContain('"0":7')
    expect(rows[0]?.after_json.length ?? 0).toBeLessThan(200)
  })
})
