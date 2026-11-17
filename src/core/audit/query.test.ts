/** Unit tests for the audit-viewer read model (T-082). */
import { describe, expect, it } from 'vitest'
import { PermissionDeniedError } from '@/core/auth/errors'
import type { Session } from '@/core/auth/session'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { createBetterSqliteDb } from '@/core/db/testing/better-sqlite3'
import { writeAudit, type AuditContext } from './write'
import { listAudit, listAuditAs, listAuditEntities } from './query'

function ctx(now: number): AuditContext {
  let n = 0
  return { actorId: 'tester', now, newId: () => `a-${now}-${++n}` }
}

async function setup() {
  const db = createBetterSqliteDb()
  await migrate({ db, migrations })
  const first = ctx(Date.UTC(2026, 0, 2, 10))
  const second = ctx(Date.UTC(2026, 0, 5, 10))
  await writeAudit(db, first, {
    entity: 'students',
    entityId: 's1',
    action: 'create',
    before: null,
    after: { full_name: 'Rahim' },
  })
  await writeAudit(db, second, {
    entity: 'payments',
    entityId: 'p1',
    action: 'update',
    before: { amount: 100 },
    after: { amount: 200 },
  })
  return db
}

describe('listAudit (T-082)', () => {
  it('returns newest first with parsed snapshots and distinct entities', async () => {
    const db = await setup()
    const entries = await listAudit(db)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ entity: 'payments', action: 'update' })
    expect(entries[0]?.before).toEqual({ amount: 100 })
    expect(entries[0]?.after).toEqual({ amount: 200 })
    expect(entries[1]?.before).toBeNull()
    expect(entries[1]?.actorId).toBe('tester')
    expect(await listAuditEntities(db)).toEqual(['payments', 'students'])
  })

  it('narrows by entity, action and date range', async () => {
    const db = await setup()
    expect(await listAudit(db, { entity: 'students' })).toHaveLength(1)
    expect(await listAudit(db, { action: 'update' })).toHaveLength(1)
    expect(await listAudit(db, { from: '2026-01-04' })).toHaveLength(1)
    expect(await listAudit(db, { to: '2026-01-03' })).toHaveLength(1)
    expect(await listAudit(db, { from: '2026-01-03', to: '2026-01-04' })).toHaveLength(0)
  })

  it('the service gate refuses a Teacher and allows an Admin (SECURITY §4)', async () => {
    const db = await setup()
    const teacher: Session = { role: 'teacher', actorId: 't-1', authenticatedAt: 0 }
    const admin: Session = { role: 'admin', actorId: 'a-1', authenticatedAt: 0 }
    await expect(listAuditAs(teacher, db)).rejects.toBeInstanceOf(PermissionDeniedError)
    await expect(listAuditAs(admin, db)).resolves.toHaveLength(2)
  })
})
