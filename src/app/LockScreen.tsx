/**
 * Lock screen shown when another tab already owns the app (T-018).
 * Deliberately minimal and standalone: it renders without mounting the router or the Db
 * client, so the second tab makes no database call.
 */
import { useTranslation } from 'react-i18next'

export function LockScreen() {
  const { t } = useTranslation()
  return (
    <main className="bg-background text-foreground flex min-h-dvh items-center justify-center p-6">
      <div className="bg-card w-full max-w-md space-y-3 rounded-lg border p-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{t('singleTab.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('singleTab.description')}</p>
      </div>
    </main>
  )
}
