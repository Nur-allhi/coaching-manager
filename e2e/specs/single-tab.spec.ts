import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { collectConsoleErrors } from '../helpers/console-errors'
import { LANGUAGE_KEY, BANGLA_DIGITS_KEY } from '../helpers/locale'

/**
 * T-018 single-tab ownership. Acceptance:
 *  (1) a second tab in the same browser context sees the lock screen;
 *  (2) that tab makes no database call — it never mounts the router, Worker or Db client;
 *  (3) closing the owner releases the lock so the second tab can enter the app.
 *
 * The owner lock (`navigator.locks.request('app-db-owner', ...)`) is acquired before render
 * only when the app is not in DEV mode. E2E runs against `vite preview` (production build), so
 * the guard is active. Each Playwright test gets its own isolated context, hence its own lock
 * namespace — two pages in one context share the lock, exactly as two real tabs do.
 */

const LOCK_HEADING = 'Already open in another tab'
const DASHBOARD_HEADING = 'Dashboard'

/** Pin English before boot so the lock-screen copy is deterministic. */
async function pinEnglish(tab: Page) {
  await tab.addInitScript(
    (keys) => {
      window.localStorage.setItem(keys.language, 'en')
      window.localStorage.setItem(keys.digits, 'false')
    },
    { language: LANGUAGE_KEY, digits: BANGLA_DIGITS_KEY },
  )
}

async function openApp(context: BrowserContext) {
  const tab = await context.newPage()
  await pinEnglish(tab)
  await tab.goto('/')
  return tab
}

test('a second tab shows the already-open-in-another-tab screen', async ({ page, context }) => {
  await pinEnglish(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: DASHBOARD_HEADING })).toBeVisible()

  const second = await openApp(context)

  await expect(second.getByRole('heading', { level: 1, name: LOCK_HEADING })).toBeVisible()
  // The original tab keeps owning the app — the lock screen is scoped to the newcomer only.
  await expect(page.getByRole('heading', { level: 1, name: DASHBOARD_HEADING })).toBeVisible()
})

test('the second tab makes no database call', async ({ page, context }) => {
  await pinEnglish(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: DASHBOARD_HEADING })).toBeVisible()

  const second = await context.newPage()
  await pinEnglish(second)
  const errors = collectConsoleErrors(second)
  const workers: string[] = []
  // A DB call would construct the SQLite Worker. The lock-screen path mounts neither the
  // router nor the Db client, so no dedicated worker may ever be created in this tab.
  second.on('worker', (worker) => workers.push(worker.url()))
  await second.goto('/')

  await expect(second.getByRole('heading', { level: 1, name: LOCK_HEADING })).toBeVisible()
  // No app root: the Dashboard heading and the shell brand are both absent.
  await expect(second.getByRole('heading', { level: 1, name: DASHBOARD_HEADING })).toHaveCount(0)
  await expect(second.getByRole('link', { name: /coaching manager/i })).toHaveCount(0)
  expect(workers).toEqual([])
  expect(errors).toEqual([])
})

test('closing the owner releases the lock for the second tab', async ({ page, context }) => {
  await pinEnglish(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: DASHBOARD_HEADING })).toBeVisible()

  const second = await openApp(context)
  await expect(second.getByRole('heading', { level: 1, name: LOCK_HEADING })).toBeVisible()

  // Destroying the owner auto-releases the never-resolving Web Lock.
  await page.close()

  await second.reload()
  await expect(second.getByRole('heading', { level: 1, name: DASHBOARD_HEADING })).toBeVisible()
  await expect(second.getByRole('heading', { level: 1, name: LOCK_HEADING })).toHaveCount(0)
})
