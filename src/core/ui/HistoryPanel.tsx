/**
 * Generic History panel (T-034, D-039 C1).
 *
 * Given a table and record id, lists the audit entries via `listHistory` and lets the admin
 * restore any version. Restore calls `undo()` on that entry — an inverse write that appends a
 * NEW audit row, so the record's history is never rewritten. Reusable by every module's History
 * tab; no module-specific imports.
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listHistory, undo, type HistoryEntry } from '@/core/audit/undo'
import { makeAuditContext } from '@/core/audit/write'
import type { TableName } from '@/core/db/repository'
import { getDb } from '@/core/db/client'

interface Props {
  table: TableName
  recordId: string
  /** Increment to force a re-fetch after a mutation. */
  revision?: number
  /** Called after a successful restore so the parent can refresh its view of the record. */
  onRestored?: () => void | Promise<void>
}

function describe(entry: HistoryEntry): string {
  const changes = entry.after
    ? Object.entries(entry.after)
        .filter(
          ([key]) => !['id', 'version', 'created_at', 'updated_at', 'deleted_at'].includes(key),
        )
        .map(([key, value]) => `${key}: ${String(value ?? '')}`)
        .join(', ')
    : ''
  return changes || '—'
}

export function HistoryPanel({ table, recordId, revision = 0, onRestored }: Props) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setEntries(await listHistory(getDb(), table, recordId))
      setError(null)
    } catch (cause) {
      setError(String(cause))
    }
  }, [table, recordId])

  useEffect(() => {
    void (async () => {
      await refresh()
    })()
  }, [refresh, revision])

  async function restore(entry: HistoryEntry) {
    try {
      await undo(getDb(), makeAuditContext(), entry.id)
      await refresh()
      await onRestored?.()
    } catch (cause) {
      setError(String(cause))
    }
  }

  return (
    <section aria-label={t('undo.history')} className="space-y-2">
      <h2 className="text-lg font-semibold">{t('undo.history')}</h2>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {entries.length === 0 && <p className="text-muted-foreground text-sm">{t('undo.empty')}</p>}
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="bg-card flex items-center justify-between gap-3 rounded border p-3 text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium">{t(`undo.action.${entry.action}`)}</p>
              <p className="text-muted-foreground truncate">{describe(entry)}</p>
            </div>
            <button
              type="button"
              className="shrink-0 underline"
              onClick={() => void restore(entry)}
            >
              {t('undo.restore')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
