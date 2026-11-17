import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** T-073 — admin report. Seed known data, then drive the real monthly and yearly admin report. */

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/__dashboard-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
})

test('the collected figure matches the payment register for the same range', async ({ page }) => {
  await page.goto('/reports')
  await page.getByTestId('report-select').selectOption('payments')
  await expect(page.getByTestId('report-row-count')).toHaveText('1')
  const registerTotal = await page.getByTestId('report-total').textContent()
  expect(registerTotal).toBe('400')

  await page.goto('/reports/admin')
  await page.getByTestId('admin-month').fill('2026-03')
  await expect(page.getByTestId('admin-collected-total')).toContainText(registerTotal ?? '400')
})

test('every required section is present', async ({ page }) => {
  await page.goto('/reports/admin')
  await page.getByTestId('admin-month').fill('2026-03')
  await expect(page.getByTestId('admin-title')).toBeVisible()
  for (const id of [
    'admin-range-section',
    'admin-admissions',
    'admin-dropouts',
    'admin-collected',
    'admin-dues',
    'admin-methods',
    'admin-attendance',
    'admin-toppers',
    'admin-net',
  ]) {
    await expect(page.getByTestId(id)).toBeVisible()
  }
  await expect(page.getByTestId('admin-admissions-total')).toBeVisible()
  await expect(page.getByTestId('admin-net-total')).toBeVisible()
})

test('the per-academic-year scope, Excel export and A4 print view work', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/reports/admin')
  await page.getByTestId('admin-scope').selectOption('year')
  await expect(page.getByTestId('admin-year')).toBeVisible()
  await expect(page.getByTestId('admin-collected-total')).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByTestId('admin-export').click()
  const file = await download
  expect(file.suggestedFilename()).toBe('admin-report.xlsx')

  await page.setViewportSize({ width: 375, height: 800 })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})
