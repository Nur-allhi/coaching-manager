/**
 * i18next setup for T-020 (PLAN.md §7.8). Resources are bundled inline — no runtime fetch, so
 * the offline guarantee holds. The initial language is stored locally; the default is `en`
 * (decision D-033) and the toggle in the shell can switch to Bangla at any time.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './locales/en'
import { bn } from './locales/bn'

export const LANGUAGE_KEY = 'coaching-manager:lng'
export type Language = 'en' | 'bn'
const DEFAULT_LANGUAGE: Language = 'en'

function storedLanguage(): Language {
  try {
    const value = localStorage.getItem(LANGUAGE_KEY)
    if (value === 'en' || value === 'bn') return value
  } catch {
    // Storage can be unavailable in private browsing; the in-memory default still works.
  }
  return DEFAULT_LANGUAGE
}

function applyDocumentLanguage(language: string): void {
  if (typeof document !== 'undefined') document.documentElement.lang = language
}

let initialized = false

export function initI18n(): void {
  if (initialized) return
  initialized = true
  void i18n.use(initReactI18next).init({
    resources: { en, bn },
    lng: storedLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
  applyDocumentLanguage(i18n.language)
}

export function getLanguage(): Language {
  return i18n.language === 'bn' ? 'bn' : 'en'
}

export async function setLanguage(language: Language): Promise<void> {
  initI18n()
  try {
    localStorage.setItem(LANGUAGE_KEY, language)
  } catch {
    // Persistence is best-effort; the change still applies for this session.
  }
  applyDocumentLanguage(language)
  await i18n.changeLanguage(language)
}

initI18n()

export default i18n
