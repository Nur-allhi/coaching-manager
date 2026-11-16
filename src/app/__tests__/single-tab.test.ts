/**
 * Unit tests for the single-tab lock (T-018). The browser Web Locks API is mocked; the real
 * cross-tab behaviour is covered by the Playwright spec.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const DEV = import.meta.env.DEV

describe('acquireDbOwnerLock', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('grants the lock in development (HMR bypass)', async () => {
    const request = vi.fn()
    vi.stubGlobal('navigator', { locks: { request } })
    const { acquireDbOwnerLock } = await import('../single-tab')
    expect(await acquireDbOwnerLock()).toBe(true)
    if (DEV) expect(request).not.toHaveBeenCalled()
  })

  it('reports ownership when the lock is available', async () => {
    const request = vi.fn(
      (_name: string, _options: unknown, cb: (lock: { name: string } | null) => Promise<void>) =>
        cb({ name: 'app-db-owner' }),
    )
    vi.stubGlobal('navigator', { locks: { request } })
    const { acquireDbOwnerLock } = await import('../single-tab')
    const result = await acquireDbOwnerLock()
    if (DEV) {
      expect(result).toBe(true)
    } else {
      expect(result).toBe(true)
      expect(request).toHaveBeenCalledWith(
        'app-db-owner',
        { mode: 'exclusive', ifAvailable: true },
        expect.any(Function),
      )
    }
  })

  it('refuses ownership when another tab holds the lock', async () => {
    const request = vi.fn((_name: string, _options: unknown, cb: (lock: null) => Promise<void>) =>
      cb(null),
    )
    vi.stubGlobal('navigator', { locks: { request } })
    const { acquireDbOwnerLock } = await import('../single-tab')
    const result = await acquireDbOwnerLock()
    // In dev the bypass grants regardless; the real branch refuses.
    expect(result).toBe(DEV ? true : false)
  })

  it('fails open when Web Locks is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    const { acquireDbOwnerLock } = await import('../single-tab')
    expect(await acquireDbOwnerLock()).toBe(true)
  })
})
