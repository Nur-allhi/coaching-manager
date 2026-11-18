/**
 * Mounts next-themes (already installed) and bridges it to the existing key/value settings table.
 * No new dependency and no schema change: 'theme' is just another validated setting key.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { getDb } from '@/core/db/client'
import { getSetting, setSetting } from '@/modules/settings/repository'
import type { ThemePreference } from '@/modules/settings/defaults'
import { ThemeContext, type ThemeContextValue } from './theme-context'

const PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system']

function isPreference(value: string | undefined): value is ThemePreference {
  return PREFERENCES.some((item) => item === value)
}

function ThemeBridge({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [ready, setReady] = useState(false)
  const lastWritten = useRef<ThemePreference | null>(null)

  useEffect(() => {
    let active = true
    void getSetting(getDb(), 'theme').then((stored) => {
      if (!active) return
      lastWritten.current = stored
      setPreferenceState(stored)
      setTheme(stored)
      setReady(true)
    })
    return () => {
      active = false
    }
  }, [setTheme])

  // Keep the durable setting in step with changes made through next-themes itself.
  useEffect(() => {
    if (!ready || !isPreference(theme) || lastWritten.current === theme) return
    lastWritten.current = theme
    setPreferenceState(theme)
    void setSetting(getDb(), 'theme', theme)
  }, [ready, theme])

  const setPreference = useCallback(
    async (value: ThemePreference) => {
      lastWritten.current = value
      setPreferenceState(value)
      setTheme(value)
      await setSetting(getDb(), 'theme', value)
    },
    [setTheme],
  )

  const value: ThemeContextValue = { preference, setPreference }
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeBridge>{children}</ThemeBridge>
    </NextThemesProvider>
  )
}
