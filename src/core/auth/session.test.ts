import { beforeEach, describe, expect, it } from 'vitest'
import {
  currentSession,
  DEFAULT_IDLE_MINUTES,
  getIdleMinutes,
  isLocked,
  lock,
  needsSetup,
  noteActivity,
  setIdleMinutes,
  setSession,
  unlock,
} from './session'
import { clearPin, setPin } from './pin-store'

const pinStore = localStorage
const sessionStore = sessionStorage

beforeEach(() => {
  clearPin(pinStore)
  sessionStore.clear()
  pinStore.removeItem('coaching-manager:idle-minutes')
})

describe('session and inactivity lock (T-080)', () => {
  it('is unlocked as admin until a PIN is configured', async () => {
    expect(needsSetup(pinStore)).toBe(true)
    expect(isLocked(sessionStore, pinStore)).toBe(false)
    expect(currentSession(sessionStore, pinStore)?.role).toBe('admin')
    await setPin('123456', pinStore)
    expect(isLocked(sessionStore, pinStore)).toBe(true)
    expect(currentSession(sessionStore, pinStore)).toBeNull()
  })

  it('unlocks only with the right PIN and locks again on demand', async () => {
    await setPin('123456', pinStore)
    expect(await unlock('000000', sessionStore, pinStore)).toBe(false)
    expect(isLocked(sessionStore, pinStore)).toBe(true)
    expect(await unlock('123456', sessionStore, pinStore)).toBe(true)
    expect(currentSession(sessionStore, pinStore)?.role).toBe('admin')
    lock(sessionStore)
    expect(isLocked(sessionStore, pinStore)).toBe(true)
  })

  it('locks after the configured idle time, and activity before then refreshes the clock', async () => {
    await setPin('123456', pinStore)
    setIdleMinutes(10, pinStore)
    expect(getIdleMinutes(pinStore)).toBe(10)
    // No PIN configured fixture: default is the documented 10 minutes.
    expect(DEFAULT_IDLE_MINUTES).toBe(10)
    let now = 1_000_000
    await unlock('123456', sessionStore, pinStore, () => now)
    now += 5 * 60_000
    noteActivity(sessionStore, pinStore, () => now) // still inside the window
    expect(isLocked(sessionStore, pinStore)).toBe(false)
    now += 9 * 60_000
    noteActivity(sessionStore, pinStore, () => now) // 14 minutes since unlock, 9 since activity
    expect(isLocked(sessionStore, pinStore)).toBe(false)
    now += 11 * 60_000
    noteActivity(sessionStore, pinStore, () => now) // 11 minutes idle
    expect(isLocked(sessionStore, pinStore)).toBe(true)
  })

  it('records the role of a fixture session for UI-denial verification', async () => {
    await setPin('123456', pinStore)
    setSession('teacher', sessionStore, () => 500)
    expect(currentSession(sessionStore, pinStore)?.role).toBe('teacher')
  })
})
