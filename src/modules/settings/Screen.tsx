import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getPersistenceStatus, type StoragePersistence } from '@/app/persistent-storage'

export function Screen() {
  const { t } = useTranslation()
  const [persistence, setPersistence] = useState<StoragePersistence | null>(null)

  useEffect(() => {
    let active = true
    void getPersistenceStatus().then((status) => {
      if (active) setPersistence(status)
    })
    return () => {
      active = false
    }
  }, [])

  const statusKey = !persistence
    ? 'settings.persistenceChecking'
    : !persistence.supported
      ? 'settings.persistenceUnsupported'
      : persistence.persisted
        ? 'settings.persistenceEnabled'
        : 'settings.persistenceDisabled'

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.settings')}</h1>
      <section aria-labelledby="storage-heading">
        <h2 id="storage-heading" className="text-lg font-medium">
          {t('settings.storage')}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('settings.persistence')}:{' '}
          <span data-testid="persistence-status" aria-live="polite">
            {t(statusKey)}
          </span>
        </p>
      </section>
    </div>
  )
}
