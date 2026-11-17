/**
 * Backups screen (T-035, D-040). The data-tools module's real page — lists snapshots with
 * reason/size/date, warns when the last file export is over 7 days old, and offers snapshot,
 * restore and file-export actions through the shared optimistic mutation helper.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getDb } from '@/core/db/client'
import { opfsStorage } from '@/core/backup/storage'
import { createSnapshot, listSnapshots, schemaVersion } from '@/core/backup/snapshots'
import { restoreFromSnapshot } from '@/core/backup/restore'
import { exportDatabaseFile, nativeOrDownloadWriter } from '@/core/backup/file-transfer'
import { lastFileExport, isExportStale, recordFileExport } from '@/core/backup/health'
import { useOptimisticMutation } from '@/core/ui/use-optimistic-mutation'
import { formatDate } from '@/core/dates/dates'
import { Button } from '@/components/ui/button'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const SNAPSHOTS_KEY = ['snapshots'] as const

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

type SnapshotList = Awaited<ReturnType<typeof listSnapshots>>

export function BackupsScreen() {
  const { t } = useTranslation()
  const db = getDb()
  const storage = useMemo(() => opfsStorage(), [])
  const [dismissed, setDismissed] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [lastAction, setLastAction] = useState('')
  const [now] = useState(() => Date.now())

  const snapshots = useQuery({ queryKey: SNAPSHOTS_KEY, queryFn: () => listSnapshots(storage) })
  const health = useQuery({ queryKey: ['last-file-export'], queryFn: () => lastFileExport(db) })

  const takeSnapshot = useOptimisticMutation<SnapshotList | undefined, void>({
    mutationFn: async () => {
      await createSnapshot({ db, storage, reason: 'manual', now })
    },
    queryKey: SNAPSHOTS_KEY,
    patch: (current) => current, // no cache change; refetch on settle shows the new snapshot
  })

  const exportFile = useOptimisticMutation<number | null | undefined, void>({
    mutationFn: async () => {
      await exportDatabaseFile({
        bytes: await db.exportBytes(),
        fileName: `coaching-manager-${now}.sqlite`,
        schemaVersion: await schemaVersion(db),
        crypto: globalThis.crypto,
        writer: nativeOrDownloadWriter(),
      })
      await recordFileExport(db, now)
    },
    queryKey: ['last-file-export'],
    patch: (current) => current,
  })

  async function restore(file: string) {
    setRestoring(true)
    setLastAction('restoring')
    try {
      await restoreFromSnapshot({
        db,
        storage,
        file,
        appSchemaVersion: await schemaVersion(db),
        now,
      })
      await snapshots.refetch()
      setLastAction('restored')
    } catch (error) {
      setLastAction(`error: ${String(error)}`)
    } finally {
      setRestoring(false)
    }
  }

  const stale = isExportStale(health.data ?? null, now, SEVEN_DAYS_MS)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('backup.title')}</h1>
      <p data-testid="backup-status" role="status" className="sr-only">
        {lastAction}
      </p>

      {stale && !dismissed && (
        <div
          role="alert"
          className="bg-muted flex items-start justify-between gap-3 rounded-lg border p-4"
        >
          <p className="text-sm">{t('backup.staleWarning')}</p>
          <button
            type="button"
            className="text-muted-foreground shrink-0 text-sm underline"
            onClick={() => setDismissed(true)}
          >
            {t('backup.dismiss')}
          </button>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t('backup.snapshots')}</h2>
          <Button onClick={() => void takeSnapshot()}>{t('backup.takeSnapshot')}</Button>
        </div>

        {snapshots.isLoading && (
          <p role="status" className="text-muted-foreground text-sm">
            …
          </p>
        )}
        {snapshots.isSuccess && snapshots.data.length === 0 && (
          <p className="text-muted-foreground text-sm">{t('backup.noSnapshots')}</p>
        )}
        {snapshots.data && snapshots.data.length > 0 && (
          <ul className="space-y-2">
            {snapshots.data.map((entry) => (
              <li
                key={entry.file}
                className="bg-card flex items-center justify-between gap-3 rounded border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{entry.sidecar.reason}</p>
                  <p className="text-muted-foreground">
                    {formatSize(entry.sidecar.size)} ·{' '}
                    {formatDate(new Date(entry.sidecar.at).toISOString().slice(0, 10))}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={restoring}
                  onClick={() => void restore(entry.file)}
                >
                  {t('backup.restore')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-sm">
          <span className="text-muted-foreground">{t('backup.lastExport')}: </span>
          {health.data
            ? formatDate(new Date(health.data).toISOString().slice(0, 10))
            : t('backup.neverExported')}
        </p>
        <Button variant="outline" onClick={() => void exportFile()}>
          {t('backup.exportFile')}
        </Button>
      </section>
    </div>
  )
}
