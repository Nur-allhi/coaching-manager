import { useEffect, useState } from 'react'
import { getPersistenceStatus, type StoragePersistence } from '@/app/persistent-storage'

export function Screen() {
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

  const status = !persistence
    ? 'Checking…'
    : !persistence.supported
      ? 'Persistent storage is not supported by this browser.'
      : persistence.persisted
        ? 'Persistent storage is enabled.'
        : 'Persistent storage is not enabled.'

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <section aria-labelledby="storage-heading">
        <h2 id="storage-heading" className="text-lg font-medium">
          Storage
        </h2>
        <p className="text-muted-foreground text-sm">
          Persistent storage:{' '}
          <span data-testid="persistence-status" aria-live="polite">
            {status}
          </span>
        </p>
      </section>
    </div>
  )
}
