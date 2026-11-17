import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** T-070 — dashboard. Seed known data, then assert each KPI, its link and the backup banner. */

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/__dashboard-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  await page.goto('/')
})

test('KPI numbers match the payments and students modules', async ({ page }) => {
  await expect(page.getByTestId('dashboard-title')).toBeVisible()
  await expect(page.getByTestId('kpi-collected')).toContainText('400')
  await expect(page.getByTestId('kpi-due')).toContainText('3,600')
  await expect(page.getByTestId('kpi-admissions')).toContainText('3')
  await expect(page.getByTestId('kpi-active')).toContainText('4')
  await expect(page.getByTestId('kpi-batches')).toContainText('1')
  await expect(page.getByTestId('kpi-low-attendance')).toContainText('1')
})

test('each KPI links to the filtered list behind it', async ({ page }) => {
  await expect(page.getByTestId('kpi-collected')).toHaveAttribute('href', '/payments')
  await expect(page.getByTestId('kpi-due')).toHaveAttribute('href', '/payments/dues')
  await expect(page.getByTestId('kpi-admissions')).toHaveAttribute('href', '/students')
  await expect(page.getByTestId('kpi-active')).toHaveAttribute('href', '/enrollments')
  await expect(page.getByTestId('kpi-batches')).toHaveAttribute('href', '/attendance')
  await expect(page.getByTestId('kpi-low-attendance')).toHaveAttribute('href', '/attendance')
  await expect(page.getByTestId('toppers-link')).toHaveAttribute('href', '/leaderboard')
})

test('shows the stale-backup banner and recent toppers without console errors', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await expect(page.getByTestId('backup-stale-banner')).toBeVisible()
  await expect(page.getByTestId('backup-banner-link')).toHaveAttribute('href', '/data-tools')
  await expect(page.getByTestId('toppers-list')).toContainText('Rahim')
  await expect(page.getByTestId('toppers-list')).toContainText('90')

  await page.setViewportSize({ width: 375, height: 800 })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})
