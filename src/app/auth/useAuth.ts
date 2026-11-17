/** React view of the auth session, updated by the module's revision counter on every change. */
import { useSyncExternalStore } from 'react'
import {
  authRevision,
  currentSession,
  isLocked,
  needsSetup,
  subscribeAuth,
  type Session,
} from '@/core/auth'

export interface AuthState {
  session: Session | null
  locked: boolean
  needsSetup: boolean
}

export function useAuth(): AuthState {
  useSyncExternalStore(subscribeAuth, authRevision, authRevision)
  return {
    session: currentSession(),
    locked: isLocked(),
    needsSetup: needsSetup(),
  }
}
