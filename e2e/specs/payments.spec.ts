import { expect, test } from '@playwright/test'
import { useEnglish } from '../helpers/locale'

/**
 * T-051/T-052 — take a partial payment, then edit and void it on the real /payments screen.
 * Prerequisites come from the test-only fixture route; every asserted surface is product UI.
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

test('editing a payment keeps its receipt number and raises the revision', async ({ page }) => {
  await page.getByTestId('pay-student').selectOption({ label: 'Fixture Student' })
  await expect(page.getByTestId('dues-total')).toHaveText('60')

  await page.getByTestId('pay-amount').fill('20')
  await page.getByTestId('payment-save').click()
  await expect(page.getByTestId('payment-receipt')).toContainText('R-2026-000001')
  await expect(page.getByTestId('dues-total')).toHaveText('40')

  await expect(page.getByTestId('row-receipt')).toHaveText('R-2026-000001')
  await page.getByTestId('payment-edit').click()
  await expect(page.getByTestId('edit-amount')).toHaveValue('20')
  await page.getByTestId('edit-amount').fill('30')
  await page.getByTestId('edit-save').click()

  await expect(page.getByTestId('row-receipt')).toHaveText('R-2026-000001')
  await expect(page.getByTestId('row-marker')).toHaveText('REVISED 1')
  await expect(page.getByTestId('dues-total')).toHaveText('30')

  await page.getByTestId('payment-view-receipt').click()
  await expect(page.getByTestId('receipt-number')).toHaveText('R-2026-000001')
  await expect(page.getByTestId('receipt-revised')).toHaveText('REVISED 1')
  await expect(page.getByTestId('receipt-revision')).toHaveText('Revision 1')
})

test('voiding a payment keeps its receipt but stops its allocations counting', async ({ page }) => {
  await page.getByTestId('pay-student').selectOption({ label: 'Fixture Student' })
  await page.getByTestId('pay-amount').fill('20')
  await page.getByTestId('payment-save').click()
  await expect(page.getByTestId('dues-total')).toHaveText('40')

  await page.getByTestId('payment-void').click()
  await expect(page.getByTestId('row-marker')).toHaveText('VOID')
  await expect(page.getByTestId('dues-total')).toHaveText('60')
  await expect(page.getByTestId('row-receipt')).toHaveText('R-2026-000001')
  await expect(page.getByTestId('payment-edit')).toHaveCount(0)

  await page.getByTestId('payment-view-receipt').click()
  await expect(page.getByTestId('receipt-void')).toHaveText('VOID')
})
