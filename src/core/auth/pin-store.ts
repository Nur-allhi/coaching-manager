/**
 * The PIN record lives only in localStorage (decision D-060 A3): never in the database, so it is
 * not exported in backups, audited, or written by any data service. Storage failures degrade to
 * "no PIN" rather than crashing the app (private-browsing mode).
 */
import { hashPin, verifyPin, type PinRecord } from './pin'

export const PIN_KEY = 'coaching-manager:pin'

function webStorage(): Storage {
  return localStorage
}

function read(store: Storage): PinRecord | null {
  try {
    const raw = store.getItem(PIN_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const candidate = parsed as Partial<PinRecord>
    if (
      typeof candidate.salt === 'string' &&
      typeof candidate.hash === 'string' &&
      candidate.iterations === 600_000
    ) {
      return { salt: candidate.salt, hash: candidate.hash, iterations: candidate.iterations }
    }
    return null
  } catch {
    return null
  }
}

export function hasPin(store: Storage = webStorage()): boolean {
  return read(store) !== null
}

export function readPinRecord(store: Storage = webStorage()): PinRecord | null {
  return read(store)
}

export async function setPin(pin: string, store: Storage = webStorage()): Promise<void> {
  const record = await hashPin(pin)
  store.setItem(PIN_KEY, JSON.stringify(record))
}

export async function checkPin(pin: string, store: Storage = webStorage()): Promise<boolean> {
  const record = read(store)
  if (!record) return false
  return verifyPin(pin, record)
}

export function clearPin(store: Storage = webStorage()): void {
  store.removeItem(PIN_KEY)
}
