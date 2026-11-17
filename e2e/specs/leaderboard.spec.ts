import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** T-063 — ranking and leaderboard. Seed a tie, then drive the real /leaderboard screen. */

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/__leaderboard-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  await page.goto('/leaderboard')
})

test('tied totals share a rank and the next rank skips (1, 2, 2, 4)', async ({ page }) => {
  await expect(page.getByTestId('leaderboard-row')).toHaveCount(4)
  await expect(page.getByTestId('rank-value')).toHaveText(['1', '2', '2', '4'])
  await expect(page.getByTestId('rank-total')).toHaveText(['90', '80', '80', '70'])
})

test('each scope and filter returns the right set', async ({ page }) => {
  await page.getByTestId('leaderboard-scope').selectOption('month')
  await page.getByTestId('leaderboard-month').fill('2026-03')
  await expect(page.getByTestId('rank-total')).toHaveText(['180', '160', '160', '140'])

  await page.getByTestId('leaderboard-scope').selectOption('year')
  await expect(page.getByTestId('leaderboard-row')).toHaveCount(4)

  await page.getByTestId('leaderboard-filter').selectOption('batch:lb-batch')
  await expect(page.getByTestId('leaderboard-row')).toHaveCount(4)
  await page.getByTestId('leaderboard-filter').selectOption('class:lb-class')
  await expect(page.getByTestId('leaderboard-row')).toHaveCount(4)
})

test('renders without console errors or horizontal overflow at phone width', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await expect(page.getByTestId('leaderboard-title')).toBeVisible()
  await page.setViewportSize({ width: 375, height: 800 })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})
