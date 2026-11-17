/**
 * The unlocked session (decision D-060 C1): a role and actor id held in sessionStorage, with an
 * inactivity timeout. With no PIN configured the app is unlocked as Admin — the product ships in
 * the single-admin mode until a PIN is set in Settings; the lock then activates.
 */
import { isRole, type Role } from './roles'
import { checkPin, hasPin } from './pin-store'

export const SESSION_KEY = 'coaching-manager:session'
export const IDLE_KEY = 'coaching-manager:idle-minutes'
export const DEFAULT_IDLE_MINUTES = 10

export interface Session {
  actorId: string
  role: Role
  authenticatedAt: number
}

interface StoredSession extends Session {
  lastActivityAt: number
}

const ADMIN: Session = { actorId: 'admin', role: 'admin', authenticatedAt: 0 }

function webStorage(): Storage {
  return sessionStorage
}

function read(store: Storage): StoredSession | null {
  try {
    const raw = store.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const candidate = parsed as Partial<StoredSession>
    if (
      typeof candidate.actorId !== 'string' ||
      typeof candidate.role !== 'string' ||
      !isRole(candidate.role) ||
      typeof candidate.authenticatedAt !== 'number' ||
      typeof candidate.lastActivityAt !== 'number'
    ) {
      return null
    }
    return {
      actorId: candidate.actorId,
      role: candidate.role,
      authenticatedAt: candidate.authenticatedAt,
      lastActivityAt: candidate.lastActivityAt,
    }
  } catch {
    return null
  }
}

export function needsSetup(pinStore: Storage = localStorage): boolean {
  return !hasPin(pinStore)
}

export function isLocked(
  sessionStore: Storage = webStorage(),
  pinStore: Storage = localStorage,
): boolean {
  if (!hasPin(pinStore)) return false
  return read(sessionStore) === null
}

export function currentSession(
  sessionStore: Storage = webStorage(),
  pinStore: Storage = localStorage,
): Session | null {
  if (!hasPin(pinStore)) return ADMIN
  const stored = read(sessionStore)
  if (!stored) return null
  return { actorId: stored.actorId, role: stored.role, authenticatedAt: stored.authenticatedAt }
}

/** Verify the PIN and, on success, open an Admin session. */
export async function unlock(
  pin: string,
  sessionStore: Storage = webStorage(),
  pinStore: Storage = localStorage,
  now: () => number = Date.now,
): Promise<boolean> {
  if (!(await checkPin(pin, pinStore))) return false
  const at = now()
  const session: StoredSession = {
    actorId: 'admin',
    role: 'admin',
    authenticatedAt: at,
    lastActivityAt: at,
  }
  sessionStore.setItem(SESSION_KEY, JSON.stringify(session))
  emit()
  return true
}

/** Set an authenticated session directly — used by the E2E fixture to exercise other roles. */
export function setSession(
  role: Role,
  sessionStore: Storage = webStorage(),
  now: () => number = Date.now,
): void {
  const at = now()
  sessionStore.setItem(
    SESSION_KEY,
    JSON.stringify({ actorId: role, role, authenticatedAt: at, lastActivityAt: at }),
  )
  emit()
}

export function lock(sessionStore: Storage = webStorage()): void {
  sessionStore.removeItem(SESSION_KEY)
  emit()
}

export function getIdleMinutes(store: Storage = localStorage): number {
  try {
    const raw = store.getItem(IDLE_KEY)
    const value = raw === null ? NaN : Number(raw)
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_IDLE_MINUTES
  } catch {
    return DEFAULT_IDLE_MINUTES
  }
}

export function setIdleMinutes(minutes: number, store: Storage = localStorage): void {
  store.setItem(IDLE_KEY, String(minutes))
  emit()
}

/** Refresh the idle clock, or lock when the configured timeout has elapsed. */
export function noteActivity(
  sessionStore: Storage = webStorage(),
  pinStore: Storage = localStorage,
  now: () => number = Date.now,
): void {
  const stored = read(sessionStore)
  if (!stored || !hasPin(pinStore)) return
  const idleMs = getIdleMinutes() * 60_000
  if (now() - stored.lastActivityAt >= idleMs) {
    lock(sessionStore)
    return
  }
  sessionStore.setItem(SESSION_KEY, JSON.stringify({ ...stored, lastActivityAt: now() }))
}

let revision = 0
const listeners = new Set<() => void>()

function emit(): void {
  revision += 1
  for (const listener of listeners) listener()
}

export function authRevision(): number {
  return revision
}

/** Notify subscribers after an out-of-band auth change (for example, writing a new PIN). */
export function authChanged(): void {
  emit()
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Install the browser activity/idle listeners once. A no-op outside a browser. */
export function startIdleWatcher(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  for (const event of ['pointerdown', 'keydown'] as const) {
    document.addEventListener(event, () => noteActivity(), { passive: true })
  }
  window.setInterval(() => noteActivity(), 1000)
}
