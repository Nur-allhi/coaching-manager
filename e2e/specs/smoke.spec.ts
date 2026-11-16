import { expect, test } from '@playwright/test'
import { collectExternalRequests } from '../helpers/network'

test('the app shell loads and renders the product brand @smoke', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /coaching manager/i })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
})

test('the app makes no network requests other than its own assets @smoke', async ({ page }) => {
  const external = collectExternalRequests(page)

  await page.goto('/')
  await expect(page.getByRole('link', { name: /coaching manager/i })).toBeVisible()
  expect(external).toEqual([])
})
