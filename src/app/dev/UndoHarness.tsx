/**
 * Verification harness for T-034, served at `/__undo` (test route, not product UI).
 *
 * Performs real create/update/delete through the audited repo helpers, shows the 10-second
 * Undo toast after each mutation, and renders the generic HistoryPanel. E2E drives it to prove
 * all three acceptance lines without waiting for module screens (T-040+).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { HistoryPanel } from '@/core/ui/HistoryPanel'
import { showUndoToast } from '@/core/ui/undo-toast'
import { makeAuditContext } from '@/core/audit/write'
import { getDb } from '@/core/db/client'
import { migrate } from '@/core/db/migrate'
import { migrations } from '@/core/db/migrations'
import { findById, insert, softDelete, update, type Row } from '@/core/db/repository'

const TABLE = 'students' as const
const STUDENT = {
  student_no: '2026-0001',
  full_name: 'Rahim',
  admitted_on: '2026-01-02',
}

export function UndoHarness() {
  const db = getDb()
  const [status, setStatus] = useState('starting…')
  const [record, setRecord] = useState<Row | null>(null)
  const [revision, setRevision] = useState(0)

  const ctx = useMemo(() => makeAuditContext(), [])
  const refresh = useCallback(async () => {
    setRecord((await findById<Row>(db, TABLE, 's-1')) ?? null)
  }, [db])

  useEffect(() => {
    void (async () => {
      try {
        await migrate({ db, migrations })
        await refresh()
        setStatus('ready')
      } catch (error) {
        setStatus(`error: ${String(error)}`)
      }
    })()
  }, [db, refresh])

  async function afterMutation(label: string, auditId: string) {
    setStatus(label)
    setRevision((n) => n + 1)
    await refresh()
    // The toast's Undo calls undo() with this ctx; refetch the record and history after it.
    showUndoToast({
      auditId,
      db,
      ctx,
      onUndone: () => {
        setRevision((n) => n + 1)
        return refresh()
      },
    })
  }

  async function create() {
    try {
      const before = await countAudits()
      const now = ctx.now
      const id = await insert(db, ctx, TABLE, {
        id: 's-1',
        created_at: now,
        updated_at: now,
        deleted_at: null,
        version: 1,
        ...STUDENT,
      })
      const auditId = await newestAuditId(before)
      await afterMutation(`created:${id}`, auditId ?? '')
    } catch (error) {
      setStatus(`error: ${String(error)}`)
    }
  }

  async function changeName() {
    try {
      if (!record) throw new Error('no record')
      const before = await countAudits()
      await update(db, ctx, TABLE, 's-1', { full_name: 'Karim' }, Number(record.version))
      const auditId = await newestAuditId(before)
      await afterMutation('updated', auditId ?? '')
    } catch (error) {
      setStatus(`error: ${String(error)}`)
    }
  }

  async function remove() {
    try {
      if (!record) throw new Error('no record')
      const before = await countAudits()
      await softDelete(db, ctx, TABLE, 's-1', Number(record.version))
      const auditId = await newestAuditId(before)
      await afterMutation('deleted', auditId ?? '')
    } catch (error) {
      setStatus(`error: ${String(error)}`)
    }
  }

  async function countAudits(): Promise<number> {
    const rows = await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM audit_log')
    return rows[0]?.n ?? 0
  }

  async function newestAuditId(before: number): Promise<string | undefined> {
    const rows = await db.query<{ id: string }>(
      'SELECT id FROM audit_log ORDER BY rowid DESC LIMIT 1',
    )
    const now = await countAudits()
    return now > before ? rows[0]?.id : undefined
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Undo &amp; history verification</h1>
      <p data-testid="undo-status" role="status">
        {status}
      </p>
      <p data-testid="undo-record">
        {record ? `${String(record.full_name)} v${String(record.version)}` : 'none'}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="undo-create" onClick={() => void create()}>
          Create
        </button>
        <button type="button" data-testid="undo-update" onClick={() => void changeName()}>
          Update
        </button>
        <button type="button" data-testid="undo-delete" onClick={() => void remove()}>
          Delete
        </button>
      </div>
      {status === 'ready' ||
      status.startsWith('created:') ||
      status === 'updated' ||
      status === 'deleted' ? (
        <HistoryPanel table={TABLE} recordId="s-1" revision={revision} onRestored={refresh} />
      ) : (
        <p>Running migrations…</p>
      )}
    </main>
  )
}
