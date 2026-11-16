import { expect, type Page, test } from '@playwright/test'
import { collectConsoleErrors } from '../helpers/console-errors'

async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
}

test('the app still loads offline after one online visit', async ({ page, context }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  await waitForServiceWorker(page)

  await context.setOffline(true)
  try {
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
  expect(errors).toEqual([])
})

test('the manifest and service worker make the app installable', async ({ page }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()

  const response = await page.request.get(href as string)
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest).toMatchObject({
    name: 'Coaching Manager',
    display: 'standalone',
    start_url: '/',
  })
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2)

  await waitForServiceWorker(page)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller))
  expect(controlled).toBe(true)
})

test('the Settings screen shows the storage persistence status', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
  await expect(page.getByTestId('persistence-status')).toContainText(/persistent storage/i)
})
