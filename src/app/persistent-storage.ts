/**
 * First-run persistent-storage request and its status (PLAN.md §7.3).
 *
 * The "already asked" flag is tiny origin-local UI state, so it stays in localStorage
 * rather than the data-tools-owned app_meta table. See D-032 (T-019).
 */
export type StoragePersistence = {
  supported: boolean
  persisted: boolean
}

const FIRST_RUN_KEY = 'coaching-manager:storage-persist-requested'

let firstRunRequest: Promise<StoragePersistence> | undefined

function storageManager(): StorageManager | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.storage
}

export function getPersistenceStatus(): Promise<StoragePersistence> {
  const storage = storageManager()
  if (!storage || typeof storage.persisted !== 'function') {
    return Promise.resolve({ supported: false, persisted: false })
  }
  return storage.persisted().then(
    (persisted) => ({ supported: true, persisted }),
    () => ({ supported: true, persisted: false }),
  )
}

function wasRequested(): boolean {
  try {
    return localStorage.getItem(FIRST_RUN_KEY) === '1'
  } catch {
    return false
  }
}

function markRequested(): void {
  try {
    localStorage.setItem(FIRST_RUN_KEY, '1')
  } catch {
    // A denied localStorage only means we may ask again on the next run.
  }
}

/** Ask once per origin, before the admin creates any records. */
export function requestPersistenceOnFirstRun(): Promise<StoragePersistence> {
  firstRunRequest ??= (async () => {
    const storage = storageManager()
    if (!storage || typeof storage.persist !== 'function') return getPersistenceStatus()

    if (!wasRequested()) {
      markRequested()
      try {
        await storage.persist()
      } catch {
        // The status read below reflects the denial; startup must not crash on it.
      }
    }
    return getPersistenceStatus()
  })()
  return firstRunRequest
}
