/**
 * Lock the app only once a PIN is configured (D-060 B2). With no PIN the app stays unlocked as
 * Admin, so the product and its E2E suite are unchanged until the admin opts in from Settings.
 */
import type { ReactNode } from 'react'
import { useAuth } from './useAuth'
import { PinLockScreen } from './PinLockScreen'

export function AuthGate({ children }: { children: ReactNode }) {
  const { needsSetup: setup, locked } = useAuth()
  if (!setup && locked) return <PinLockScreen />
  return <>{children}</>
}
