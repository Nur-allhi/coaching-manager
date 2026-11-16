import { expect, test } from '@playwright/test'

test('the app shell loads and renders the product brand', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /coaching manager/i })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
})

test('the app makes no network requests other than its own assets', async ({ page }) => {
  const external: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.hostname !== '127.0.0.1' && url.protocol !== 'data:' && url.protocol !== 'blob:') {
      external.push(request.url())
    }
  })

  await page.goto('/')
  await expect(page.getByRole('link', { name: /coaching manager/i })).toBeVisible()
  expect(external).toEqual([])
})
