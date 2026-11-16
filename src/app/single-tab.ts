/**
 * Single-tab lock (T-018, decision D-037).
 *
 * The OPFS sahpool VFS allows exactly one SQLite connection, so a second tab must never open
 * one. We acquire a Web Locks exclusive lock at bootstrap and hold it for the tab's lifetime
 * with a callback that never resolves. The browser releases the lock automatically when the
 * tab is destroyed — including a crash — so acceptance (3) needs no unload handler.
 *
 * The dev-only bypass exists because a never-resolving same-document lock re-request would
 * deadlock under Vite hot reload, where the module re-executes without a tab navigation.
 */
export const LOCK_NAME = 'app-db-owner'

/** Resolve true if this tab owns the DB, false if another tab already holds it. */
export async function acquireDbOwnerLock(): Promise<boolean> {
  if (import.meta.env.DEV) return true

  if (!('locks' in navigator) || typeof navigator.locks.request !== 'function') {
    // Web Locks unavailable (older browser): fail open rather than brick the app. The Worker
    // still serialises its own connection; this is a best-effort guard, not a security boundary.
    return true
  }

  return new Promise<boolean>((resolve) => {
    void navigator.locks.request(
      LOCK_NAME,
      { mode: 'exclusive', ifAvailable: true },
      async (lock) => {
        // `lock` is null when ifAvailable is true and the lock is held elsewhere.
        resolve(lock !== null)
        if (lock) await new Promise<void>(() => undefined)
      },
    )
  })
}
