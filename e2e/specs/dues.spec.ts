import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/** T-053 — the defaulters report filters and the student profile Payments tab, on real screens. */
let paidId = ''

test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/__dues-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  paidId = (await page.getByTestId('paid-student-id').textContent()) ?? ''
})

test('lists only students with dues and a total matching the report', async ({ page }) => {
  await page.goto('/payments/dues')
  await expect(page.getByTestId('dues-row')).toHaveCount(2)
  await expect(page.getByTestId('dues-report-total')).toContainText('120')
  await expect(page.getByText('Paid Three')).toHaveCount(0)
})

test('filters by batch, class and amount range', async ({ page }) => {
  await page.goto('/payments/dues')
  await expect(page.getByTestId('dues-row')).toHaveCount(2)

  await page.getByTestId('filter-batch').selectOption('A')
  await expect(page.getByTestId('dues-row')).toHaveCount(1)
  await expect(page.getByTestId('dues-report-total')).toContainText('60')

  await page.getByTestId('filter-batch').selectOption('')
  await page.getByTestId('filter-class').selectOption('Beta')
  await expect(page.getByTestId('dues-row')).toHaveCount(1)
  await expect(page.getByTestId('dues-report-total')).toContainText('60')

  await page.getByTestId('filter-class').selectOption('')
  await page.getByTestId('filter-min').fill('70')
  await expect(page.getByTestId('dues-row')).toHaveCount(0)
  await expect(page.getByTestId('dues-report-total')).toContainText('0')
})

test('the dues report has no horizontal document overflow at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/payments/dues')
  await expect(page.getByTestId('dues-row').first()).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBe(0)
})

test('the student Payments tab shows history and outstanding dues', async ({ page }) => {
  expect(paidId).not.toBe('')
  await page.goto(`/students/${paidId}`)
  await page.getByTestId('profile-tab-payments').click()
  await expect(page.getByTestId('profile-payment-row')).toHaveCount(1)
  await expect(page.getByTestId('profile-payment-row')).toContainText('R-2026-000001')
  await expect(page.getByTestId('profile-dues-total')).toContainText('0')
})
