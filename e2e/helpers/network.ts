/**
 * Collect external network requests (T-005).
 *
 * An offline-first app must make no request outside its own origin. `data:` and `blob:` are
 * local and allowed. Specs assert the returned list is empty.
 */
import type { Page } from '@playwright/test'

export function collectExternalRequests(page: Page): string[] {
  const external: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.hostname !== '127.0.0.1' && url.protocol !== 'data:' && url.protocol !== 'blob:') {
      external.push(request.url())
    }
  })
  return external
}
