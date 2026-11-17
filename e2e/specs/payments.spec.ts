import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/**
 * T-051 — take a partial payment, assert the correct remainder due and a gapless receipt number.
 * Prerequisites come from the test-only fixture route; the collect screen is the real product UI.
 */
test.beforeEach(async ({ page }) => {
  await useEnglish(page)
  await page.goto('/__payment-fixture')
  await page.getByTestId('fixture-seed').click()
  await expect(page.getByTestId('fixture-status')).toHaveText('ready')
  await page.goto('/payments')
})

test('takes a partial payment and shows the remainder due and receipt number', async ({ page }) => {
  await page.getByTestId('pay-student').selectOption({ label: 'Fixture Student' })
  await expect(page.getByTestId('dues-total')).toHaveText('60')

  await page.getByTestId('pay-amount').fill('20') // 20 taka = 2000 paisa
  await page.getByTestId('payment-save').click()

  await expect(page.getByTestId('payment-receipt')).toContainText('R-2026-000001')
  await expect(page.getByTestId('dues-total')).toHaveText('40')
})

test('receipt numbers stay sequential across two payments', async ({ page }) => {
  await page.getByTestId('pay-student').selectOption({ label: 'Fixture Student' })

  await page.getByTestId('pay-amount').fill('10')
  await page.getByTestId('payment-save').click()
  await expect(page.getByTestId('payment-receipt')).toContainText('R-2026-000001')

  await page.getByTestId('pay-amount').fill('10')
  await page.getByTestId('payment-save').click()
  await expect(page.getByTestId('payment-receipt')).toContainText('R-2026-000002')
})
