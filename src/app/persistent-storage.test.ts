import { beforeEach, describe, expect, it, vi } from 'vitest'

let granted = false
const persisted = vi.fn(async () => granted)
const persist = vi.fn(async () => {
  granted = true
  return true
})
const FIRST_RUN_KEY = 'coaching-manager:storage-persist-requested'

beforeEach(() => {
  granted = false
  persisted.mockReset().mockImplementation(async () => granted)
  persist.mockReset().mockImplementation(async () => {
    granted = true
    return true
  })
  localStorage.clear()
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: { persisted, persist },
  })
})

async function loadPersistence() {
  vi.resetModules()
  return import('./persistent-storage')
}

describe('persistent storage', () => {
  it('asks on the first run and remembers that it asked', async () => {
    const { requestPersistenceOnFirstRun } = await loadPersistence()

    const status = await requestPersistenceOnFirstRun()

    expect(persist).toHaveBeenCalledTimes(1)
    expect(status).toEqual({ supported: true, persisted: true })
    expect(localStorage.getItem(FIRST_RUN_KEY)).toBe('1')
  })

  it('does not ask again once the origin has been asked', async () => {
    localStorage.setItem(FIRST_RUN_KEY, '1')
    persisted.mockResolvedValue(true)
    const { requestPersistenceOnFirstRun } = await loadPersistence()

    const status = await requestPersistenceOnFirstRun()

    expect(persist).not.toHaveBeenCalled()
    expect(status.persisted).toBe(true)
  })

  it('coalesces concurrent startup calls into one request', async () => {
    persisted.mockResolvedValue(true)
    const { requestPersistenceOnFirstRun } = await loadPersistence()

    await Promise.all([requestPersistenceOnFirstRun(), requestPersistenceOnFirstRun()])

    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('reads the current state for the Settings status row', async () => {
    persisted.mockResolvedValue(true)
    const { getPersistenceStatus } = await loadPersistence()

    expect(await getPersistenceStatus()).toEqual({ supported: true, persisted: true })
  })

  it('keeps startup alive when the browser refuses the request', async () => {
    persist.mockRejectedValueOnce(new Error('denied'))
    const { requestPersistenceOnFirstRun } = await loadPersistence()

    const status = await requestPersistenceOnFirstRun()

    expect(status).toEqual({ supported: true, persisted: false })
  })

  it('reports an unsupported browser without asking', async () => {
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined })
    const { getPersistenceStatus, requestPersistenceOnFirstRun } = await loadPersistence()

    expect(await getPersistenceStatus()).toEqual({ supported: false, persisted: false })
    expect(await requestPersistenceOnFirstRun()).toEqual({ supported: false, persisted: false })
    expect(persist).not.toHaveBeenCalled()
  })
})
