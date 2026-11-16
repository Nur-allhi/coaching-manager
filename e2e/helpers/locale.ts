import type { Page } from '@playwright/test'

/** The key `src/core/i18n` reads at startup. Exported so specs can pin a language. */
export const LANGUAGE_KEY = 'coaching-manager:lng'
export const BANGLA_DIGITS_KEY = 'coaching-manager:bangla-digits'

/**
 * Pin English before the app boots. Existing specs assert the English copy, so each test gets
 * an explicit locale instead of relying on the product default (E2E_TESTING.md §5.5).
 */
export async function useEnglish(page: Page): Promise<void> {
  await page.addInitScript(
    (keys) => {
      window.localStorage.setItem(keys.language, 'en')
      window.localStorage.setItem(keys.digits, 'false')
    },
    { language: LANGUAGE_KEY, digits: BANGLA_DIGITS_KEY },
  )
}
