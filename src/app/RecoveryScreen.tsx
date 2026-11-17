/**
 * Recovery screen shown when startup migration fails (T-040, PLAN §7.4).
 * A render error here must not blank the page. The admin can retry (reload) — the failed
 * migration rolled back, so their data is intact. Restore/Export of a snapshot is available on
 * the Backups screen once the app can start.
 */
import { useTranslation } from 'react-i18next'

export function RecoveryScreen({ message }: { message: string }) {
  const { t } = useTranslation()
  return (
    <main className="bg-background text-foreground flex min-h-dvh items-center justify-center p-6">
      <div role="alert" className="bg-card w-full max-w-md space-y-3 rounded-lg border p-6">
        <h1 className="text-xl font-semibold">{t('recovery.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('recovery.description')}</p>
        <p className="text-destructive text-xs break-words">{message}</p>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => window.location.reload()}
        >
          {t('recovery.retry')}
        </button>
      </div>
    </main>
  )
}
