/** Shared theme API: next-themes drives the .dark class, the settings table is durable storage. */
import { createContext, useContext } from 'react'
import type { Db } from '@/core/db/types'
import { getSetting } from '@/modules/settings/repository'
import type { ThemePreference } from '@/modules/settings/defaults'

export interface ThemeContextValue {
  preference: ThemePreference
  setPreference: (value: ThemePreference) => Promise<void>
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useAppTheme must be used inside AppThemeProvider')
  return context
}

/** Apply the stored preference before React mounts, so the first paint has the right theme. */
export async function applyStoredTheme(db: Db): Promise<void> {
  const stored = await getSetting(db, 'theme')
  const dark =
    stored === 'dark' ||
    (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
  // next-themes reads this key on mount; seeding it avoids a light flash on dark systems.
  try {
    window.localStorage.setItem('theme', stored)
  } catch {
    // Storage can be unavailable in private mode; the class above is already correct.
  }
}
