/**
 * Unsaved-changes guard (T-017, decision D-029 B1).
 *
 * Uses React Router's `useBlocker`, which covers link clicks, programmatic `navigate()` and
 * browser back/forward — a custom interceptor would miss the latter two. A `beforeunload`
 * handler covers closing or reloading the tab, which the router cannot see. Forms declare
 * their dirty state through `useNavigationGuard(dirty)`.
 */
import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

export function useNavigationGuard(isDirty: boolean): void {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const message = 'You have unsaved changes. Leave this screen?'
    // A native confirm is deliberate here: the guard must work before i18n lands in T-020,
    // and window.confirm is blocked by the browser only when a real navigation is pending.
    if (window.confirm(message)) blocker.proceed()
    else blocker.reset()
  }, [blocker])
}
