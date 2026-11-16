/**
 * Central number formatting (T-020, decision D-033). `Intl.NumberFormat('bn-BD')` already
 * emits Bengali numerals and South Asian digit grouping, so no hand-rolled digit map is needed.
 * The digit choice is independent of the UI language: switching to Bangla leaves numbers in
 * Latin digits until the separate "Bangla digits" setting is enabled.
 */
export const BANGLA_DIGITS_KEY = 'coaching-manager:bangla-digits'
const CHANGE_EVENT = 'coaching-manager:digits-changed'

export function getBanglaDigits(): boolean {
  try {
    return localStorage.getItem(BANGLA_DIGITS_KEY) === 'true'
  } catch {
    return false
  }
}

export function setBanglaDigits(enabled: boolean): void {
  try {
    localStorage.setItem(BANGLA_DIGITS_KEY, String(enabled))
  } catch {
    // Best-effort persistence; the in-memory event still updates mounted components.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function subscribeBanglaDigits(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}

/** Format a number for display, using Bengali numerals when the setting is on. */
export function formatNumber(value: number, bengaliDigits: boolean = getBanglaDigits()): string {
  return new Intl.NumberFormat(bengaliDigits ? 'bn-BD' : 'en-US').format(value)
}
