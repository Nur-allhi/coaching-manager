/** Audit log viewer (T-082): filterable table with before/after snapshots in an expandable row. */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/app/auth/useAuth'
import { getDb } from '@/core/db/client'
import { AUDIT_ACTIONS, listAuditAs, listAuditEntities, type AuditFilter } from '@/core/audit/query'
import type { AuditAction } from '@/core/audit/write'

function snapshot(value: unknown): string {
  return value === null || value === undefined ? '—' : JSON.stringify(value, null, 2)
}

export function AuditViewerScreen() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const db = getDb()
  const [filter, setFilter] = useState<AuditFilter>({})

  const entities = useQuery({ queryKey: ['audit-entities'], queryFn: () => listAuditEntities(db) })
  const entries = useQuery({
    queryKey: ['audit-log', session?.role ?? null, filter],
    // SECURITY §4: the service checks `audit.read` against the authenticated session; a hidden
    // screen is not a control.
    queryFn: () => listAuditAs(session, db, filter),
  })

  function set<K extends keyof AuditFilter>(key: K, value: AuditFilter[K]) {
    setFilter((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('auditViewer.title')}</h1>
        <Link className="text-sm underline" data-testid="audit-back" to="/data-tools">
          {t('auditViewer.backToBackups')}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4" data-testid="audit-filters">
        <div className="space-y-1">
          <Label htmlFor="audit-entity">{t('auditViewer.entity')}</Label>
          <select
            id="audit-entity"
            data-testid="audit-entity"
            className="border-input h-9 w-full rounded-md border px-2 text-sm"
            value={filter.entity ?? ''}
            onChange={(event) => set('entity', event.target.value || undefined)}
          >
            <option value="">{t('auditViewer.all')}</option>
            {(entities.data ?? []).map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-action">{t('auditViewer.action')}</Label>
          <select
            id="audit-action"
            data-testid="audit-action"
            className="border-input h-9 w-full rounded-md border px-2 text-sm"
            value={filter.action ?? ''}
            onChange={(event) =>
              set('action', (event.target.value || undefined) as AuditAction | undefined)
            }
          >
            <option value="">{t('auditViewer.all')}</option>
            {AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {t(`auditViewer.actions.${action}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-from">{t('auditViewer.from')}</Label>
          <input
            id="audit-from"
            type="date"
            data-testid="audit-from"
            className="border-input h-9 w-full rounded-md border px-2 text-sm"
            value={filter.from ?? ''}
            onChange={(event) => set('from', event.target.value || undefined)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-to">{t('auditViewer.to')}</Label>
          <input
            id="audit-to"
            type="date"
            data-testid="audit-to"
            className="border-input h-9 w-full rounded-md border px-2 text-sm"
            value={filter.to ?? ''}
            onChange={(event) => set('to', event.target.value || undefined)}
          />
        </div>
      </div>

      {entries.isPending && <p role="status">{t('common.loading')}</p>}
      {entries.isError && <p role="alert">{t('auditViewer.loadFailed')}</p>}
      {entries.isSuccess && entries.data.length === 0 && (
        <p data-testid="audit-empty">{t('auditViewer.noEntries')}</p>
      )}
      {entries.data && entries.data.length > 0 && (
        <div className="oc-box max-h-[60vh] overflow-auto">
          <table className="w-full text-sm" data-testid="audit-table">
            <thead>
              <tr>
                <th className="text-left">{t('auditViewer.when')}</th>
                <th className="text-left">{t('auditViewer.entity')}</th>
                <th className="text-left">{t('auditViewer.action')}</th>
                <th className="text-left">{t('auditViewer.actor')}</th>
                <th className="text-left">{t('auditViewer.details')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.data.map((entry) => (
                <tr key={entry.id} data-testid={`audit-row-${entry.id}`}>
                  <td>{new Date(entry.at).toISOString().replace('T', ' ').slice(0, 19)}</td>
                  <td data-testid="audit-row-entity">{entry.entity}</td>
                  <td data-testid="audit-row-action">{t(`auditViewer.actions.${entry.action}`)}</td>
                  <td>{entry.actorId ?? t('auditViewer.none')}</td>
                  <td>
                    <details data-testid="audit-details">
                      <summary className="cursor-pointer underline">
                        {t('auditViewer.details')}
                      </summary>
                      <div className="max-h-64 space-y-2 overflow-auto">
                        <div>
                          <strong>{t('auditViewer.before')}:</strong>
                          <pre data-testid="audit-before">{snapshot(entry.before)}</pre>
                        </div>
                        <div>
                          <strong>{t('auditViewer.after')}:</strong>
                          <pre data-testid="audit-after">{snapshot(entry.after)}</pre>
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
