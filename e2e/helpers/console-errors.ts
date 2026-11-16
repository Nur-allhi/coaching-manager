/**
 * Console-error collector (T-005).
 *
 * Attach to a page before navigating. `collectConsoleErrors` returns the list so a spec can
 * assert an empty array. Only `error` entries are collected — warnings are reported by the
 * MCP workflow, not treated as failures here.
 */
import type { Page } from '@playwright/test'

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}
