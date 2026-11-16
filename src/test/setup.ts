import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import '@/core/i18n'
import { LANGUAGE_KEY } from '@/core/i18n'
import { BANGLA_DIGITS_KEY } from '@/core/i18n/numbers'

// Tests assert the English copy; the app's default is English, so pin it explicitly to keep
// the suite deterministic if the product default is ever flipped.
localStorage.setItem(LANGUAGE_KEY, 'en')
localStorage.setItem(BANGLA_DIGITS_KEY, 'false')

// jsdom does not implement matchMedia; the shadcn sidebar and useIsMobile rely on it.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

afterEach(() => {
  cleanup()
})
