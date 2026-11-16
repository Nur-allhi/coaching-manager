import { useSyncExternalStore } from 'react'
import { formatNumber, getBanglaDigits, setBanglaDigits, subscribeBanglaDigits } from './numbers'

/** The Bangla-digit setting plus a formatter bound to its current value. */
export function useBanglaDigits() {
  const enabled = useSyncExternalStore(subscribeBanglaDigits, getBanglaDigits, () => false)
  return {
    enabled,
    setBanglaDigits,
    formatNumber: (value: number) => formatNumber(value, enabled),
  }
}
