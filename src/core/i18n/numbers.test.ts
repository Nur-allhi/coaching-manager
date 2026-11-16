import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BANGLA_DIGITS_KEY,
  formatNumber,
  getBanglaDigits,
  setBanglaDigits,
  subscribeBanglaDigits,
} from './numbers'

afterEach(() => {
  setBanglaDigits(false)
})

describe('number formatting', () => {
  it('uses Latin digits by default', () => {
    expect(getBanglaDigits()).toBe(false)
    expect(formatNumber(1234567, false)).toBe('1,234,567')
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('uses Bengali numerals and South Asian grouping when enabled', () => {
    expect(formatNumber(1234567, true)).toBe('১২,৩৪,৫৬৭')
    setBanglaDigits(true)
    expect(getBanglaDigits()).toBe(true)
    expect(formatNumber(1234567)).toBe('১২,৩৪,৫৬৭')
  })

  it('notifies subscribers when the setting changes', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeBanglaDigits(listener)
    setBanglaDigits(true)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(BANGLA_DIGITS_KEY)).toBe('true')
    unsubscribe()
    setBanglaDigits(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
