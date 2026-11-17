import { describe, expect, it } from 'vitest'
import { WeakPinError } from './errors'
import { hashPin, isValidPinFormat, PIN_ITERATIONS, verifyPin } from './pin'
import { checkPin, clearPin, hasPin, setPin } from './pin-store'

describe('PIN hashing (SECURITY §3)', () => {
  it('hashes with the locked policy and a fresh salt', async () => {
    const a = await hashPin('123456')
    const b = await hashPin('123456')
    expect(a.iterations).toBe(PIN_ITERATIONS)
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(a.salt).toMatch(/^[0-9a-f]{32}$/)
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })

  it('verifies the right PIN and rejects the wrong one', async () => {
    const record = await hashPin('123456')
    expect(await verifyPin('123456', record)).toBe(true)
    expect(await verifyPin('654321', record)).toBe(false)
  })

  it('never stores the PIN in plain text and enforces six digits', async () => {
    expect(isValidPinFormat('12345')).toBe(false)
    expect(isValidPinFormat('123456')).toBe(true)
    await expect(hashPin('12345')).rejects.toThrow(WeakPinError)
    const store = localStorage
    store.removeItem('coaching-manager:pin')
    expect(hasPin(store)).toBe(false)
    await setPin('123456', store)
    expect(hasPin(store)).toBe(true)
    expect(store.getItem('coaching-manager:pin')).not.toContain('123456')
    expect(await checkPin('123456', store)).toBe(true)
    clearPin(store)
  })
})
