import { expect, test } from '@playwright/test'

test('the app shell loads and renders the product heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Coaching Manager' })).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Coaching Manager' })).toBeVisible()
  expect(external).toEqual([])
})
